import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useDataRot } from '../auth/AuthProvider'
import { Chip } from '../components/Chip'
import { Knapp, LankKnapp } from '../components/Knapp'
import { PlatsLager } from '../components/ritning/PlatsLager'
import { Skalstock } from '../components/ritning/Skalstock'
import { useRitYta } from '../components/ritning/useRitYta'
import { SkuggLager, tillPoints } from '../components/sol/SkuggLager'
import { Underlag } from '../components/sol/Underlag'
import { Varmekarta } from '../components/sol/Varmekarta'
import { Falt, inmatningsStil } from '../components/Falt'
import { TomtLage } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import type { Plats, PunktM, Tradgard } from '../data/types'
import { formTillPolygon } from '../lib/form'
import { tolkaMeter } from '../lib/format'
import { snappaPunkt } from '../lib/geometri'
import { kompassTillRiktning } from '../lib/skugga'
import { soldygn, solposition, stockholmsMinuter, stockholmsTid } from '../lib/sol'
import {
  soltimmarForPolygon,
  soltimmarRaster,
  type Skuggare,
  type SoltimmarRaster,
} from '../lib/soltimmar'
import { platsVidPunkt } from '../lib/vaxtplacering'
import { viewBoxAttribut } from '../lib/viewbox'

/**
 * Solen — var solen står och var skuggorna faller, räknat på riktigt.
 * Ritningen är skalenlig i meter; det är hela förutsättningen.
 *
 * Grundläget är avsiktligt magert: ett tidsreglage, ett datumreglage, en
 * uppspelningsknapp och växeln skuggor/soltimmar. Underlaget (norr, läge,
 * höjder, skuggkällor) ligger bakom en enda knapp.
 */

/** Sigtuna — förifyllt tills hon anger något annat. */
const SIGTUNA = { latitud: 59.62, longitud: 17.72 }

/** Marginal runt tomten i meter — skuggkällor står utanför tomtgränsen. */
const MARGINAL_M = 12

const NYCKELDATUM = [
  { etikett: '15 apr', manad: 4, dag: 15 },
  { etikett: '15 jun', manad: 6, dag: 15 },
  { etikett: '15 sep', manad: 9, dag: 15 },
] as const

export function SolView() {
  const { tradgardar, laddad } = useData()
  const [valdId, setValdId] = useState<string>()

  if (!laddad) return null
  const medRitning = tradgardar.filter((t) => t.widthM !== undefined && t.heightM !== undefined)
  if (medRitning.length === 0) {
    return (
      <TomtLage
        rubrik="Solen behöver en ritning"
        text="Skuggorna räknas ut ur ritningens verkliga mått. Ange måtten på en trädgård först."
        atgard={<LankKnapp to="/ritning">Öppna ritningen</LankKnapp>}
      />
    )
  }
  const vald = medRitning.find((t) => t.id === valdId) ?? medRitning[0]!

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {medRitning.length > 1 && (
        <div className="dolj-scroll flex gap-2 overflow-x-auto border-b border-linje px-4 py-2.5">
          {medRitning.map((t) => (
            <Chip key={t.id} vald={t.id === vald.id} onClick={() => setValdId(t.id)}>
              {t.namn}
            </Chip>
          ))}
        </div>
      )}
      <Solen key={vald.id} tradgard={vald} />
    </div>
  )
}

