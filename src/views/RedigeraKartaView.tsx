import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { useUid } from '../auth/AuthProvider'
import { Falt, inmatningsStil } from '../components/Falt'
import { KartobjektLager } from '../components/karta/KartobjektLager'
import { useKartYta } from '../components/karta/useKartYta'
import { Knapp, TaBortKnapp } from '../components/Knapp'
import { TillbakaIkon } from '../components/Ikoner'
import { SaknasVy } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import {
  VAXTBARA_TYPER,
  type Area,
  type GardenMap,
  type MapObject,
  type MapObjectType,
  type PunktM,
} from '../data/types'
import { formatMeter, tolkaMeter } from '../lib/format'
import {
  avstand,
  flyttaPunkter,
  omslutandeRektangel,
  snappa,
  snappaPunkt,
} from '../lib/geometri'
import { karttypEtikett, KARTTYPER } from '../lib/kartstil'
import { viewBoxAttribut } from '../lib/viewbox'

export function RedigeraKartaView() {
  const { karta, laddad } = useData()
  if (!laddad) return null
  if (!karta) {
    return <SaknasVy text="Ange tomtens mått på kartsidan först." tillbakaTill="/" />
  }
  return <Redigerare karta={karta} />
}

type Gest =
  | { typ: 'pan'; senastX: number; senastY: number; totalPx: number; objektId?: string }
  | { typ: 'horn'; objektId: string; index: number; flyttad: boolean }
  | {
      typ: 'objekt'
      objektId: string
      startMeter: PunktM
      origPunkter: PunktM[]
      flyttad: boolean
    }

