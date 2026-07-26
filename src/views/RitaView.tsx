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
import { PLATSTYPER, type Plats, type PlatsTyp, type PunktM, type Tradgard } from '../data/types'
import { platstypEtikett } from '../lib/etiketter'
import {
  allaRunda,
  arRund,
  formTillPolygon,
  laggTillPunkt,
  segmentMitter,
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
  skalaTillMatt,
  snappa,
  snappaPunkt,
} from '../lib/geometri'
import { senasteFotoPerVaxt } from '../lib/handelser'
import { nyttPlatsNamn } from '../lib/ritstil'
import { beraknaPrickar, platsVidPunkt } from '../lib/vaxtplacering'
import { viewBoxAttribut } from '../lib/viewbox'

/**
 * Ritläget — planeringsverktyget. Desktop-först: mus, stor skärm, snap 0,1 m.
 * Läget är avsiktligt tydligt markerat och har en Klar-knapp; det ska aldrig
 * gå att undra om man är i det eller inte.
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
  const { behallareRef, vb, mpp, tillMeter, panoreraPx } = useRitYta(
    tradgard.widthM ?? 0,
    tradgard.heightM ?? 0,
  )

  const [valtId, setValtId] = useState<string>()
  const [ritar, setRitar] = useState(false)
  const [ritPunkter, setRitPunkter] = useState<PunktM[]>([])
  const [hovrad, setHovrad] = useState<PunktM>()
  const [utkast, setUtkast] = useState<Plats>()
  /** Växt som väntar på att placeras: klicka i listan, klicka på ritningen. */
  const [armerad, setArmerad] = useState<string>()
  /** Måttband: två klick ger ett avstånd. Tredje klicket börjar om. */
  const [matar, setMatar] = useState(false)
  const [matPunkter, setMatPunkter] = useState<PunktM[]>([])
  const gestRef = useRef<Gest | null>(null)

  const iTradgarden = platser.filter((p) => p.tradgardId === tradgard.id)
  const visade = utkast ? iTradgarden.map((p) => (p.id === utkast.id ? utkast : p)) : iTradgarden
  const valt = visade.find((p) => p.id === valtId)
  const prickar = beraknaPrickar(vaxter, platser, tradgard.id)
  const fotoAvVaxt = senasteFotoPerVaxt(handelser)
  const utanPosition = vaxter.filter(
    (v) => !prickar.some((p) => p.vaxt.id === v.id) && v.status !== 'planerad',
  )

  /** Sparar geometri och lägger den gamla formen på ångra-stacken. */
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
    // Dubbelklicket ger två extra klick i slutet. Punkterna är snappade till
    // 0,1 m, så grannrutor kan ligga exakt 0,1 m isär — rensa svansen med en
    // tröskel som är större än snappsteget.
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
      const antal = iTradgarden.filter((p) => p.typ === typ).length
      const id = repo.skapaPlats(uid, {
        tradgardId: tradgard.id,
        namn: nyttPlatsNamn(antal, platstypEtikett(typ)),
        typ,
        punkter,
      })
      setValtId(id)
      angra.minns('rita platsen', () => {
        void (async () => {
          const r = await import('../data/repo')
          r.taBortPlats(uid, id, [], [])
          setValtId(undefined)
        })()
      })
    })()
  }

  useEffect(() => {
    function vidTangent(e: KeyboardEvent) {
      if (!ritar) return
      if (e.key === 'Escape') {
        // Esc ångrar sista hörnet; är det tomt avbryts ritningen.
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
    e.currentTarget.setPointerCapture(e.pointerId)
    const mal = e.target as Element

    // Halvtransparent plupp mitt på en kant: klicka för att lägga till ett hörn.
    const mittEl = mal.closest('[data-mitt-index]')
    if (mittEl && valt?.geometri) {
      const index = Number(mittEl.getAttribute('data-mitt-index'))
      const nytt = laggTillPunkt(valt.geometri.punkter, valt.geometri.runda, index)
      sparaGeometri(valt, nytt.punkter, nytt.runda, 'lägga till hörnet')
      return
    }

    const hornEl = mal.closest('[data-horn-index]')
    // Alt-klick tar bort hörnet. Formen måste behålla minst tre.
    if (hornEl && valt?.geometri && e.altKey) {
      const index = Number(hornEl.getAttribute('data-horn-index'))
      const kvar = taBortPunkt(valt.geometri.punkter, valt.geometri.runda, index)
      if (kvar.punkter.length !== valt.geometri.punkter.length) {
        sparaGeometri(valt, kvar.punkter, kvar.runda, 'ta bort hörnet')
      }
      return
    }
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
      // Rör man sig inte räknas det som ett klick — och ett klick vänder
      // hörnet mellan runt och spetsigt.
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
        sparaGeometri(plats ?? utkast, utkast.geometri.punkter, utkast.geometri.runda, 'flytta hörnet')
      } else if (plats?.geometri && !gest.flyttad) {
        // Klick utan rörelse → runda eller spetsa hörnet.
        const runda = vaxlaRunt(plats.geometri.runda, gest.index)
        sparaGeometri(
          plats,
          plats.geometri.punkter,
          runda,
          arRund(runda, gest.index) ? 'runda hörnet' : 'spetsa hörnet',
        )
      }
      setUtkast(undefined)
      return
    }

    if (gest.typ === 'form') {
      const plats = iTradgarden.find((p) => p.id === gest.platsId)
      if (utkast?.geometri && gest.flyttad) {
        sparaGeometri(plats ?? utkast, utkast.geometri.punkter, utkast.geometri.runda, 'flytta platsen')
      } else if (!gest.flyttad) {
        setValtId(gest.platsId)
      }
      setUtkast(undefined)
      return
    }
    if (gest.typ === 'pan' && gest.totalPx < 8) setValtId(undefined)
  }

  /** Avbruten gest: släng utkastet utan att persistera. */
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
      // Tyst misslyckande var det gamla beteendet — säg i stället varför.
      setPlaceringsfel('Klicka inuti en plats. Växten måste stå någonstans.')
      return
    }
    const foreP = vaxt.platsId
    const forePos = vaxt.position
    void (async () => {
      const repo = await import('../data/repo')
      repo.flyttaVaxtPaRitningen(uid, vaxt, punkt[0], punkt[1], plats.id)
    })()
    setArmerad(undefined)
    setPlaceringsfel(undefined)
    angra.minns(`placera ${vaxt.namn}`, () => {
      void (async () => {
        const repo = await import('../data/repo')
        repo.aterstallVaxtPlacering(uid, vaxt.id, foreP, forePos)
      })()
    })
  }

  const [placeringsfel, setPlaceringsfel] = useState<string>()
  const ritVisning = hovrad && ritPunkter.length > 0 ? [...ritPunkter, hovrad] : ritPunkter

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Ritläget ska synas på en meter håll. */}
      <div className="flex flex-nowrap items-center gap-3 overflow-x-auto border-b-2 border-fermob/60 bg-fermob/10 px-4 py-2.5">
        <Link
          to="/ritning"
          aria-label="Tillbaka till ritningen"
          className="-ml-1 flex size-11 items-center justify-center rounded-lg text-dis hover:text-tusch"
        >
          <TillbakaIkon />
        </Link>
        <span className="mono rounded bg-fermob px-2 py-0.5 text-[11px] font-medium tracking-[0.1em] text-white uppercase">
          Ritläge
        </span>
        <h1 className="font-display text-lg font-semibold text-tusch">{tradgard.namn}</h1>
        <TomtMatt tradgard={tradgard} />

        <div className="ml-auto flex items-center gap-2">
          {/* Fast bredd och fast text: en etikett som växer med åtgärdens
              namn radbryter verktygsraden, och då hoppar hela ritytan. Vad
              som ångras står i hjälpraden nedanför i stället. */}
          <Knapp
            onClick={angra.angra}
            disabled={!angra.kanAngra}
            aria-label={angra.nastaEtikett ? `Ångra ${angra.nastaEtikett}` : 'Ångra'}
          >
            Ångra
          </Knapp>
          <Knapp
            onClick={() => {
              setMatar((nu) => !nu)
              setMatPunkter([])
              setArmerad(undefined)
            }}
            className={matar ? 'border-fermob-text text-fermob-text' : ''}
          >
            {matar ? 'Sluta mäta' : 'Mät'}
          </Knapp>
          {ritar ? (
            <Knapp onClick={avbrytRitning}>Avbryt ritandet</Knapp>
          ) : (
            <Knapp
              onClick={() => {
                setValtId(undefined)
                setArmerad(undefined)
                setRitar(true)
              }}
            >
              Rita ny plats
            </Knapp>
          )}
          <Knapp variant="primar" onClick={() => navigera('/ritning')}>
            Klar
          </Knapp>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-4 border-b border-linje px-4 py-1.5">
        <p className="text-xs text-dis">
          {ritar
            ? 'Klicka ut hörnen · Enter avslutar · Esc ångrar senaste hörnet'
            : matar
              ? 'Klicka två punkter för att mäta avståndet. Tredje klicket börjar om.'
              : armerad
              ? `Klicka inuti en plats för att sätta ${vaxter.find((v) => v.id === armerad)?.namn} där.`
              : valt
                ? 'Dra ett hörn för att ändra · klicka det för att runda · klicka en + mellan hörnen för att lägga till ett · ⌥-klicka för att ta bort'
                : 'Dra formen för att flytta · markera den för att ändra hörnen'}
        </p>
        {angra.nastaEtikett && (
          <p className="shrink-0 text-xs text-dis-svag">Ångra: {angra.nastaEtikett}</p>
        )}
      </div>

      {/* Fast höjd på desktop, och flex-none så att flex-basis inte äter upp
          den: annars växer raden med panelens innehåll och hela sidan börjar
          scrolla — då hoppar ritytan under handen medan man ritar. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:h-[72vh] lg:flex-none lg:flex-row">
        <div
          ref={behallareRef}
          data-testid="ritredigering"
          className={`relative min-h-64 flex-1 touch-none overflow-hidden select-none ${
            ritar || armerad || matar ? 'cursor-crosshair' : ''
          }`}
        >
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

              {/* Pågående ritning, med segmentlängder i mono. */}
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
                        style={{ fill: 'var(--color-tra)' }}
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
                      fill="var(--color-botten)"
                      stroke="var(--color-fermob-text)"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              )}

              {/* Måttband */}
              {matPunkter.length > 0 && (
                <g className="pointer-events-none">
                  {matPunkter.map((p, i) => (
                    <circle
                      key={`mat-${i}`}
                      cx={p[0]}
                      cy={p[1]}
                      r={4 * mpp}
                      fill="var(--color-botten)"
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

              {/* Mittpluppar: klicka för att lägga till ett hörn i efterhand. */}
              {valt?.geometri &&
                !ritar &&
                !matar &&
                segmentMitter(valt.geometri.punkter).map((p, i) => (
                  <g key={`mitt-${i}`} data-mitt-index={i} cursor="copy">
                    <circle cx={p[0]} cy={p[1]} r={14 * mpp} fill="transparent" />
                    <circle
                      cx={p[0]}
                      cy={p[1]}
                      r={4.5 * mpp}
                      fill="var(--color-botten)"
                      stroke="var(--color-fermob-text)"
                      strokeOpacity={0.75}
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      d={`M ${p[0] - 2.2 * mpp} ${p[1]} h ${4.4 * mpp} M ${p[0]} ${p[1] - 2.2 * mpp} v ${4.4 * mpp}`}
                      stroke="var(--color-fermob-text)"
                      strokeWidth={1.4}
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                    />
                  </g>
                ))}

              {/* Hörnhandtag. Rund = mjukt hörn, fyrkant = spetsigt. */}
              {valt?.geometri &&
                !ritar &&
                valt.geometri.punkter.map((p, i) => {
                  const rund = arRund(valt.geometri!.runda, i)
                  const r = 6 * mpp
                  return rund ? (
                    <circle
                      key={`horn-${i}`}
                      data-horn-index={i}
                      cx={p[0]}
                      cy={p[1]}
                      r={r}
                      fill="var(--color-lov)"
                      stroke="var(--color-botten)"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      cursor="grab"
                    />
                  ) : (
                    <rect
                      key={`horn-${i}`}
                      data-horn-index={i}
                      x={p[0] - r}
                      y={p[1] - r}
                      width={r * 2}
                      height={r * 2}
                      fill="var(--color-botten)"
                      stroke="var(--color-fermob-text)"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      cursor="grab"
                    />
                  )
                })}
            </svg>
          )}

          {vb && <Skalstock mpp={mpp} />}

          {placeringsfel && (
            <p
              role="alert"
              className="absolute inset-x-3 top-3 rounded-xl border border-fermob-text/40 bg-panel px-4 py-3 text-sm text-tusch"
            >
              {placeringsfel}
            </p>
          )}

          {iTradgarden.length === 0 && !ritar && (
            <p className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto max-w-xs px-6 text-center text-sm/6 text-dis">
              {tradgard.namn} är tom än. Tryck "Rita ny plats" och klicka ut hörnen — börja gärna
              med altanen eller boden.
            </p>
          )}
        </div>

        <aside className="flex w-full min-h-0 flex-col gap-5 overflow-y-auto border-t border-linje p-4 lg:w-80 lg:border-t-0 lg:border-l">
          {valt && !ritar ? (
            <PlatsPanel
              key={valt.id}
              plats={valt}
              antalVaxter={vaxter.filter((v) => v.platsId === valt.id).length}
              onGeometri={sparaGeometri}
              onMinns={angra.minns}
              onTaBort={() => setValtId(undefined)}
            />
          ) : (
            <p className="text-sm text-dis">
              Markera en plats för att ändra namn, typ och mått — eller rita en ny.
            </p>
          )}

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
        </aside>
      </div>
    </div>
  )
}

function mattText(varde: number): string {
  return String(Number(varde.toFixed(2))).replace('.', ',')
}

/** Ritningens mått, redigerbara direkt i verktygsraden. */
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
  const rekt = omslutandeRektangel(plats.geometri?.punkter ?? [])
  const [bredd, setBredd] = useState(mattText(rekt.bredd))
  const [hojd, setHojd] = useState(mattText(rekt.hojd))

  useEffect(() => {
    setBredd(mattText(rekt.bredd))
    setHojd(mattText(rekt.hojd))
  }, [rekt.bredd, rekt.hojd])

  /** Skriver och lägger motsatsen på ångra-stacken. */
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

  function sparaMatt() {
    const nyBredd = tolkaMeter(bredd, 0.1)
    const nyHojd = tolkaMeter(hojd, 0.1)
    const punkter = plats.geometri?.punkter
    if (!punkter || !nyBredd || !nyHojd) {
      setBredd(mattText(rekt.bredd))
      setHojd(mattText(rekt.hojd))
      return
    }
    if (Math.abs(nyBredd - rekt.bredd) < 0.005 && Math.abs(nyHojd - rekt.hojd) < 0.005) return
    onGeometri(plats, skalaTillMatt(punkter, nyBredd, nyHojd), plats.geometri?.runda, 'ändra måtten')
  }

  const antalHorn = plats.geometri?.punkter.length ?? 0
  const allaAr = antalHorn > 0 && (plats.geometri?.runda?.length ?? 0) === antalHorn

  return (
    <div className="flex flex-col gap-4">
      <Falt etikett="Namn">
        <input
          type="text"
          value={namn}
          onChange={(e) => setNamn(e.target.value)}
          onBlur={() => {
            const trimmat = namn.trim()
            if (trimmat && trimmat !== plats.namn) {
              uppdatera({ namn: trimmat }, 'namnbytet', { namn: plats.namn })
            } else if (!trimmat) setNamn(plats.namn)
          }}
          className={inmatningsStil}
        />
      </Falt>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-dis">Typ</span>
        <div className="flex flex-wrap gap-1.5">
          {PLATSTYPER.map((typ) => (
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
          {/* Allt får inte plats i en fast lista — stenparti, kompost, damm. */}
          <Chip vald={!!plats.egenTyp} onClick={() => setSkriverEgenTyp(true)}>
            {plats.egenTyp ? plats.egenTyp : 'Egen…'}
          </Chip>
        </div>
        {skriverEgenTyp && (
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              autoFocus
              defaultValue={plats.egenTyp ?? ''}
              placeholder="Stenparti"
              aria-label="Egen typ"
              onKeyDown={(e) => {
                if (e.key === 'Enter') sparaEgenTyp((e.target as HTMLInputElement).value)
                if (e.key === 'Escape') setSkriverEgenTyp(false)
              }}
              onBlur={(e) => sparaEgenTyp(e.target.value)}
              className={inmatningsStil}
            />
          </div>
        )}
        {plats.egenTyp && (
          <p className="text-xs text-dis-svag">
            Ritas som {platstypEtikett(plats.typ).toLowerCase()}. Byt standardtyp ovan för att
            ändra utseendet.
          </p>
        )}
      </div>

      {/* Kurvor: trädgården har sällan bara raka kanter. */}
      {antalHorn >= 3 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-dis">Kanter</span>
          <div className="flex flex-wrap gap-1.5">
            <Chip
              onClick={() =>
                onGeometri(
                  plats,
                  plats.geometri!.punkter,
                  allaAr ? [] : allaRunda(antalHorn),
                  allaAr ? 'spetsa kanterna' : 'runda kanterna',
                )
              }
            >
              {allaAr ? 'Gör spetsiga' : 'Runda alla'}
            </Chip>
          </div>
          <p className="text-xs text-dis-svag">
            Klicka ett enskilt hörn i ritningen för att runda just det — så blir en rabatt
            D-formad.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-dis">Mått (m)</span>
        <div className="flex items-center gap-1.5">
          <label className="sr-only" htmlFor="plats-bredd">
            Platsens bredd i meter
          </label>
          <input
            id="plats-bredd"
            type="text"
            inputMode="decimal"
            value={bredd}
            onChange={(e) => setBredd(e.target.value)}
            onBlur={sparaMatt}
            className={`${inmatningsStil} mono w-20 py-1.5 text-center text-sm`}
          />
          <span className="text-dis-svag">×</span>
          <label className="sr-only" htmlFor="plats-hojd">
            Platsens höjd i meter
          </label>
          <input
            id="plats-hojd"
            type="text"
            inputMode="decimal"
            value={hojd}
            onChange={(e) => setHojd(e.target.value)}
            onBlur={sparaMatt}
            className={`${inmatningsStil} mono w-20 py-1.5 text-center text-sm`}
          />
        </div>
      </div>

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

      {/* Area och omkrets: hur mycket bark, jord eller kantsten som behövs. */}
      {plats.geometri && (
        <dl className="flex flex-col gap-1 rounded-lg border border-linje px-3 py-2">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-dis-svag">Area</dt>
            <dd className="mono text-sm text-tusch">
              {formatArea(area(formTillPolygon(plats.geometri.punkter, plats.geometri.runda)))}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-dis-svag">Omkrets</dt>
            <dd className="mono text-sm text-tusch">
              {formatMeter(omkrets(formTillPolygon(plats.geometri.punkter, plats.geometri.runda)))}
            </dd>
          </div>
        </dl>
      )}

      <p className="mono text-xs text-dis-svag">
        {antalVaxter === 1 ? '1 växt här' : `${antalVaxter} växter här`}
      </p>

      <div className="border-t border-linje pt-4">
        <TaBortKnapp
          onBekraftad={() => {
            const vaxterDar = vaxter.filter((v) => v.platsId === plats.id)
            const platsFore = plats
            const placeringar = vaxterDar.map((v) => ({
              id: v.id,
              platsId: v.platsId,
              position: v.position,
            }))
            void (async () => {
              const repo = await import('../data/repo')
              repo.taBortPlats(
                uid,
                plats.id,
                vaxterDar,
                handelser.filter((h) => h.platsId === plats.id),
              )
              onTaBort()
            })()
            onMinns('ta bort platsen', () => {
              void (async () => {
                const repo = await import('../data/repo')
                repo.aterskapaPlats(uid, platsFore)
                for (const p of placeringar) {
                  repo.aterstallVaxtPlacering(uid, p.id, p.platsId, p.position)
                }
              })()
            })
          }}
        >
          Ta bort platsen
        </TaBortKnapp>
        <p className="mt-2 text-xs text-dis-svag">
          Växterna här blir kvar — de hamnar under "Utan plats". Går att ångra.
        </p>
      </div>
    </div>
  )
}