function formatKlocka(minuter: number): string {
  const h = Math.floor(minuter / 60)
  const m = Math.round(minuter % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatTimmar(timmar: number): string {
  return `${timmar.toFixed(1).replace('.', ',')} h`
}

function Solen({ tradgard }: { tradgard: Tradgard }) {
  const { platser, skuggkallor } = useData()
  const uid = useDataRot()

  const tomtB = tradgard.widthM ?? 0
  const tomtH = tradgard.heightM ?? 0

  // Öppnar på i dag och nuvarande klockslag — skuggorna direkt synliga.
  const nu = useRef(new Date()).current
  const ar = nu.getFullYear()
  const [dagPaAret, setDagPaAret] = useState(() => {
    const start = Date.UTC(ar, 0, 1)
    return Math.floor((Date.UTC(ar, nu.getMonth(), nu.getDate()) - start) / 86_400_000) + 1
  })
  const [minuter, setMinuter] = useState(() => {
    const lokal = Math.round(stockholmsMinuter(nu) / 10) * 10
    return Math.min(1430, lokal)
  })
  const [lage, setLage] = useState<'skuggor' | 'timmar'>('skuggor')
  const [spelar, setSpelar] = useState(false)
  const [valdPlatsId, setValdPlatsId] = useState<string>()
  const [visaUnderlag, setVisaUnderlag] = useState(false)
  const [ritarKalla, setRitarKalla] = useState(false)
  const [kallaUtkast, setKallaUtkast] = useState<{ a: PunktM; b: PunktM }>()
  const [nyKalla, setNyKalla] = useState<PunktM[]>()
  const [nyKallaNamn, setNyKallaNamn] = useState('')
  const [nyKallaHojd, setNyKallaHojd] = useState('')

  const latitud = tradgard.latitud ?? SIGTUNA.latitud
  const longitud = tradgard.longitud ?? SIGTUNA.longitud
  const norrVinkel = tradgard.norrVinkel ?? 0
  const behoverUnderlag = tradgard.norrVinkel === undefined

  const datum = new Date(Date.UTC(ar, 0, dagPaAret))
  const manad = datum.getUTCMonth() + 1
  const dag = datum.getUTCDate()

  const tid = stockholmsTid(ar, manad, dag, minuter)
  const sol = solposition(tid, latitud, longitud)
  const dygn = soldygn(ar, manad, dag, latitud, longitud)
  const uppMin = dygn.typ === 'normal' ? stockholmsMinuter(dygn.uppgang) : undefined
  const nedMin = dygn.typ === 'normal' ? stockholmsMinuter(dygn.nedgang) : undefined

  const iTradgarden = platser.filter((p) => p.tradgardId === tradgard.id)
  const kallorHar = skuggkallor.filter((k) => k.tradgardId === tradgard.id)

  const skuggare = useMemo<Skuggare[]>(
    () => [
      ...iTradgarden
        .filter((p) => p.geometri && (p.hojdM ?? 0) > 0)
        .map((p) => ({
          punkter: formTillPolygon(p.geometri!.punkter, p.geometri!.runda),
          hojdM: p.hojdM!,
        })),
      ...kallorHar
        .filter((k) => k.hojdM > 0 && k.punkter.length >= 3)
        .map((k) => ({ punkter: k.punkter, hojdM: k.hojdM })),
    ],
    [iTradgarden, kallorHar],
  )

  // Dagsraster per datum, cachat — nyckeldatumen återanvänder samma väg.
  const rasterCache = useRef(new Map<string, SoltimmarRaster>())
  const skuggNyckel = useMemo(
    () => JSON.stringify([skuggare, norrVinkel, latitud, longitud]),
    [skuggare, norrVinkel, latitud, longitud],
  )
  useEffect(() => {
    rasterCache.current.clear()
  }, [skuggNyckel])

  function hamtaRaster(m: number, d: number): SoltimmarRaster {
    const nyckel = `${m}-${d}`
    let raster = rasterCache.current.get(nyckel)
    if (!raster) {
      raster = soltimmarRaster({
        tomtBreddM: tomtB,
        tomtHojdM: tomtH,
        ar,
        manad: m,
        dag: d,
        latitud,
        longitud,
        norrVinkel,
        skuggare,
      })
      rasterCache.current.set(nyckel, raster)
    }
    return raster
  }

  const dagensRaster = lage === 'timmar' || valdPlatsId ? hamtaRaster(manad, dag) : undefined

  // Uppspelning: dygnet i tiominuterssteg, från gryning till skymning.
  useEffect(() => {
    if (!spelar) return
    const intervall = setInterval(() => {
      setMinuter((m) => {
        const nasta = m + 10
        if (nedMin !== undefined && nasta > nedMin + 30) {
          return uppMin !== undefined ? Math.floor((uppMin - 30) / 10) * 10 : 0
        }
        if (nasta >= 1440) return 0
        return nasta
      })
    }, 120)
    return () => clearInterval(intervall)
  }, [spelar, uppMin, nedMin])

  /* -------------------------------------------------------------- ritytan */

  const virtB = tomtB + 2 * MARGINAL_M
  const virtH = tomtH + 2 * MARGINAL_M
  const { behallareRef, vb, mpp, tillMeter, panoreraPx, zoomaVid } = useRitYta(virtB, virtH, {
    x: MARGINAL_M - 1.5,
    y: MARGINAL_M - 1.5,
    bredd: tomtB + 3,
    hojd: tomtH + 3,
  })

  /** Skuggkällor står utanför tomten — visa hela marginalytan när man ritar. */
  function zoomaUtForKalla() {
    if (!vb) return
    const faktor = Math.max(virtB / vb.w, virtH / vb.h, 1)
    zoomaVid(faktor, [virtB / 2, virtH / 2])
  }

  /** Pekare → tomtkoordinater (metrar, origo i tomthörnet). */
  function tillTomtMeter(clientX: number, clientY: number): PunktM {
    const [x, y] = tillMeter(clientX, clientY)
    return [x - MARGINAL_M, y - MARGINAL_M]
  }

  const gestRef = useRef<
    | { typ: 'pan'; pekarId: number; senastX: number; senastY: number; totalPx: number }
    | { typ: 'kalla'; pekarId: number; start: PunktM }
    | null
  >(null)

  function vidPekareNed(e: ReactPointerEvent<SVGSVGElement>) {
    if (gestRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    if (ritarKalla) {
      const start = snappaPunkt(tillTomtMeter(e.clientX, e.clientY))
      gestRef.current = { typ: 'kalla', pekarId: e.pointerId, start }
      setKallaUtkast({ a: start, b: start })
      return
    }
    gestRef.current = {
      typ: 'pan',
      pekarId: e.pointerId,
      senastX: e.clientX,
      senastY: e.clientY,
      totalPx: 0,
    }
  }

  function vidPekareFlytt(e: ReactPointerEvent<SVGSVGElement>) {
    const gest = gestRef.current
    if (!gest || e.pointerId !== gest.pekarId) return
    if (gest.typ === 'kalla') {
      setKallaUtkast({ a: gest.start, b: snappaPunkt(tillTomtMeter(e.clientX, e.clientY)) })
      return
    }
    const dx = e.clientX - gest.senastX
    const dy = e.clientY - gest.senastY
    gest.senastX = e.clientX
    gest.senastY = e.clientY
    gest.totalPx += Math.abs(dx) + Math.abs(dy)
    panoreraPx(dx, dy)
  }

  function vidPekareUpp(e: ReactPointerEvent<SVGSVGElement>) {
    const gest = gestRef.current
    if (!gest || e.pointerId !== gest.pekarId) return
    gestRef.current = null

    if (gest.typ === 'kalla') {
      const utkast = kallaUtkast
      setKallaUtkast(undefined)
      setRitarKalla(false)
      if (!utkast) return
      const [x1, y1] = utkast.a
      const [x2, y2] = utkast.b
      if (Math.abs(x2 - x1) < 0.5 || Math.abs(y2 - y1) < 0.5) return
      setNyKalla([
        [Math.min(x1, x2), Math.min(y1, y2)],
        [Math.max(x1, x2), Math.min(y1, y2)],
        [Math.max(x1, x2), Math.max(y1, y2)],
        [Math.min(x1, x2), Math.max(y1, y2)],
      ])
      setNyKallaNamn('')
      setNyKallaHojd('')
      return
    }

    // Kort tryck: markera platsen under fingret, eller avmarkera.
    if (gest.totalPx < 8) {
      const punkt = tillTomtMeter(e.clientX, e.clientY)
      const plats = platsVidPunkt(punkt, platser, tradgard.id)
      setValdPlatsId(plats?.id)
    }
  }

  function sparaNyKalla() {
    if (!nyKalla) return
    const hojd = tolkaMeter(nyKallaHojd, 0.1, 60)
    if (hojd === undefined) return
    const namn = nyKallaNamn.trim() || 'Skuggkälla'
    void (async () => {
      const repo = await import('../data/repo')
      repo.skapaSkuggkalla(uid, { tradgardId: tradgard.id, namn, punkter: nyKalla, hojdM: hojd })
    })()
    setNyKalla(undefined)
  }

  const valdPlats = iTradgarden.find((p) => p.id === valdPlatsId)

  // Solindikatorn: på strålen mot solen, klippt mot en ram 1,8 m utanför
  // tomten — alltid inom synligt område oavsett tomtens proportioner.
  const solRiktning = kompassTillRiktning(sol.azimut, norrVinkel)
  const ramB = tomtB / 2 + 1.8
  const ramH = tomtH / 2 + 1.8
  const solT = Math.min(
    solRiktning[0] === 0 ? Infinity : ramB / Math.abs(solRiktning[0]),
    solRiktning[1] === 0 ? Infinity : ramH / Math.abs(solRiktning[1]),
  )
  const solPos: PunktM = [
    tomtB / 2 + solRiktning[0] * solT,
    tomtH / 2 + solRiktning[1] * solT,
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-6.5rem)] lg:flex-row">
      {/* Ritytan med skuggorna */}
      <div
        ref={behallareRef}
        data-testid="solyta"
        className={`relative min-h-[46vh] flex-1 touch-none overflow-hidden select-none ${
          ritarKalla ? 'cursor-crosshair' : ''
        }`}
      >
        {vb && (
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={viewBoxAttribut(vb)}
            onPointerDown={vidPekareNed}
            onPointerMove={vidPekareFlytt}
            onPointerUp={vidPekareUpp}
          >
            <g transform={`translate(${MARGINAL_M} ${MARGINAL_M})`}>
              <PlatsLager
                tradgard={tradgard}
                platser={iTradgarden}
                mpp={mpp}
                valdPlatsId={valdPlatsId}
                interaktiv
              />

              {/* Skuggkällor utanför tomten: streckade, hatchade som byggnader. */}
              {kallorHar.map((kalla) => (
                <g key={kalla.id}>
                  <polygon
                    points={tillPoints(kalla.punkter)}
                    fill="url(#h-bygg)"
                    stroke="var(--color-dis-svag)"
                    strokeWidth={1.2}
                    strokeDasharray="5 3"
                    vectorEffect="non-scaling-stroke"
                  />
                  {kalla.punkter[0] && (
                    <text
                      x={(kalla.punkter[0][0] + (kalla.punkter[2]?.[0] ?? kalla.punkter[0][0])) / 2}
                      y={(kalla.punkter[0][1] + (kalla.punkter[2]?.[1] ?? kalla.punkter[0][1])) / 2}
                      textAnchor="middle"
                      fontSize={9 * mpp}
                      letterSpacing={1.5 * mpp}
                      style={{ fill: 'var(--color-dis-svag)' }}
                    >
                      {kalla.namn.toUpperCase()}
                    </text>
                  )}
                </g>
              ))}

              {lage === 'skuggor' && (
                <SkuggLager
                  skuggare={skuggare}
                  azimut={sol.azimut}
                  hojd={sol.hojd}
                  norrVinkel={norrVinkel}
                />
              )}
              {lage === 'timmar' && dagensRaster && <Varmekarta raster={dagensRaster} />}

              {/* Natt: hela ritningen i skugga. */}
              {lage === 'skuggor' && sol.hojd <= 0 && (
                <rect
                  x={-MARGINAL_M}
                  y={-MARGINAL_M}
                  width={virtB}
                  height={virtH}
                  className="pointer-events-none"
                  style={{ fill: 'var(--color-tusch)' }}
                  opacity={0.35}
                />
              )}

              {/* Solens riktning. */}
              {lage === 'skuggor' && sol.hojd > 0 && (
                <g className="pointer-events-none" data-testid="solindikator">
                  <circle
                    cx={solPos[0]}
                    cy={solPos[1]}
                    r={10 * mpp}
                    style={{ fill: 'var(--color-tra)' }}
                    stroke="var(--color-tusch)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  {Array.from({ length: 8 }, (_, i) => {
                    const v = (i * Math.PI) / 4
                    return (
                      <line
                        key={i}
                        x1={solPos[0] + Math.cos(v) * 14 * mpp}
                        y1={solPos[1] + Math.sin(v) * 14 * mpp}
                        x2={solPos[0] + Math.cos(v) * 19 * mpp}
                        y2={solPos[1] + Math.sin(v) * 19 * mpp}
                        stroke="var(--color-tra)"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  })}
                </g>
              )}

              {/* Utkastet när en skuggkälla ritas. */}
              {kallaUtkast && (
                <rect
                  x={Math.min(kallaUtkast.a[0], kallaUtkast.b[0])}
                  y={Math.min(kallaUtkast.a[1], kallaUtkast.b[1])}
                  width={Math.abs(kallaUtkast.b[0] - kallaUtkast.a[0])}
                  height={Math.abs(kallaUtkast.b[1] - kallaUtkast.a[1])}
                  fill="color-mix(in srgb, var(--color-fermob) 10%, transparent)"
                  stroke="var(--color-fermob-text)"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  vectorEffect="non-scaling-stroke"
                  className="pointer-events-none"
                />
              )}
            </g>
          </svg>
        )}

        {vb && <Skalstock mpp={mpp} />}

        {/* Natt-text, ovanpå men diskret. */}
        {lage === 'skuggor' && sol.hojd <= 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-ljus">
            Solen är nere
          </p>
        )}

        {/* En enda lugn uppmaning när underlaget saknas. */}
        {behoverUnderlag && !visaUnderlag && (
          <div className="absolute inset-x-3 top-3 flex items-center gap-3 rounded-xl border border-linje bg-panel px-4 py-3 shadow-sm">
            <p className="flex-1 text-sm text-dis">
              Skuggorna gissar att norr är uppåt tills du angett var norr ligger.
            </p>
            <Knapp className="min-h-9 shrink-0" onClick={() => setVisaUnderlag(true)}>
              Ange norr
            </Knapp>
          </div>
        )}

        {/* Vald plats: soltimmar i dag + nyckeldatumen. */}
        {valdPlats && (
          <div className="absolute inset-x-3 bottom-3 rounded-xl border border-linje bg-panel px-4 py-3 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 flex-1 truncate font-display text-base font-semibold text-tusch">
                {valdPlats.namn}
              </p>
              {dagensRaster && (
                <PlatsTimmar plats={valdPlats} raster={dagensRaster} suffix="i dag" />
              )}
            </div>
            <p className="mono mt-1.5 flex gap-4 text-xs text-dis">
              {NYCKELDATUM.map(({ etikett, manad: m, dag: d }) => {
                const timmar = platsTimmar(valdPlats, hamtaRaster(m, d))
                return (
                  <span key={etikett}>
                    {etikett} {timmar === undefined ? '—' : formatTimmar(timmar)}
                  </span>
                )
              })}
            </p>
          </div>
        )}

        {/* Namn och höjd för en nyss ritad skuggkälla. */}
        {nyKalla && (
          <div className="absolute inset-x-3 bottom-3 flex flex-col gap-3 rounded-xl border border-linje bg-panel px-4 py-3 shadow-sm">
            <div className="flex gap-3">
              <Falt etikett="Vad skuggar?">
                <input
                  type="text"
                  autoFocus
                  value={nyKallaNamn}
                  onChange={(e) => setNyKallaNamn(e.target.value)}
                  placeholder="Grannens hus"
                  className={inmatningsStil}
                />
              </Falt>
              <Falt etikett="Höjd (m)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={nyKallaHojd}
                  onChange={(e) => setNyKallaHojd(e.target.value)}
                  placeholder="6"
                  className={`${inmatningsStil} mono w-24`}
                />
              </Falt>
            </div>
            <div className="flex gap-2">
              <Knapp onClick={sparaNyKalla}>Spara skuggkällan</Knapp>
              <Knapp variant="diskret" onClick={() => setNyKalla(undefined)}>
                Avbryt
              </Knapp>
            </div>
          </div>
        )}
      </div>

      {/* Reglagen */}
      <div className="flex flex-col gap-4 border-t border-linje px-5 py-4 lg:w-96 lg:overflow-y-auto lg:border-t-0 lg:border-l">
        <div className="flex items-center gap-3">
          <Knapp
            className="min-h-9 shrink-0"
            aria-pressed={spelar}
            onClick={() => setSpelar((nu2) => !nu2)}
          >
            {spelar ? 'Paus' : 'Spela dygnet'}
          </Knapp>
          <input
            type="range"
            min={0}
            max={1430}
            step={10}
            value={minuter}
            onChange={(e) => {
              setSpelar(false)
              setMinuter(Number(e.target.value))
            }}
            aria-label="Tid på dygnet"
            className="min-w-0 flex-1 accent-orm"
          />
          <span className="mono w-12 shrink-0 text-right text-sm text-tusch">
            {formatKlocka(minuter)}
          </span>
        </div>
        {uppMin !== undefined && nedMin !== undefined && (
          <p className="mono -mt-2 text-right text-[11px] text-dis-svag">
            upp {formatKlocka(uppMin)} · ner {formatKlocka(nedMin)}
          </p>
        )}

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={365}
            step={1}
            value={dagPaAret}
            onChange={(e) => setDagPaAret(Number(e.target.value))}
            aria-label="Dag på året"
            className="min-w-0 flex-1 accent-orm"
          />
          <span className="mono w-16 shrink-0 text-right text-sm text-tusch">
            {new Intl.DateTimeFormat('sv-SE', {
              day: 'numeric',
              month: 'short',
              timeZone: 'UTC',
            }).format(datum)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip vald={lage === 'skuggor'} onClick={() => setLage('skuggor')}>
            Skuggor nu
          </Chip>
          <Chip vald={lage === 'timmar'} onClick={() => setLage('timmar')}>
            Soltimmar i dag
          </Chip>
          <button
            type="button"
            onClick={() => setVisaUnderlag((nu2) => !nu2)}
            className="ml-auto text-sm text-dis hover:text-tusch"
          >
            {visaUnderlag ? 'Dölj underlaget' : 'Justera underlaget'}
          </button>
        </div>

        {lage === 'timmar' && dagensRaster && (
          <p className="mono text-[11px] text-dis-svag">
            mörkare = färre soltimmar · dagens max {formatTimmar(dagensRaster.maxTimmar)}
          </p>
        )}

        <p className="text-xs text-dis-svag">
          Modellen antar plan mark och klar himmel. Lövträd skuggar mindre om våren än i
          augusti, och moln finns inte.
        </p>

        {visaUnderlag && (
          <Underlag
            tradgard={tradgard}
            platser={iTradgarden}
            skuggkallor={kallorHar}
            uid={uid}
            ritarKalla={ritarKalla}
            onRitaKalla={() => {
              setRitarKalla((nu2) => {
                if (!nu2) zoomaUtForKalla()
                return !nu2
              })
              setKallaUtkast(undefined)
            }}
          />
        )}

        {/* Kuben: platserna nås härifrån också. */}
        {iTradgarden.some((p) => p.geometri) && !valdPlats && (
          <p className="text-xs text-dis-svag">
            Tryck på en plats i ritningen för att se dess soltimmar.
          </p>
        )}
      </div>
    </div>
  )
}

function platsTimmar(plats: Plats, raster: SoltimmarRaster): number | undefined {
  if (!plats.geometri) return undefined
  return soltimmarForPolygon(
    raster,
    formTillPolygon(plats.geometri.punkter, plats.geometri.runda),
  )
}

function PlatsTimmar({
  plats,
  raster,
  suffix,
}: {
  plats: Plats
  raster: SoltimmarRaster
  suffix: string
}) {
  const timmar = platsTimmar(plats, raster)
  if (timmar === undefined) {
    return <span className="text-xs text-dis">platsen saknar form på ritningen</span>
  }
  return (
    <span className="mono shrink-0 text-sm text-tusch">
      {formatTimmar(timmar)} sol {suffix}
    </span>
  )
}
