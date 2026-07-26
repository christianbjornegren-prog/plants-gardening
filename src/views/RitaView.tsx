import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useUid } from '../auth/AuthProvider'
import { Chip } from '../components/Chip'
import { Falt, inmatningsStil } from '../components/Falt'
import { TillbakaIkon } from '../components/Ikoner'
import { Knapp, TaBortKnapp } from '../components/Knapp'
import { PlatsLager } from '../components/ritning/PlatsLager'
import { Skalstock } from '../components/ritning/Skalstock'
import { useRitYta } from '../components/ritning/useRitYta'
import { VaxtPrickLager } from '../components/ritning/VaxtPrickLager'
import { SaknasVy } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import type { PlatsFalt } from '../data/repo'
import { PLATSTYPER, type Plats, type PlatsTyp, type PunktM, type Tradgard } from '../data/types'
import { platstypEtikett } from '../lib/etiketter'
import { formatMeter, tolkaMeter } from '../lib/format'
import {
  avstand,
  flyttaPunkter,
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
 * Här ritas formerna och här sitter hon en kväll och placerar ut veckans
 * fotograferingar.
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
    return <SaknasVy text="Ange måtten på en trädgård först." tillbakaTill="/ritning" />
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
  const uid = useUid()
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
  const gestRef = useRef<Gest | null>(null)

  const iTradgarden = platser.filter((p) => p.tradgardId === tradgard.id)
  const visade = utkast ? iTradgarden.map((p) => (p.id === utkast.id ? utkast : p)) : iTradgarden
  const valt = visade.find((p) => p.id === valtId)
  const prickar = beraknaPrickar(vaxter, platser, tradgard.id)
  const fotoAvVaxt = senasteFotoPerVaxt(handelser)
  const utanPosition = vaxter.filter(
    (v) => !prickar.some((p) => p.vaxt.id === v.id) && v.status !== 'planerad',
  )

  function sparaGeometri(plats: Plats, punkter: PunktM[]) {
    void (async () => {
      const repo = await import('../data/repo')
      repo.sparaPlatsGeometri(uid, plats.id, punkter)
    })()
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
    if (ritar || armerad) return
    if (gestRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const mal = e.target as Element

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
      gest.flyttad = true
      const plats = iTradgarden.find((p) => p.id === gest.platsId)
      if (!plats?.geometri) return
      const punkt = snappaPunkt(tillMeter(e.clientX, e.clientY))
      const punkter = plats.geometri.punkter.map((p, i) => (i === gest.index ? punkt : p))
      setUtkast({ ...plats, geometri: { punkter } })
      return
    }

    if (gest.typ === 'form') {
      const plats = iTradgarden.find((p) => p.id === gest.platsId)
      if (!plats) return
      const [mx, my] = tillMeter(e.clientX, e.clientY)
      const dx = snappa(mx - gest.startMeter[0])
      const dy = snappa(my - gest.startMeter[1])
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) gest.flyttad = true
      if (gest.flyttad) {
        setUtkast({ ...plats, geometri: { punkter: flyttaPunkter(gest.origPunkter, dx, dy) } })
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

    if (gest.typ === 'horn' || gest.typ === 'form') {
      if (utkast?.geometri && gest.flyttad) {
        sparaGeometri(utkast, utkast.geometri.punkter)
      } else if (gest.typ === 'form' && !gest.flyttad) {
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
    if (armerad) {
      const plats = platsVidPunkt(punkt, platser, tradgard.id)
      if (!plats) return
      const vaxt = vaxter.find((v) => v.id === armerad)
      if (!vaxt) return
      void (async () => {
        const repo = await import('../data/repo')
        repo.flyttaVaxtPaRitningen(uid, vaxt, punkt[0], punkt[1], plats.id)
      })()
      setArmerad(undefined)
    }
  }

  const ritVisning = hovrad && ritPunkter.length > 0 ? [...ritPunkter, hovrad] : ritPunkter

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-linje px-4 py-2.5">
        <Link
          to="/ritning"
          aria-label="Tillbaka till ritningen"
          className="-ml-1 flex size-11 items-center justify-center rounded-lg text-dis hover:text-ljus"
        >
          <TillbakaIkon />
        </Link>
        <h1 className="font-display text-lg font-semibold text-ljus">{tradgard.namn}</h1>
        <TomtMatt tradgard={tradgard} />
        <div className="ml-auto flex items-center gap-2">
          {ritar ? (
            <>
              <p className="hidden text-sm text-dis sm:block">
                Klicka ut hörnen · Enter avslutar · Esc ångrar
              </p>
              <Knapp onClick={avbrytRitning}>Avbryt</Knapp>
            </>
          ) : (
            <Knapp
              variant="primar"
              onClick={() => {
                setValtId(undefined)
                setArmerad(undefined)
                setRitar(true)
              }}
            >
              Rita ny plats
            </Knapp>
          )}
        </div>
      </div>

      <p className="border-b border-linje px-4 py-1.5 text-xs text-dis-svag lg:hidden">
        Ritningen görs enklast på datorn.
      </p>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div
          ref={behallareRef}
          data-testid="ritredigering"
          className={`relative min-h-64 flex-1 touch-none overflow-hidden select-none ${
            ritar || armerad ? 'cursor-crosshair' : ''
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
                    stroke="var(--color-fermob-lyft)"
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
                      stroke="var(--color-fermob-lyft)"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              )}

              {/* Hörnhandtag för vald plats */}
              {valt?.geometri &&
                !ritar &&
                valt.geometri.punkter.map((p, i) => (
                  <circle
                    key={`horn-${i}`}
                    data-horn-index={i}
                    cx={p[0]}
                    cy={p[1]}
                    r={6 * mpp}
                    fill="var(--color-botten)"
                    stroke="var(--color-fermob-lyft)"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    cursor="grab"
                  />
                ))}
            </svg>
          )}

          {vb && <Skalstock mpp={mpp} />}

          {armerad && (
            <div className="absolute inset-x-3 top-3 rounded-xl border border-fermob-lyft/40 bg-panel px-4 py-3 text-sm text-ljus">
              Klicka på en plats för att sätta{' '}
              <span className="font-medium">{vaxter.find((v) => v.id === armerad)?.namn}</span> där.
            </div>
          )}

          {iTradgarden.length === 0 && !ritar && (
            <p className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto max-w-xs px-6 text-center text-sm/6 text-dis">
              {tradgard.namn} är tom än. Tryck "Rita ny plats" och klicka ut hörnen — börja gärna
              med altanen eller boden.
            </p>
          )}
        </div>

        <aside className="flex w-full flex-col gap-5 overflow-y-auto border-t border-linje p-4 lg:w-80 lg:border-t-0 lg:border-l">
          {valt && !ritar ? (
            <PlatsPanel
              key={valt.id}
              plats={valt}
              antalVaxter={vaxter.filter((v) => v.platsId === valt.id).length}
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
                      onClick={() => setArmerad(armerad === v.id ? undefined : v.id)}
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

/** Trädgårdens mått, redigerbara direkt i verktygsraden. */
function TomtMatt({ tradgard }: { tradgard: Tradgard }) {
  const uid = useUid()
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
        Trädgårdens bredd i meter
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
        Trädgårdens djup i meter
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
  onTaBort,
}: {
  plats: Plats
  antalVaxter: number
  onTaBort: () => void
}) {
  const uid = useUid()
  const { vaxter, handelser } = useData()
  const [namn, setNamn] = useState(plats.namn)
  const [anteckning, setAnteckning] = useState(plats.anteckning ?? '')
  const rekt = omslutandeRektangel(plats.geometri?.punkter ?? [])
  const [bredd, setBredd] = useState(mattText(rekt.bredd))
  const [hojd, setHojd] = useState(mattText(rekt.hojd))

  useEffect(() => {
    setBredd(mattText(rekt.bredd))
    setHojd(mattText(rekt.hojd))
  }, [rekt.bredd, rekt.hojd])

  function uppdatera(falt: Partial<PlatsFalt>) {
    void (async () => {
      const repo = await import('../data/repo')
      repo.uppdateraPlats(uid, plats.id, falt)
    })()
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
    void (async () => {
      const repo = await import('../data/repo')
      repo.sparaPlatsGeometri(uid, plats.id, skalaTillMatt(punkter, nyBredd, nyHojd))
    })()
  }

  return (
    <div className="flex flex-col gap-4">
      <Falt etikett="Namn">
        <input
          type="text"
          value={namn}
          onChange={(e) => setNamn(e.target.value)}
          onBlur={() => {
            const trimmat = namn.trim()
            if (trimmat && trimmat !== plats.namn) uppdatera({ namn: trimmat })
            else if (!trimmat) setNamn(plats.namn)
          }}
          className={inmatningsStil}
        />
      </Falt>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-dis">Typ</span>
        <div className="flex flex-wrap gap-1.5">
          {PLATSTYPER.map((typ) => (
            <Chip key={typ} vald={typ === plats.typ} onClick={() => uppdatera({ typ })}>
              {platstypEtikett(typ)}
            </Chip>
          ))}
        </div>
      </div>

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
        onClick={() => uppdatera({ status: plats.status === 'planerad' ? 'finns' : 'planerad' })}
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
              uppdatera({ anteckning: trimmat || undefined })
            }
          }}
          className={inmatningsStil}
        />
      </Falt>

      <p className="mono text-xs text-dis-svag">
        {antalVaxter === 1 ? '1 växt här' : `${antalVaxter} växter här`}
      </p>

      <div className="border-t border-linje pt-4">
        <TaBortKnapp
          onBekraftad={() => {
            void (async () => {
              const repo = await import('../data/repo')
              repo.taBortPlats(
                uid,
                plats.id,
                vaxter.filter((v) => v.platsId === plats.id),
                handelser.filter((h) => h.platsId === plats.id),
              )
              onTaBort()
            })()
          }}
        >
          Ta bort platsen
        </TaBortKnapp>
        <p className="mt-2 text-xs text-dis-svag">
          Växterna här blir kvar — de hamnar under "Utan plats".
        </p>
      </div>
    </div>
  )
}
