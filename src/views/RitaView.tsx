import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDataRot } from '../auth/AuthProvider'
import { Chip } from '../components/Chip'
import { Falt, inmatningsStil } from '../components/Falt'
import { TillbakaIkon } from '../components/Ikoner'
import { Knapp, TaBortKnapp } from '../components/Knapp'
import { useAngra } from '../components/ritning/useAngra'
import { PlatsLager } from '../components/ritning/PlatsLager'
import { Skalstock } from '../components/ritning/Skalstock'
import { useRitYta } from '../components/ritning/useRitYta'
import { VaxtPrickLager } from '../components/ritning/VaxtPrickLager'
import { SaknasVy } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import type { PlatsFalt } from '../data/repo'
import type { Plats, PlatsTyp, PunktM, Tradgard } from '../data/types'
import { platstypEtikett } from '../lib/etiketter'
import {
  allaRunda,
  arRund,
  formTillPolygon,
  laggTillPunkt,
  taBortPunkt,
  vaxlaRunt,
} from '../lib/form'
import { formatArea, formatMeter, tolkaMeter } from '../lib/format'
import {
  area,
  avstand,
  flyttaPunkter,
  omkrets,
  omslutandeRektangel,
  snappa,
  snappaPunkt,
} from '../lib/geometri'
import { senasteFotoPerVaxt } from '../lib/handelser'
import { nyttPlatsNamn } from '../lib/ritstil'
import { TYPGRUPPER } from '../lib/typgrupper'
import { beraknaPrickar, platsVidPunkt } from '../lib/vaxtplacering'
import { viewBoxAttribut } from '../lib/viewbox'

/**
 * Ritläget — planeringsverktyget.
 *
 * EN gest per betydelse: dra ett hörn flyttar det, klicka ett hörn markerar
 * det (och först då syns Runda/Ta bort), klicka en kant lägger till ett hörn.
 * Inga modifierartangenter — de går inte att upptäcka och finns inte på
 * pekskärm. Behöver ritytan en manual ovanför sig är interaktionen fel.
 */
export function RitaView() {
  const { tradgardar, laddad } = useData()
  const [sok] = useSearchParams()

  if (!laddad) return null
  const onskad = sok.get('tradgard')
  const tradgard =
    tradgardar.find((t) => t.id === onskad && t.widthM !== undefined) ??
    tradgardar.find((t) => t.widthM !== undefined)

  if (!tradgard) {
    return <SaknasVy text="Ange måtten på en ritning först." tillbakaTill="/ritning" />
  }
  return <Ritare key={tradgard.id} tradgard={tradgard} />
}

const HINT_NYCKEL = 'ripvagen-ritlage-hint'

type Gest =
  | { typ: 'pan'; pekarId: number; senastX: number; senastY: number; totalPx: number }
  | { typ: 'horn'; pekarId: number; platsId: string; index: number; flyttad: boolean }
  | {
      typ: 'form'
      pekarId: number
      platsId: string
      startMeter: PunktM
      origPunkter: PunktM[]
      flyttad: boolean
    }