function Redigerare({ karta }: { karta: GardenMap }) {
  const { ytor, vaxter } = useData()
  const uid = useUid()
  const { behallareRef, vb, mpp, tillMeter, panoreraPx } = useKartYta(karta.widthM, karta.heightM)

  const [valtId, setValtId] = useState<string>()
  const [ritar, setRitar] = useState(false)
  const [ritPunkter, setRitPunkter] = useState<PunktM[]>([])
  const [hovrad, setHovrad] = useState<PunktM>()
  const [utkast, setUtkast] = useState<MapObject>()
  const gestRef = useRef<Gest | null>(null)

  const visadKarta: GardenMap = utkast
    ? { ...karta, objects: karta.objects.map((o) => (o.id === utkast.id ? utkast : o)) }
    : karta
  const valt = visadKarta.objects.find((o) => o.id === valtId)

  function persistera(objekt: MapObject) {
    void (async () => {
      const { sparaKartobjekt } = await import('../data/repo')
      sparaKartobjekt(uid, karta, objekt)
    })()
  }

  function avslutaRitning() {
    // Dubbelklick ger två klick på samma ställe — rensa dubbletter på slutet.
    const punkter = ritPunkter.filter(
      (p, i) => i === 0 || avstand(p, ritPunkter[i - 1]!) > 0.05,
    )
    setRitar(false)
    setRitPunkter([])
    setHovrad(undefined)
    if (punkter.length < 3) return
    void (async () => {
      const { nyttObjektId, sparaKartobjekt } = await import('../data/repo')
      const typ: MapObjectType = 'rabatt'
      const antalAvTyp = karta.objects.filter((o) => o.type === typ).length
      const objekt: MapObject = {
        id: nyttObjektId(),
        type: typ,
        name: `${karttypEtikett(typ)} ${antalAvTyp + 1}`,
        points: punkter,
      }
      sparaKartobjekt(uid, karta, objekt)
      setValtId(objekt.id)
    })()
  }

  useEffect(() => {
    if (!ritar) return
    function vidTangent(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setRitar(false)
        setRitPunkter([])
        setHovrad(undefined)
      }
    }
    window.addEventListener('keydown', vidTangent)
    return () => window.removeEventListener('keydown', vidTangent)
  }, [ritar])

  function vidPekareNed(e: ReactPointerEvent<SVGSVGElement>) {
    if (ritar) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const mal = e.target as Element

    const hornEl = mal.closest('[data-horn-index]')
    if (hornEl && valt) {
      gestRef.current = {
        typ: 'horn',
        objektId: valt.id,
        index: Number(hornEl.getAttribute('data-horn-index')),
        flyttad: false,
      }
      return
    }

    const objektEl = mal.closest('[data-objekt-id]')
    const objektId = objektEl?.getAttribute('data-objekt-id') ?? undefined
    if (objektId) {
      const objekt = karta.objects.find((o) => o.id === objektId)
      if (objekt) {
        gestRef.current = {
          typ: 'objekt',
          objektId,
          startMeter: tillMeter(e.clientX, e.clientY),
          origPunkter: objekt.points,
          flyttad: false,
        }
        return
      }
    }
    gestRef.current = { typ: 'pan', senastX: e.clientX, senastY: e.clientY, totalPx: 0 }
  }

  function vidPekareFlytt(e: ReactPointerEvent<SVGSVGElement>) {
    if (ritar) {
      setHovrad(snappaPunkt(tillMeter(e.clientX, e.clientY)))
      return
    }
    const gest = gestRef.current
    if (!gest) return

    if (gest.typ === 'horn') {
      gest.flyttad = true
      const objekt = karta.objects.find((o) => o.id === gest.objektId)
      if (!objekt) return
      const punkt = snappaPunkt(tillMeter(e.clientX, e.clientY))
      const punkter = objekt.points.map((p, i) => (i === gest.index ? punkt : p))
      setUtkast({ ...objekt, points: punkter })
      return
    }

    if (gest.typ === 'objekt') {
      const objekt = karta.objects.find((o) => o.id === gest.objektId)
      if (!objekt) return
      const [mx, my] = tillMeter(e.clientX, e.clientY)
      const dx = snappa(mx - gest.startMeter[0])
      const dy = snappa(my - gest.startMeter[1])
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) gest.flyttad = true
      if (gest.flyttad) {
        setUtkast({ ...objekt, points: flyttaPunkter(gest.origPunkter, dx, dy) })
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

  function vidPekareUpp() {
    if (ritar) {
      return
    }
    const gest = gestRef.current
    gestRef.current = null
    if (!gest) return

    if (gest.typ === 'horn' || gest.typ === 'objekt') {
      if (utkast && gest.flyttad) {
        persistera(utkast)
      } else if (gest.typ === 'objekt' && !gest.flyttad) {
        setValtId(gest.objektId)
      }
      setUtkast(undefined)
      return
    }
    if (gest.typ === 'pan' && gest.totalPx < 8) {
      setValtId(undefined)
    }
  }

  function vidKlick(e: React.MouseEvent<SVGSVGElement>) {
    if (!ritar) return
    const punkt = snappaPunkt(tillMeter(e.clientX, e.clientY))
    setRitPunkter((nu) => [...nu, punkt])
  }

  const ritVisning = hovrad && ritPunkter.length > 0 ? [...ritPunkter, hovrad] : ritPunkter

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-panel/10 px-4 py-2.5">
        <Link
          to="/"
          aria-label="Tillbaka till kartan"
          className="-ml-1 flex size-10 items-center justify-center rounded-md text-panel/70"
        >
          <TillbakaIkon />
        </Link>
        <h1 className="font-display text-lg font-semibold">Redigera kartan</h1>
        <TomtMatt karta={karta} />
        <div className="ml-auto flex items-center gap-2">
          {ritar ? (
            <>
              <p className="hidden text-sm text-panel/60 sm:block">
                Klicka ut hörnen — dubbelklicka för att avsluta.
              </p>
              <Knapp
                onClick={() => {
                  setRitar(false)
                  setRitPunkter([])
                  setHovrad(undefined)
                }}
              >
                Avbryt
              </Knapp>
            </>
          ) : (
            <Knapp
              variant="primar"
              onClick={() => {
                setValtId(undefined)
                setRitar(true)
              }}
            >
              Rita nytt objekt
            </Knapp>
          )}
        </div>
      </div>

      <p className="border-b border-panel/10 px-4 py-1.5 text-xs text-panel/50 md:hidden">
        Kartan redigeras enklast på datorn.
      </p>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          ref={behallareRef}
          data-testid="kartredigering"
          className={`relative min-h-64 flex-1 touch-none overflow-hidden select-none ${
            ritar ? 'cursor-crosshair' : ''
          }`}
        >
          {vb && (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={viewBoxAttribut(vb)}
              onPointerDown={vidPekareNed}
              onPointerMove={vidPekareFlytt}
              onPointerUp={vidPekareUpp}
              onPointerCancel={vidPekareUpp}
              onClick={vidKlick}
              onDoubleClick={avslutaRitning}
            >
              <KartobjektLager karta={visadKarta} mpp={mpp} interaktiv valtObjektId={valtId} />

              {/* Pågående ritning */}
              {ritar && ritVisning.length > 0 && (
                <g className="pointer-events-none">
                  <polyline
                    points={ritVisning.map((p) => p.join(',')).join(' ')}
                    fill="color-mix(in srgb, var(--color-fermob) 12%, transparent)"
                    stroke="var(--color-fermob)"
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="6 4"
                  />
                  {ritPunkter.map((p, i) => (
                    <circle
                      key={i}
                      cx={p[0]}
                      cy={p[1]}
                      r={4 * mpp}
                      fill="var(--color-ljus)"
                      stroke="var(--color-fermob)"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              )}

              {/* Hörnhandtag för valt objekt */}
              {valt &&
                !ritar &&
                valt.points.map((p, i) => (
                  <circle
                    key={`horn-${i}`}
                    data-horn-index={i}
                    cx={p[0]}
                    cy={p[1]}
                    r={6 * mpp}
                    fill="var(--color-ljus)"
                    stroke="var(--color-fermob)"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    cursor="grab"
                  />
                ))}
            </svg>
          )}

          {karta.objects.length === 0 && !ritar && (
            <p className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto max-w-xs text-center text-sm text-panel/55">
              Tomten är tom än. Tryck på "Rita nytt objekt" och klicka ut hörnen — börja gärna
              med altanen eller boden.
            </p>
          )}
        </div>

        {valt && !ritar && (
          <ObjektPanel
            key={valt.id}
            objekt={valt}
            karta={karta}
            ytor={ytor}
            antalVaxter={(ytaId: string) => vaxter.filter((v) => v.areaId === ytaId).length}
            onPersistera={persistera}
            onTaBort={() => {
              const kopplade = ytor.filter((y) => y.mapObjectId === valt.id).map((y) => y.id)
              void (async () => {
                const { taBortKartobjekt } = await import('../data/repo')
                taBortKartobjekt(uid, karta, valt.id, kopplade)
                setValtId(undefined)
              })()
            }}
          />
        )}
      </div>
    </div>
  )
}

/** Tomtens mått, redigerbara direkt i verktygsraden. */
function TomtMatt({ karta }: { karta: GardenMap }) {
  const uid = useUid()
  const [bredd, setBredd] = useState(String(karta.widthM).replace('.', ','))
  const [djup, setDjup] = useState(String(karta.heightM).replace('.', ','))

  useEffect(() => {
    setBredd(String(karta.widthM).replace('.', ','))
    setDjup(String(karta.heightM).replace('.', ','))
  }, [karta.widthM, karta.heightM])

  function spara() {
    const breddM = tolkaMeter(bredd, 2)
    const djupM = tolkaMeter(djup, 2)
    if (!breddM || !djupM) {
      setBredd(String(karta.widthM).replace('.', ','))
      setDjup(String(karta.heightM).replace('.', ','))
      return
    }
    if (breddM === karta.widthM && djupM === karta.heightM) return
    void (async () => {
      const { uppdateraKartaMatt } = await import('../data/repo')
      uppdateraKartaMatt(uid, breddM, djupM)
    })()
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <label className="sr-only" htmlFor="tomt-bredd">
        Tomtens bredd i meter
      </label>
      <input
        id="tomt-bredd"
        type="text"
        inputMode="decimal"
        value={bredd}
        onChange={(e) => setBredd(e.target.value)}
        onBlur={spara}
        className={`${inmatningsStil} w-16 py-1.5 text-center font-mono text-sm`}
      />
      <span className="text-panel/50">×</span>
      <label className="sr-only" htmlFor="tomt-djup">
        Tomtens djup i meter
      </label>
      <input
        id="tomt-djup"
        type="text"
        inputMode="decimal"
        value={djup}
        onChange={(e) => setDjup(e.target.value)}
        onBlur={spara}
        className={`${inmatningsStil} w-16 py-1.5 text-center font-mono text-sm`}
      />
      <span className="text-panel/50">m</span>
    </div>
  )
}

function ObjektPanel({
  objekt,
  karta,
  ytor,
  antalVaxter,
  onPersistera,
  onTaBort,
}: {
  objekt: MapObject
  karta: GardenMap
  ytor: Area[]
  antalVaxter: (ytaId: string) => number
  onPersistera: (objekt: MapObject) => void
  onTaBort: () => void
}) {
  const uid = useUid()
  const [namn, setNamn] = useState(objekt.name)
  const [anteckning, setAnteckning] = useState(objekt.note ?? '')
  const kopplad = ytor.find((y) => y.mapObjectId === objekt.id)
  const rekt = omslutandeRektangel(objekt.points)

  function bytYta(ytaId: string) {
    void (async () => {
      const { kopplaYtaTillObjekt } = await import('../data/repo')
      if (kopplad && kopplad.id !== ytaId) kopplaYtaTillObjekt(uid, kopplad.id, undefined)
      if (ytaId) kopplaYtaTillObjekt(uid, ytaId, objekt.id)
    })()
  }

  function skapaYtaFranObjekt() {
    void (async () => {
      const { kopplaYtaTillObjekt, skapaYta } = await import('../data/repo')
      const nyId = skapaYta(uid, { name: objekt.name })
      kopplaYtaTillObjekt(uid, nyId, objekt.id)
    })()
  }

  return (
    <aside className="flex w-full flex-col gap-4 overflow-y-auto border-t border-panel/10 p-4 md:w-72 md:border-t-0 md:border-l">
      <Falt etikett="Namn">
        <input
          type="text"
          value={namn}
          onChange={(e) => setNamn(e.target.value)}
          onBlur={() => {
            const trimmat = namn.trim()
            if (trimmat && trimmat !== objekt.name) onPersistera({ ...objekt, name: trimmat })
          }}
          className={inmatningsStil}
        />
      </Falt>

      <Falt etikett="Typ">
        <select
          value={objekt.type}
          onChange={(e) => {
            const nyTyp = e.target.value as MapObjectType
            onPersistera({ ...objekt, type: nyTyp })
            // Bara växtbara typer får vara kopplade till en yta (se CLAUDE.md).
            if (!VAXTBARA_TYPER.includes(nyTyp) && kopplad) {
              void (async () => {
                const { kopplaYtaTillObjekt } = await import('../data/repo')
                kopplaYtaTillObjekt(uid, kopplad.id, undefined)
              })()
            }
          }}
          className={inmatningsStil}
        >
          {KARTTYPER.map(({ varde, etikett }) => (
            <option key={varde} value={varde}>
              {etikett}
            </option>
          ))}
        </select>
      </Falt>

      <p className="text-sm text-panel/60">
        Mått:{' '}
        <span className="font-mono text-panel">
          {formatMeter(rekt.bredd)} × {formatMeter(rekt.hojd)}
        </span>
      </p>

      <Falt etikett="Anteckning">
        <textarea
          rows={2}
          value={anteckning}
          onChange={(e) => setAnteckning(e.target.value)}
          onBlur={() => {
            const trimmat = anteckning.trim()
            if ((objekt.note ?? '') !== trimmat) {
              onPersistera({ ...objekt, note: trimmat || undefined })
            }
          }}
          className={inmatningsStil}
        />
      </Falt>

      {VAXTBARA_TYPER.includes(objekt.type) && (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Kopplad yta</span>
        <select
          aria-label="Kopplad yta"
          value={kopplad?.id ?? ''}
          onChange={(e) => bytYta(e.target.value)}
          className={inmatningsStil}
        >
          <option value="">Ingen yta</option>
          {ytor
            .filter((y) => !y.mapObjectId || y.mapObjectId === objekt.id)
            .map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
        </select>
        {kopplad ? (
          <p className="text-xs text-panel/55">
            {antalVaxter(kopplad.id) === 1
              ? '1 växt visas på kartan här.'
              : `${antalVaxter(kopplad.id)} växter visas på kartan här.`}
          </p>
        ) : (
          <button
            type="button"
            onClick={skapaYtaFranObjekt}
            className="self-start text-sm text-orm underline underline-offset-2"
          >
            Skapa yta från objektet
          </button>
        )}
      </div>
      )}

      <div className="mt-2 border-t border-panel/10 pt-4">
        <TaBortKnapp onBekraftad={onTaBort}>Ta bort objektet</TaBortKnapp>
      </div>

      <p className="text-xs text-panel/45">
        {karta.objects.length === 1
          ? 'Detta är kartans enda objekt.'
          : `Kartan har ${karta.objects.length} objekt.`}
      </p>
    </aside>
  )
}