function Ritare({ tradgard }: { tradgard: Tradgard }) {
  const { platser, vaxter, handelser } = useData()
  const uid = useDataRot()
  const navigera = useNavigate()
  const angra = useAngra()

  const iTradgarden = platser.filter((p) => p.tradgardId === tradgard.id)
  // Ångra-callbacks körs långt efter render — de läser läget via refs i
  // stället för via inaktuella stängningar.
  const vaxterRef = useRef(vaxter)
  vaxterRef.current = vaxter
  const handelserRef = useRef(handelser)
  handelserRef.current = handelser
  // Öppna zoomad till det som finns ritat, inte till hela tomten. Fångas en
  // gång vid montering — annars skulle vyn hoppa varje gång man ritar.
  const innehall = useRef(
    omslutandeRektangel(
      iTradgarden.flatMap((p) =>
        p.geometri ? formTillPolygon(p.geometri.punkter, p.geometri.runda) : [],
      ),
    ),
  ).current
  const { behallareRef, vb, mpp, tillMeter, tillSkarm, panoreraPx } = useRitYta(
    tradgard.widthM ?? 0,
    tradgard.heightM ?? 0,
    innehall.bredd > 0 ? innehall : undefined,
  )

  const [valtId, setValtId] = useState<string>()
  const [valtHorn, setValtHorn] = useState<number>()
  const [ritar, setRitar] = useState(false)
  const [ritPunkter, setRitPunkter] = useState<PunktM[]>([])
  const [hovrad, setHovrad] = useState<PunktM>()
  const [utkast, setUtkast] = useState<Plats>()
  const [armerad, setArmerad] = useState<string>()
  const [matar, setMatar] = useState(false)
  const [matPunkter, setMatPunkter] = useState<PunktM[]>([])
  const [placeringsfel, setPlaceringsfel] = useState<string>()
  const [visaHint, setVisaHint] = useState(
    () => typeof localStorage !== 'undefined' && !localStorage.getItem(HINT_NYCKEL),
  )
  const gestRef = useRef<Gest | null>(null)

  const visade = utkast ? iTradgarden.map((p) => (p.id === utkast.id ? utkast : p)) : iTradgarden
  const valt = visade.find((p) => p.id === valtId)
  const prickar = beraknaPrickar(vaxter, platser, tradgard.id)
  const fotoAvVaxt = senasteFotoPerVaxt(handelser)
  const utanPosition = vaxter.filter(
    (v) => !prickar.some((p) => p.vaxt.id === v.id) && v.status !== 'planerad',
  )

  function stangHint() {
    setVisaHint(false)
    try {
      localStorage.setItem(HINT_NYCKEL, '1')
    } catch {
      // Privat läge utan lagring — då visas hinten igen. Inte värt mer.
    }
  }

  function valjPlats(id: string | undefined) {
    setValtId(id)
    setValtHorn(undefined)
  }

  function sparaGeometri(plats: Plats, punkter: PunktM[], runda: number[] | undefined, vad: string) {
    const foreP = plats.geometri?.punkter
    const foreR = plats.geometri?.runda
    void (async () => {
      const repo = await import('../data/repo')
      repo.sparaPlatsGeometri(uid, plats.id, punkter, runda)
    })()
    if (!foreP) return
    angra.minns(vad, () => {
      void (async () => {
        const repo = await import('../data/repo')
        repo.sparaPlatsGeometri(uid, plats.id, foreP, foreR)
      })()
    })
  }

  function avbrytRitning() {
    setRitar(false)
    setRitPunkter([])
    setHovrad(undefined)
  }

  function avslutaRitning() {
    let punkter = ritPunkter.filter((p, i) => i === 0 || avstand(p, ritPunkter[i - 1]!) > 0.001)
    while (
      punkter.length > 3 &&
      avstand(punkter[punkter.length - 1]!, punkter[punkter.length - 2]!) <= 0.15
    ) {
      punkter = punkter.slice(0, -1)
    }
    avbrytRitning()
    if (punkter.length < 3) return
    void (async () => {
      const repo = await import('../data/repo')
      const typ: PlatsTyp = 'rabatt'
      const id = repo.skapaPlats(uid, {
        tradgardId: tradgard.id,
        namn: nyttPlatsNamn(
          iTradgarden.map((p) => p.namn),
          platstypEtikett(typ),
        ),
        typ,
        punkter,
      })
      valjPlats(id)
      angra.minns('rita platsen', () => {
        void (async () => {
          const r = await import('../data/repo')
          // Växter kan ha hunnit placeras här (även från mobilen) sedan
          // platsen ritades — läs läget VID ÅNGRAT, inte vid ritandet.
          r.taBortPlats(
            uid,
            id,
            vaxterRef.current.filter((v) => v.platsId === id),
            handelserRef.current.filter((h) => h.platsId === id),
          )
          valjPlats(undefined)
        })()
      })
    })()
  }

  useEffect(() => {
    function vidTangent(e: KeyboardEvent) {
      if (!ritar) return
      if (e.key === 'Escape') {
        setRitPunkter((nu) => {
          if (nu.length <= 1) {
            setRitar(false)
            setHovrad(undefined)
            return []
          }
          return nu.slice(0, -1)
        })
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        avslutaRitning()
      }
    }
    window.addEventListener('keydown', vidTangent)
    return () => window.removeEventListener('keydown', vidTangent)
  })

  function vidPekareNed(e: ReactPointerEvent<SVGSVGElement>) {
    if (ritar || armerad || matar) return
    if (gestRef.current) return
    const mal = e.target as Element

    // Kant → lägg till ett hörn. Bara på en redan markerad form, så första
    // klicket alltid betyder "markera" och andra "ändra".
    const kantEl = mal.closest('[data-kant-index]')
    if (kantEl && valt?.geometri) {
      const index = Number(kantEl.getAttribute('data-kant-index'))
      const nytt = laggTillPunkt(valt.geometri.punkter, valt.geometri.runda, index)
      sparaGeometri(valt, nytt.punkter, nytt.runda, 'lägga till hörnet')
      setValtHorn(index + 1)
      return
    }

    e.currentTarget.setPointerCapture(e.pointerId)

    const hornEl = mal.closest('[data-horn-index]')
    if (hornEl && valt) {
      gestRef.current = {
        typ: 'horn',
        pekarId: e.pointerId,
        platsId: valt.id,
        index: Number(hornEl.getAttribute('data-horn-index')),
        flyttad: false,
      }
      return
    }

    const platsId = mal.closest('[data-plats-id]')?.getAttribute('data-plats-id') ?? undefined
    const plats = platsId ? iTradgarden.find((p) => p.id === platsId) : undefined
    if (plats?.geometri) {
      gestRef.current = {
        typ: 'form',
        pekarId: e.pointerId,
        platsId: plats.id,
        startMeter: tillMeter(e.clientX, e.clientY),
        origPunkter: plats.geometri.punkter,
        flyttad: false,
      }
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
    if (ritar) {
      setHovrad(snappaPunkt(tillMeter(e.clientX, e.clientY)))
      return
    }
    const gest = gestRef.current
    if (!gest || e.pointerId !== gest.pekarId) return

    if (gest.typ === 'horn') {
      const plats = iTradgarden.find((p) => p.id === gest.platsId)
      if (!plats?.geometri) return
      const punkt = snappaPunkt(tillMeter(e.clientX, e.clientY))
      if (!gest.flyttad && avstand(punkt, plats.geometri.punkter[gest.index]!) < 0.05) return
      gest.flyttad = true
      const punkter = plats.geometri.punkter.map((p, i) => (i === gest.index ? punkt : p))
      setUtkast({ ...plats, geometri: { ...plats.geometri, punkter } })
      return
    }

    if (gest.typ === 'form') {
      const plats = iTradgarden.find((p) => p.id === gest.platsId)
      if (!plats?.geometri) return
      const [mx, my] = tillMeter(e.clientX, e.clientY)
      const dx = snappa(mx - gest.startMeter[0])
      const dy = snappa(my - gest.startMeter[1])
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) gest.flyttad = true
      if (gest.flyttad) {
        setUtkast({
          ...plats,
          geometri: { ...plats.geometri, punkter: flyttaPunkter(gest.origPunkter, dx, dy) },
        })
      }
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
    if (ritar) return
    const gest = gestRef.current
    if (!gest || e.pointerId !== gest.pekarId) return
    gestRef.current = null

    if (gest.typ === 'horn') {
      const plats = iTradgarden.find((p) => p.id === gest.platsId)
      if (utkast?.geometri && gest.flyttad) {
        sparaGeometri(
          plats ?? utkast,
          utkast.geometri.punkter,
          utkast.geometri.runda,
          'flytta hörnet',
        )
      } else if (!gest.flyttad) {
        // Klick utan rörelse = markera hörnet. Då, och bara då, syns knapparna.
        setValtHorn((nu) => (nu === gest.index ? undefined : gest.index))
      }
      setUtkast(undefined)
      return
    }

    if (gest.typ === 'form') {
      const plats = iTradgarden.find((p) => p.id === gest.platsId)
      if (utkast?.geometri && gest.flyttad) {
        sparaGeometri(
          plats ?? utkast,
          utkast.geometri.punkter,
          utkast.geometri.runda,
          'flytta platsen',
        )
      } else if (!gest.flyttad) {
        valjPlats(gest.platsId)
      }
      setUtkast(undefined)
      return
    }
    if (gest.typ === 'pan' && gest.totalPx < 8) valjPlats(undefined)
  }

  function vidPekareAvbruten(e: ReactPointerEvent<SVGSVGElement>) {
    const gest = gestRef.current
    if (!gest || e.pointerId !== gest.pekarId) return
    gestRef.current = null
    setUtkast(undefined)
  }

  function vidKlick(e: ReactMouseEvent<SVGSVGElement>) {
    const punkt = snappaPunkt(tillMeter(e.clientX, e.clientY))
    if (ritar) {
      setRitPunkter((nu) => [...nu, punkt])
      return
    }
    if (matar) {
      setMatPunkter((nu) => (nu.length >= 2 ? [punkt] : [...nu, punkt]))
      return
    }
    if (!armerad) return

    const plats = platsVidPunkt(punkt, platser, tradgard.id)
    const vaxt = vaxter.find((v) => v.id === armerad)
    if (!vaxt) return
    if (!plats) {
      setPlaceringsfel('Klicka inuti en plats. Växten måste stå någonstans.')
      return
    }
    const foreP = vaxt.platsId
    const forePos = vaxt.position
    // Lådan fylls när skrivningen körts — ångra kan tryckas långt senare.
    const flyttId: { varde?: string } = {}
    void (async () => {
      const repo = await import('../data/repo')
      flyttId.varde = repo.flyttaVaxtPaRitningen(uid, vaxt, punkt[0], punkt[1], plats.id)
    })()
    setArmerad(undefined)
    setPlaceringsfel(undefined)
    angra.minns(`placera ${vaxt.namn}`, () => {
      void (async () => {
        const repo = await import('../data/repo')
        repo.aterstallVaxtPlacering(uid, vaxt.id, foreP, forePos)
        // En ångrad flytt ska inte lämna spår i historiken.
        if (flyttId.varde) repo.taBortHandelse(uid, flyttId.varde)
      })()
    })
  }

  function rundaValtHorn() {
    if (!valt?.geometri || valtHorn === undefined) return
    const runda = vaxlaRunt(valt.geometri.runda, valtHorn)
    sparaGeometri(
      valt,
      valt.geometri.punkter,
      runda,
      arRund(runda, valtHorn) ? 'runda hörnet' : 'spetsa hörnet',
    )
  }

  function taBortValtHorn() {
    if (!valt?.geometri || valtHorn === undefined) return
    const kvar = taBortPunkt(valt.geometri.punkter, valt.geometri.runda, valtHorn)
    if (kvar.punkter.length === valt.geometri.punkter.length) return
    sparaGeometri(valt, kvar.punkter, kvar.runda, 'ta bort hörnet')
    setValtHorn(undefined)
  }

  const ritVisning = hovrad && ritPunkter.length > 0 ? [...ritPunkter, hovrad] : ritPunkter
  const hornPunkt =
    valt?.geometri && valtHorn !== undefined ? valt.geometri.punkter[valtHorn] : undefined
  const hornSkarm = hornPunkt ? tillSkarm(hornPunkt) : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-nowrap items-center gap-3 overflow-x-auto border-b border-linje px-4 py-2.5">
        <Link
          to="/ritning"
          aria-label="Tillbaka till ritningen"
          className="-ml-1 flex size-11 items-center justify-center rounded-lg text-dis hover:text-tusch"
        >
          <TillbakaIkon />
        </Link>
        <h1 className="font-display text-lg font-semibold text-tusch">{tradgard.namn}</h1>
        <TomtMatt tradgard={tradgard} />

        <div className="ml-auto flex items-center gap-2">
          <Knapp
            onClick={angra.angra}
            disabled={!angra.kanAngra}
            title={angra.nastaEtikett ? `Ångra ${angra.nastaEtikett}` : 'Inget att ångra'}
          >
            Ångra
          </Knapp>
          <Knapp
            onClick={() => {
              setMatar((nu) => !nu)
              setMatPunkter([])
              setArmerad(undefined)
            }}
            aria-pressed={matar}
            className={matar ? 'bg-upphojd font-medium' : ''}
          >
            {matar ? 'Sluta mäta' : 'Mät'}
          </Knapp>
          {ritar ? (
            <Knapp onClick={avbrytRitning}>Avbryt</Knapp>
          ) : (
            // Enda röda i vyn: det man faktiskt är här för.
            <Knapp
              variant="primar"
              onClick={() => {
                valjPlats(undefined)
                setArmerad(undefined)
                setMatar(false)
                setRitar(true)
              }}
            >
              Rita ny plats
            </Knapp>
          )}
          <Knapp onClick={() => navigera('/ritning')}>Klar</Knapp>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:h-[calc(100dvh-8.5rem)] lg:flex-none lg:flex-row">
        <div
          ref={behallareRef}
          data-testid="ritredigering"
          className={`relative min-h-64 flex-1 touch-none overflow-hidden ring-1 ring-linje ring-inset select-none ${
            ritar || armerad || matar ? 'cursor-crosshair' : ''
          }`}
        >
          {/* Diskret markering av läget — ingen färgad list. */}
          <span className="pointer-events-none absolute top-3 left-3 z-10 rounded bg-panel/90 px-2 py-0.5 text-[11px] tracking-[0.08em] text-dis uppercase ring-1 ring-linje ring-inset">
            Ritläge
          </span>

          {vb && (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={viewBoxAttribut(vb)}
              onPointerDown={vidPekareNed}
              onPointerMove={vidPekareFlytt}
              onPointerUp={vidPekareUpp}
              onPointerCancel={vidPekareAvbruten}
              onClick={vidKlick}
              onDoubleClick={avslutaRitning}
            >
              <PlatsLager
                tradgard={tradgard}
                platser={visade}
                mpp={mpp}
                interaktiv
                valdPlatsId={valtId}
              />
              <VaxtPrickLager prickar={prickar} mpp={mpp} fotoRefAvVaxt={fotoAvVaxt} />

              {ritar && ritVisning.length > 0 && (
                <g className="pointer-events-none">
                  <polyline
                    points={ritVisning.map((p) => p.join(',')).join(' ')}
                    fill="color-mix(in srgb, var(--color-fermob) 10%, transparent)"
                    stroke="var(--color-fermob-text)"
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="6 4"
                  />
                  {ritVisning.slice(1).map((p, i) => {
                    const a = ritVisning[i]!
                    const langd = avstand(a, p)
                    if (langd < 0.25) return null
                    return (
                      <text
                        key={`matt-${i}`}
                        x={(a[0] + p[0]) / 2}
                        y={(a[1] + p[1]) / 2 - 6 * mpp}
                        textAnchor="middle"
                        fontSize={10 * mpp}
                        className="mono"
                        style={{ fill: 'var(--color-dis)' }}
                      >
                        {formatMeter(langd)}
                      </text>
                    )
                  })}
                  {ritPunkter.map((p, i) => (
                    <circle
                      key={i}
                      cx={p[0]}
                      cy={p[1]}
                      r={4 * mpp}
                      fill="var(--color-panel)"
                      stroke="var(--color-fermob-text)"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              )}

              {matPunkter.length > 0 && (
                <g className="pointer-events-none">
                  {matPunkter.map((p, i) => (
                    <circle
                      key={`mat-${i}`}
                      cx={p[0]}
                      cy={p[1]}
                      r={4 * mpp}
                      fill="var(--color-panel)"
                      stroke="var(--color-fermob-text)"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {matPunkter.length === 2 && (
                    <>
                      <line
                        x1={matPunkter[0]![0]}
                        y1={matPunkter[0]![1]}
                        x2={matPunkter[1]![0]}
                        y2={matPunkter[1]![1]}
                        stroke="var(--color-fermob-text)"
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        vectorEffect="non-scaling-stroke"
                      />
                      <text
                        x={(matPunkter[0]![0] + matPunkter[1]![0]) / 2}
                        y={(matPunkter[0]![1] + matPunkter[1]![1]) / 2 - 8 * mpp}
                        textAnchor="middle"
                        fontSize={12 * mpp}
                        className="mono"
                        style={{ fill: 'var(--color-fermob-text)' }}
                      >
                        {formatMeter(avstand(matPunkter[0]!, matPunkter[1]!))}
                      </text>
                    </>
                  )}
                </g>
              )}

              {/* Osynliga träffremsor längs kanterna: klicka för nytt hörn. */}
              {valt?.geometri &&
                !ritar &&
                !matar &&
                !armerad &&
                valt.geometri.punkter.map((p, i) => {
                  const n = valt.geometri!.punkter
                  const b = n[(i + 1) % n.length]!
                  return (
                    <line
                      key={`kant-${i}`}
                      data-kant-index={i}
                      x1={p[0]}
                      y1={p[1]}
                      x2={b[0]}
                      y2={b[1]}
                      stroke="transparent"
                      strokeWidth={16}
                      vectorEffect="non-scaling-stroke"
                      cursor="copy"
                    />
                  )
                })}

              {valt?.geometri &&
                !ritar &&
                valt.geometri.punkter.map((p, i) => {
                  const rund = arRund(valt.geometri!.runda, i)
                  const markerat = valtHorn === i
                  const r = (markerat ? 7 : 5.5) * mpp
                  return (
                    <g key={`horn-${i}`} data-horn-index={i} cursor="grab">
                      <circle cx={p[0]} cy={p[1]} r={16 * mpp} fill="transparent" />
                      {rund ? (
                        <circle
                          cx={p[0]}
                          cy={p[1]}
                          r={r}
                          fill={markerat ? 'var(--color-fermob-text)' : 'var(--color-orm)'}
                          stroke="var(--color-panel)"
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                        />
                      ) : (
                        <rect
                          x={p[0] - r}
                          y={p[1] - r}
                          width={r * 2}
                          height={r * 2}
                          fill="var(--color-panel)"
                          stroke={markerat ? 'var(--color-fermob-text)' : 'var(--color-tusch)'}
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                    </g>
                  )
                })}
            </svg>
          )}

          {vb && <Skalstock mpp={mpp} />}

          {/* Hörnets knappar — riktiga knappar, fungerar på pekskärm. */}
          {hornSkarm && valt?.geometri && valtHorn !== undefined && (
            <div
              data-testid="hornknappar"
              className="fixed z-30 flex -translate-x-1/2 gap-1"
              style={{ left: hornSkarm.x, top: hornSkarm.y + 18 }}
            >
              <button
                type="button"
                onClick={rundaValtHorn}
                className="min-h-9 rounded-lg border border-linje bg-panel px-3 text-sm text-tusch shadow-sm hover:bg-upphojd"
              >
                {arRund(valt.geometri.runda, valtHorn) ? 'Gör spetsig' : 'Runda'}
              </button>
              <button
                type="button"
                onClick={taBortValtHorn}
                disabled={valt.geometri.punkter.length <= 3}
                className="min-h-9 rounded-lg border border-linje bg-panel px-3 text-sm text-dis shadow-sm hover:text-tusch disabled:opacity-40"
              >
                Ta bort
              </button>
            </div>
          )}

          {placeringsfel && (
            <p
              role="alert"
              className="absolute inset-x-3 top-12 rounded-xl border border-fermob-text/40 bg-panel px-4 py-3 text-sm text-tusch"
            >
              {placeringsfel}
            </p>
          )}

          {/* Visas en gång, aldrig mer. */}
          {visaHint && iTradgarden.length > 0 && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-xl border border-linje bg-panel px-4 py-3 shadow-sm">
              <p className="flex-1 text-sm text-dis">
                Dra ett hörn för att flytta det. Klicka ett hörn eller en kant för att ändra formen.
              </p>
              <button
                type="button"
                onClick={stangHint}
                className="pointer-events-auto min-h-9 shrink-0 px-2 text-sm font-medium text-tusch"
              >
                Uppfattat
              </button>
            </div>
          )}

          {iTradgarden.length === 0 && !ritar && (
            <p className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto max-w-xs px-6 text-center text-sm/6 text-dis">
              {tradgard.namn} är tom än. Tryck "Rita ny plats" och klicka ut hörnen.
            </p>
          )}
        </div>

        <aside className="flex min-h-0 w-full flex-col gap-5 overflow-y-auto border-t border-linje p-4 lg:w-80 lg:border-t-0 lg:border-l">
          {valt && !ritar ? (
            <PlatsPanel
              key={valt.id}
              plats={valt}
              antalVaxter={vaxter.filter((v) => v.platsId === valt.id).length}
              onGeometri={sparaGeometri}
              onMinns={angra.minns}
              onTaBort={() => valjPlats(undefined)}
            />
          ) : (
            <p className="text-sm text-dis">
              Markera en plats för att ändra den — eller rita en ny.
            </p>
          )}

          {vaxter.length > 0 && (
          <div className="border-t border-linje pt-4">
            <h2 className="mb-2 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
              Utan position
            </h2>
            {utanPosition.length === 0 ? (
              <p className="text-sm text-dis-svag">Alla växter är placerade.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {utanPosition.map((v) => (
                  <li key={v.id}>
                    <Chip
                      vald={armerad === v.id}
                      onClick={() => {
                        setPlaceringsfel(undefined)
                        setMatar(false)
                        setArmerad(armerad === v.id ? undefined : v.id)
                      }}
                    >
                      {v.namn}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
          </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function mattText(varde: number): string {
  return String(Number(varde.toFixed(2))).replace('.', ',')
}

function TomtMatt({ tradgard }: { tradgard: Tradgard }) {
  const uid = useDataRot()
  const [bredd, setBredd] = useState(mattText(tradgard.widthM ?? 0))
  const [djup, setDjup] = useState(mattText(tradgard.heightM ?? 0))

  useEffect(() => {
    setBredd(mattText(tradgard.widthM ?? 0))
    setDjup(mattText(tradgard.heightM ?? 0))
  }, [tradgard.widthM, tradgard.heightM])

  function spara() {
    const breddM = tolkaMeter(bredd, 2)
    const djupM = tolkaMeter(djup, 2)
    if (!breddM || !djupM) {
      setBredd(mattText(tradgard.widthM ?? 0))
      setDjup(mattText(tradgard.heightM ?? 0))
      return
    }
    if (breddM === tradgard.widthM && djupM === tradgard.heightM) return
    void (async () => {
      const repo = await import('../data/repo')
      repo.sparaTradgardMatt(uid, tradgard.id, breddM, djupM)
    })()
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <label className="sr-only" htmlFor="tomt-bredd">
        Ritningens bredd i meter
      </label>
      <input
        id="tomt-bredd"
        type="text"
        inputMode="decimal"
        value={bredd}
        onChange={(e) => setBredd(e.target.value)}
        onBlur={spara}
        className={`${inmatningsStil} mono w-16 py-1.5 text-center text-sm`}
      />
      <span className="text-dis-svag">×</span>
      <label className="sr-only" htmlFor="tomt-djup">
        Ritningens djup i meter
      </label>
      <input
        id="tomt-djup"
        type="text"
        inputMode="decimal"
        value={djup}
        onChange={(e) => setDjup(e.target.value)}
        onBlur={spara}
        className={`${inmatningsStil} mono w-16 py-1.5 text-center text-sm`}
      />
      <span className="text-dis-svag">m</span>
    </div>
  )
}

/**
 * Panelen i den ordning saker faktiskt används: namn och typ överst, sedan
 * siffrorna man arbetar med. Planerad, anteckning och radering ligger bakom
 * "Fler detaljer" — de sätts sällan och ska inte äta höjd.
 *
 * "Mått (m)" är borttaget. Det var formens omslutande rektangel och sa
 * ingenting om en böjd rabatt; area och omkrets är siffrorna man beställer
 * jord och kantsten efter.
 */
function PlatsPanel({
  plats,
  antalVaxter,
  onGeometri,
  onMinns,
  onTaBort,
}: {
  plats: Plats
  antalVaxter: number
  onGeometri: (plats: Plats, punkter: PunktM[], runda: number[] | undefined, vad: string) => void
  onMinns: (etikett: string, gor: () => void) => void
  onTaBort: () => void
}) {
  const uid = useDataRot()
  const { vaxter, handelser } = useData()
  const [namn, setNamn] = useState(plats.namn)
  const [skriverEgenTyp, setSkriverEgenTyp] = useState(false)
  const [anteckning, setAnteckning] = useState(plats.anteckning ?? '')
  const [visaMer, setVisaMer] = useState(false)

  function uppdatera(falt: Partial<PlatsFalt>, etikett: string, fore: Partial<PlatsFalt>) {
    void (async () => {
      const repo = await import('../data/repo')
      repo.uppdateraPlats(uid, plats.id, falt)
    })()
    onMinns(etikett, () => {
      void (async () => {
        const repo = await import('../data/repo')
        repo.uppdateraPlats(uid, plats.id, fore)
      })()
    })
  }

  function sparaEgenTyp(varde: string) {
    setSkriverEgenTyp(false)
    const eget = varde.trim()
    if ((plats.egenTyp ?? '') === eget) return
    uppdatera({ egenTyp: eget || undefined }, 'den egna typen', { egenTyp: plats.egenTyp })
  }

  const kurva = plats.geometri
    ? formTillPolygon(plats.geometri.punkter, plats.geometri.runda)
    : undefined
  const antalHorn = plats.geometri?.punkter.length ?? 0
  const allaAr = antalHorn > 0 && (plats.geometri?.runda?.length ?? 0) === antalHorn

  return (
    <div className="flex flex-col gap-5">
      {/* Rubriken ÄR namnet — det ska inte stå två gånger i panelen. */}
      <div>
        <span className="text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
          Markerad plats
        </span>
        <input
          type="text"
          value={namn}
          aria-label="Namn"
          onChange={(e) => setNamn(e.target.value)}
          onBlur={() => {
            const trimmat = namn.trim()
            if (trimmat && trimmat !== plats.namn) {
              uppdatera({ namn: trimmat }, 'namnbytet', { namn: plats.namn })
            } else if (!trimmat) setNamn(plats.namn)
          }}
          className="mt-1 w-full border-0 bg-transparent p-0 font-display text-xl font-semibold text-tusch focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        {TYPGRUPPER.map((grupp) => (
          <div key={grupp.rubrik} className="flex flex-wrap items-center gap-1.5">
            <span className="w-12 shrink-0 text-[11px] text-dis-svag">{grupp.rubrik}</span>
            {grupp.typer.map((typ) => (
              <Chip
                key={typ}
                vald={typ === plats.typ && !plats.egenTyp}
                onClick={() =>
                  uppdatera({ typ, egenTyp: undefined }, 'typbytet', {
                    typ: plats.typ,
                    egenTyp: plats.egenTyp,
                  })
                }
              >
                {platstypEtikett(typ)}
              </Chip>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-12 shrink-0 text-[11px] text-dis-svag">Eget</span>
          <Chip
            vald={plats.typ === 'annat' && !plats.egenTyp}
            onClick={() =>
              uppdatera({ typ: 'annat', egenTyp: undefined }, 'typbytet', {
                typ: plats.typ,
                egenTyp: plats.egenTyp,
              })
            }
          >
            Annat
          </Chip>
          <Chip vald={!!plats.egenTyp} onClick={() => setSkriverEgenTyp(true)}>
            {plats.egenTyp ? plats.egenTyp : 'Egen…'}
          </Chip>
        </div>
        {skriverEgenTyp && (
          <input
            type="text"
            autoFocus
            defaultValue={plats.egenTyp ?? ''}
            placeholder="Kompost"
            aria-label="Egen typ"
            onKeyDown={(e) => {
              if (e.key === 'Enter') sparaEgenTyp((e.target as HTMLInputElement).value)
              if (e.key === 'Escape') setSkriverEgenTyp(false)
            }}
            onBlur={(e) => sparaEgenTyp(e.target.value)}
            className={inmatningsStil}
          />
        )}
      </div>

      {/* Siffrorna man faktiskt använder — utan scroll. */}
      {kurva && (
        <dl className="flex gap-3">
          <div className="flex-1 rounded-xl bg-salvia px-3 py-2">
            <dt className="text-[11px] text-dis">Area</dt>
            <dd className="mono text-base text-tusch">{formatArea(area(kurva))}</dd>
          </div>
          <div className="flex-1 rounded-xl bg-salvia px-3 py-2">
            <dt className="text-[11px] text-dis">Omkrets</dt>
            <dd className="mono text-base text-tusch">{formatMeter(omkrets(kurva))}</dd>
          </div>
        </dl>
      )}

      {antalHorn >= 3 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-dis">Kanter</span>
          <Chip
            className="self-start"
            onClick={() =>
              onGeometri(
                plats,
                plats.geometri!.punkter,
                allaAr ? [] : allaRunda(antalHorn),
                allaAr ? 'spetsa kanterna' : 'runda kanterna',
              )
            }
          >
            {allaAr ? 'Gör alla spetsiga' : 'Runda alla'}
          </Chip>
        </div>
      )}

      <p className="mono text-xs text-dis-svag">
        {antalVaxter === 1 ? '1 växt här' : `${antalVaxter} växter här`}
      </p>

      <div className="border-t border-linje pt-3">
        <button
          type="button"
          onClick={() => setVisaMer((n) => !n)}
          className="text-sm text-dis hover:text-tusch"
        >
          {visaMer ? 'Färre detaljer' : 'Fler detaljer'}
        </button>

        {visaMer && (
          <div className="mt-4 flex flex-col gap-4">
            <Chip
              vald={plats.status === 'planerad'}
              onClick={() =>
                uppdatera(
                  { status: plats.status === 'planerad' ? 'finns' : 'planerad' },
                  'planerad-växlingen',
                  { status: plats.status },
                )
              }
              className="self-start"
            >
              Planerad
            </Chip>

            <Falt etikett="Anteckning">
              <textarea
                rows={2}
                value={anteckning}
                onChange={(e) => setAnteckning(e.target.value)}
                onBlur={() => {
                  const trimmat = anteckning.trim()
                  if ((plats.anteckning ?? '') !== trimmat) {
                    uppdatera({ anteckning: trimmat || undefined }, 'anteckningen', {
                      anteckning: plats.anteckning,
                    })
                  }
                }}
                className={inmatningsStil}
              />
            </Falt>

            {/* Lågmäld och sist. Rött är signalfärg, inte "radera". */}
            <div className="pt-1">
              <TaBortKnapp
                onBekraftad={() => {
                  const vaxterDar = vaxter.filter((v) => v.platsId === plats.id)
                  const platsFore = plats
                  const placeringar = vaxterDar.map((v) => ({
                    id: v.id,
                    platsId: v.platsId,
                    position: v.position,
                  }))
                  // Fylls med de händelser raderingen faktiskt tog — det är
                  // dem ångra ska återskapa, inte vyns möjligen inaktuella
                  // lista. Fotona bevaras: en raderad blob kan aldrig
                  // återuppstå, och då vore "Går att ångra" en lögn.
                  const raderade: { varde: import('../data/types').Handelse[] } = { varde: [] }
                  void (async () => {
                    const repo = await import('../data/repo')
                    repo.taBortPlats(
                      uid,
                      plats.id,
                      vaxterDar,
                      handelser.filter((h) => h.platsId === plats.id),
                      {
                        bevaraFoton: true,
                        vidStadat: (h) => {
                          raderade.varde = h
                        },
                      },
                    )
                    onTaBort()
                  })()
                  onMinns('ta bort platsen', () => {
                    void (async () => {
                      const repo = await import('../data/repo')
                      repo.aterskapaPlats(uid, platsFore)
                      for (const h of raderade.varde) {
                        repo.aterskapaHandelse(uid, h)
                      }
                      for (const p of placeringar) {
                        repo.aterstallVaxtPlacering(uid, p.id, p.platsId, p.position)
                      }
                    })()
                  })
                }}
              >
                Ta bort platsen
              </TaBortKnapp>
              <p className="mt-1 text-xs text-dis-svag">
                Växterna blir kvar under "Utan plats". Går att ångra.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
