import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { useUid } from '../auth/AuthProvider'
import { Adresskylt } from '../components/Adresskylt'
import { FotoBild } from '../components/FotoBild'
import { Ark } from '../components/Ark'
import { Chip } from '../components/Chip'
import { Falt, inmatningsStil } from '../components/Falt'
import { HandelseKnappar } from '../components/HandelseKnappar'
import { Knapp, LankKnapp } from '../components/Knapp'
import { PilIkon } from '../components/Ikoner'
import { PlaceraVaxtArk } from '../components/ritning/PlaceraVaxtArk'
import { PlatsLager } from '../components/ritning/PlatsLager'
import { Skalstock } from '../components/ritning/Skalstock'
import { useRitYta } from '../components/ritning/useRitYta'
import { VaxtPrickLager } from '../components/ritning/VaxtPrickLager'
import { useData } from '../data/DataProvider'
import { usePlacera } from '../data/PlaceraProvider'
import type { Plats, Tradgard } from '../data/types'
import { antalVaxter, platstypEtikett } from '../lib/etiketter'
import { tolkaMeter } from '../lib/format'
import { handelserForVaxt, senasteFotoPerVaxt } from '../lib/handelser'
import { avstand, snappaPunkt } from '../lib/geometri'
import { beraknaPrickar, platsVidPunkt } from '../lib/vaxtplacering'
import { viewBoxAttribut } from '../lib/viewbox'

/** Startanimationen visas en gång per appstart. */
let startanimationVisad = false

export function RitningView() {
  const { tradgardar, platser, laddad } = useData()
  const [valdId, setValdId] = useState<string>()
  const [visaNy, setVisaNy] = useState(false)

  if (!laddad) return null
  if (tradgardar.length === 0) return null

  // Standard: första trädgården som faktiskt har något ritat. Annars första
  // med mått. Så landar man aldrig på en tom ritning i onödan.
  const medInnehall = tradgardar.find(
    (t) => t.widthM !== undefined && platser.some((p) => p.tradgardId === t.id && p.geometri),
  )
  const medMatt = tradgardar.find((t) => t.widthM !== undefined)
  const vald = tradgardar.find((t) => t.id === valdId) ?? medInnehall ?? medMatt ?? tradgardar[0]!

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="dolj-scroll flex gap-2 overflow-x-auto border-b border-linje px-4 py-2.5">
        {tradgardar.map((t) => (
          <Chip key={t.id} vald={t.id === vald.id} onClick={() => setValdId(t.id)}>
            {t.namn}
          </Chip>
        ))}
        {/* Flera ritningar över samma tomt: "Baksidan" som den ser ut nu,
            "Baksidan kommande" som den ska bli. */}
        <Chip onClick={() => setVisaNy(true)}>+ Ny ritning</Chip>
        {/* Egen wrapper: knappens egen `inline-flex` vinner annars över `hidden`,
            och Redigera dyker upp i mobilen där ritläget inte hör hemma. */}
        {vald.widthM !== undefined && (
          <div className="ml-auto hidden shrink-0 lg:block">
            <LankKnapp to={`/ritning/rita?tradgard=${vald.id}`} className="min-h-9">
              Redigera
            </LankKnapp>
          </div>
        )}
      </div>

      {vald.widthM === undefined || vald.heightM === undefined ? (
        <UtanRitning tradgard={vald} />
      ) : (
        <LevandeRitning key={vald.id} tradgard={vald} />
      )}

      <NyRitningArk
        oppen={visaNy}
        onOppenChange={setVisaNy}
        forslag={vald.widthM ? { bredd: vald.widthM, djup: vald.heightM ?? 0 } : undefined}
        onSkapad={setValdId}
      />
    </div>
  )
}

/** Ny ritning — t.ex. "Baksidan kommande" bredvid nuläget. */
function NyRitningArk({
  oppen,
  onOppenChange,
  forslag,
  onSkapad,
}: {
  oppen: boolean
  onOppenChange: (o: boolean) => void
  forslag?: { bredd: number; djup: number }
  onSkapad: (id: string) => void
}) {
  const uid = useUid()
  const { tradgardar } = useData()
  const [namn, setNamn] = useState('')
  const [bredd, setBredd] = useState('')
  const [djup, setDjup] = useState('')
  const [fel, setFel] = useState<string>()

  function skapa(e: FormEvent) {
    e.preventDefault()
    const trimmat = namn.trim()
    if (!trimmat) {
      setFel('Ge ritningen ett namn.')
      return
    }
    const breddM = tolkaMeter(bredd || String(forslag?.bredd ?? ''), 2)
    const djupM = tolkaMeter(djup || String(forslag?.djup ?? ''), 2)
    if (!breddM || !djupM) {
      setFel('Ange måtten i meter, t.ex. 18 och 11,5.')
      return
    }
    void (async () => {
      const repo = await import('../data/repo')
      const id = repo.skapaTradgard(uid, {
        namn: trimmat,
        ordning: tradgardar.length,
        widthM: breddM,
        heightM: djupM,
      })
      setNamn('')
      setBredd('')
      setDjup('')
      setFel(undefined)
      onOppenChange(false)
      onSkapad(id)
    })()
  }

  return (
    <Ark
      oppen={oppen}
      onOppenChange={onOppenChange}
      titel="Ny ritning"
      beskrivning="En egen ritning över samma tomt — bra för att skissa om utan att röra nuläget."
    >
      <form onSubmit={skapa} className="flex flex-col gap-4">
        <Falt etikett="Namn">
          <input
            type="text"
            autoFocus
            value={namn}
            onChange={(e) => setNamn(e.target.value)}
            placeholder="Baksidan kommande"
            className={inmatningsStil}
          />
        </Falt>
        <div className="flex gap-3">
          <Falt etikett="Bredd (m)">
            <input
              type="text"
              inputMode="decimal"
              value={bredd}
              onChange={(e) => setBredd(e.target.value)}
              placeholder={forslag ? String(forslag.bredd).replace('.', ',') : '18'}
              className={`${inmatningsStil} mono`}
            />
          </Falt>
          <Falt etikett="Djup (m)">
            <input
              type="text"
              inputMode="decimal"
              value={djup}
              onChange={(e) => setDjup(e.target.value)}
              placeholder={forslag ? String(forslag.djup).replace('.', ',') : '11,5'}
              className={`${inmatningsStil} mono`}
            />
          </Falt>
        </div>
        {fel && (
          <p role="alert" className="text-sm text-fermob-lyft">
            {fel}
          </p>
        )}
        <Knapp type="submit" variant="primar">
          Skapa ritningen
        </Knapp>
      </form>
    </Ark>
  )
}

/** Inomhus har ingen ritning — och det är avsiktligt, inte en lucka. */
function UtanRitning({ tradgard }: { tradgard: Tradgard }) {
  const uid = useUid()
  const { platser, vaxter } = useData()
  const [visaMatt, setVisaMatt] = useState(false)
  const [bredd, setBredd] = useState('')
  const [djup, setDjup] = useState('')
  const [fel, setFel] = useState(false)

  const har = platser.filter((p) => p.tradgardId === tradgard.id)

  function spara(e: FormEvent) {
    e.preventDefault()
    const breddM = tolkaMeter(bredd, 2)
    const djupM = tolkaMeter(djup, 2)
    if (!breddM || !djupM) {
      setFel(true)
      return
    }
    void (async () => {
      const repo = await import('../data/repo')
      repo.sparaTradgardMatt(uid, tradgard.id, breddM, djupM)
    })()
  }

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-10">
      <h2 className="font-display text-xl font-semibold text-ljus">{tradgard.namn}</h2>
      <p className="mt-2 text-sm/6 text-dis">
        Här finns ingen ritning. Platserna listas ändå — en fönsterbräda behöver inga
        koordinater.
      </p>

      {har.length > 0 && (
        <ul className="mt-6 flex flex-col gap-1">
          {har.map((plats) => (
            <li key={plats.id}>
              <Link
                to={`/platser/${plats.id}`}
                className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-linje px-3 text-sm text-ljus hover:bg-panel"
              >
                <span className="truncate">{plats.namn}</span>
                <span className="mono shrink-0 text-xs text-dis-svag">
                  {antalVaxter(vaxter.filter((v) => v.platsId === plats.id).length)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 border-t border-linje pt-6">
        {visaMatt ? (
          <form onSubmit={spara} className="flex flex-col gap-4">
            <p className="text-sm text-dis">Ange måtten, så ritas allt skalenligt.</p>
            <div className="flex gap-3">
              <Falt etikett="Bredd (m)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={bredd}
                  onChange={(e) => setBredd(e.target.value)}
                  placeholder="18"
                  className={`${inmatningsStil} mono`}
                />
              </Falt>
              <Falt etikett="Djup (m)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={djup}
                  onChange={(e) => setDjup(e.target.value)}
                  placeholder="11,5"
                  className={`${inmatningsStil} mono`}
                />
              </Falt>
            </div>
            {fel && <p className="text-sm text-fermob-lyft">Ange måtten i meter, t.ex. 18 och 11,5.</p>}
            <Knapp type="submit" variant="primar">
              Skapa ritningen
            </Knapp>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setVisaMatt(true)}
            className="text-sm text-lov underline underline-offset-4"
          >
            Rita {tradgard.namn} — ange måtten
          </button>
        )}
      </div>
    </div>
  )
}

type Gest =
  | { typ: 'pan'; pekarId: number; senastX: number; senastY: number; totalPx: number; platsId?: string }
  | { typ: 'pinch'; pekarIds: [number, number]; avstandPx: number }
  | { typ: 'prick'; pekarId: number; vaxtId: string; startX: number; startY: number; flyttad: boolean }

type Val = { typ: 'plats'; id: string } | { typ: 'vaxt'; id: string }

function LevandeRitning({ tradgard }: { tradgard: Tradgard }) {
  const { platser, vaxter, handelser } = useData()
  const uid = useUid()
  const placera = usePlacera()
  const { behallareRef, vb, mpp, tillMeter, panoreraPx, zoomaVid } = useRitYta(
    tradgard.widthM ?? 0,
    tradgard.heightM ?? 0,
  )

  const [animera, setAnimera] = useState(() => !startanimationVisad)
  if (!startanimationVisad) startanimationVisad = true

  useEffect(() => {
    if (!animera) return
    const timer = setTimeout(() => setAnimera(false), 2600)
    return () => clearTimeout(timer)
  }, [animera])

  const [val, setVal] = useState<Val>()
  const [dragen, setDragen] = useState<{ vaxtId: string; x: number; y: number }>()
  const [placeraI, setPlaceraI] = useState<Plats>()

  const gestRef = useRef<Gest | null>(null)
  const pekareRef = useRef(new Map<number, { x: number; y: number }>())

  const iTradgarden = platser.filter((p) => p.tradgardId === tradgard.id)
  const prickar = beraknaPrickar(vaxter, platser, tradgard.id)
  const fotoAvVaxt = senasteFotoPerVaxt(handelser)

  function slappPrick(vaxtId: string, x: number, y: number) {
    const vaxt = vaxter.find((v) => v.id === vaxtId)
    if (!vaxt) return
    const plats = platsVidPunkt([x, y], platser, tradgard.id)
    void (async () => {
      const repo = await import('../data/repo')
      repo.flyttaVaxtPaRitningen(uid, vaxt, x, y, plats?.id)
    })()
  }

  /** Aktivt placeringsuppdrag från ett växtkort: nästa tryck placerar växten. */
  function fullfoljPlacering(x: number, y: number): boolean {
    if (!placera.uppdrag) return false
    const plats = platsVidPunkt([x, y], platser, tradgard.id)
    if (!plats) return false
    const vaxt = vaxter.find((v) => v.id === placera.uppdrag!.vaxtId)
    if (!vaxt) return false
    void (async () => {
      const repo = await import('../data/repo')
      repo.flyttaVaxtPaRitningen(uid, vaxt, x, y, plats.id)
    })()
    placera.avbryt()
    setVal({ typ: 'vaxt', id: vaxt.id })
    return true
  }

  function vidPekareNed(e: ReactPointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pekareRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const gest = gestRef.current

    // Andra fingret under pan/prick → övergå till pinch. Fler fingrar än två
    // ignoreras (handflata, tredje finger) — pågående gest får inte kapas.
    if (gest && gest.typ !== 'pinch' && pekareRef.current.size === 2) {
      const ids = [...pekareRef.current.keys()] as [number, number]
      const [a, b] = [...pekareRef.current.values()]
      gestRef.current = {
        typ: 'pinch',
        pekarIds: ids,
        avstandPx: Math.hypot(a!.x - b!.x, a!.y - b!.y),
      }
      setDragen(undefined)
      return
    }
    if (gest) return

    const mal = e.target as Element
    const prickEl = mal.closest('[data-vaxt-id]')
    if (prickEl) {
      gestRef.current = {
        typ: 'prick',
        pekarId: e.pointerId,
        vaxtId: prickEl.getAttribute('data-vaxt-id') ?? '',
        startX: e.clientX,
        startY: e.clientY,
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
      platsId: mal.closest('[data-plats-id]')?.getAttribute('data-plats-id') ?? undefined,
    }
  }

  function vidPekareFlytt(e: ReactPointerEvent<SVGSVGElement>) {
    const gest = gestRef.current
    if (!gest) return
    if (pekareRef.current.has(e.pointerId)) {
      pekareRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    if (gest.typ === 'pinch') {
      if (!gest.pekarIds.includes(e.pointerId)) return
      const a = pekareRef.current.get(gest.pekarIds[0])
      const b = pekareRef.current.get(gest.pekarIds[1])
      if (!a || !b) return
      const nytt = Math.hypot(a.x - b.x, a.y - b.y)
      if (nytt > 10) {
        const mitt = tillMeter((a.x + b.x) / 2, (a.y + b.y) / 2)
        zoomaVid(gest.avstandPx / nytt, mitt)
        gest.avstandPx = nytt
      }
      return
    }

    if (e.pointerId !== gest.pekarId) return

    if (gest.typ === 'prick') {
      if (!gest.flyttad && avstand([gest.startX, gest.startY], [e.clientX, e.clientY]) > 6) {
        gest.flyttad = true
      }
      if (gest.flyttad) {
        const [x, y] = snappaPunkt(tillMeter(e.clientX, e.clientY))
        setDragen({ vaxtId: gest.vaxtId, x, y })
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
    pekareRef.current.delete(e.pointerId)
    const gest = gestRef.current
    if (!gest) return

    if (gest.typ === 'pinch') {
      if (!gest.pekarIds.includes(e.pointerId)) return
      const kvarId = gest.pekarIds.find((id) => id !== e.pointerId)
      const kvar = kvarId !== undefined ? pekareRef.current.get(kvarId) : undefined
      gestRef.current =
        kvarId !== undefined && kvar
          ? { typ: 'pan', pekarId: kvarId, senastX: kvar.x, senastY: kvar.y, totalPx: 99 }
          : null
      return
    }

    if (e.pointerId !== gest.pekarId) return

    if (gest.typ === 'prick') {
      if (gest.flyttad) {
        const [x, y] = snappaPunkt(tillMeter(e.clientX, e.clientY))
        setDragen(undefined)
        slappPrick(gest.vaxtId, x, y)
      } else {
        setVal({ typ: 'vaxt', id: gest.vaxtId })
      }
      gestRef.current = null
      return
    }

    if (gest.totalPx < 8) {
      const [x, y] = snappaPunkt(tillMeter(e.clientX, e.clientY))
      if (!fullfoljPlacering(x, y)) {
        setVal(gest.platsId ? { typ: 'plats', id: gest.platsId } : undefined)
      }
    }
    gestRef.current = null
  }

  /** Avbruten gest (samtal, kant-svep …): commit ALDRIG — koordinaterna är opålitliga. */
  function vidPekareAvbruten(e: ReactPointerEvent<SVGSVGElement>) {
    pekareRef.current.delete(e.pointerId)
    const gest = gestRef.current
    if (!gest) return
    if (gest.typ === 'pinch' ? gest.pekarIds.includes(e.pointerId) : gest.pekarId === e.pointerId) {
      setDragen(undefined)
      gestRef.current = null
    }
  }

  const valdPlats = val?.typ === 'plats' ? iTradgarden.find((p) => p.id === val.id) : undefined
  const valdVaxt = val?.typ === 'vaxt' ? vaxter.find((v) => v.id === val.id) : undefined

  return (
    <div
      ref={behallareRef}
      data-testid="ritning"
      className="relative flex-1 touch-none overflow-hidden select-none"
    >
      {vb && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={viewBoxAttribut(vb)}
          onPointerDown={vidPekareNed}
          onPointerMove={vidPekareFlytt}
          onPointerUp={vidPekareUpp}
          onPointerCancel={vidPekareAvbruten}
        >
          <PlatsLager
            tradgard={tradgard}
            platser={iTradgarden}
            mpp={mpp}
            animera={animera}
            interaktiv
            valdPlatsId={val?.typ === 'plats' ? val.id : undefined}
          />
          <VaxtPrickLager
            prickar={prickar}
            mpp={mpp}
            animera={animera}
            valdId={val?.typ === 'vaxt' ? val.id : undefined}
            dragen={dragen}
            fotoRefAvVaxt={fotoAvVaxt}
          />
        </svg>
      )}

      <div className="pointer-events-none absolute top-3 left-3">
        <Adresskylt />
      </div>
      {vb && <Skalstock mpp={mpp} />}

      {placera.uppdrag && (
        <div className="absolute inset-x-3 top-3 flex items-center gap-3 rounded-xl border border-fermob-lyft/40 bg-panel px-4 py-3">
          <p className="flex-1 text-sm text-ljus">
            Tryck där <span className="font-medium">{placera.uppdrag.vaxtNamn}</span> står.
          </p>
          <button
            type="button"
            onClick={placera.avbryt}
            className="min-h-9 px-2 text-sm text-dis hover:text-ljus"
          >
            Avbryt
          </button>
        </div>
      )}

      {iTradgarden.length === 0 && !placera.uppdrag && (
        <p className="pointer-events-none absolute inset-x-6 top-1/3 mx-auto max-w-xs text-center text-sm/6 text-dis">
          {tradgard.namn} är oritad än. Formerna ritas enklast på datorn.
        </p>
      )}

      {/* Platsens ark */}
      <Ark
        oppen={valdPlats !== undefined}
        onOppenChange={(o) => !o && setVal(undefined)}
        titel={valdPlats?.namn ?? ''}
        beskrivning={valdPlats ? platstypEtikett(valdPlats.typ) : undefined}
      >
        {valdPlats && (
          <div className="flex flex-col gap-5">
            {/* Vilka växter som står här är det man vill veta när man trycker
                på en form — inte bara hur många. */}
            <section>
              <h3 className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
                  Växter här
                </span>
                <span className="mono shrink-0 text-xs text-dis-svag">
                  {antalVaxter(vaxter.filter((v) => v.platsId === valdPlats.id).length)}
                </span>
              </h3>
              {vaxter.filter((v) => v.platsId === valdPlats.id).length === 0 ? (
                <p className="text-sm text-dis">Inga växter här än.</p>
              ) : (
                <ul className="grid grid-cols-4 gap-2">
                  {vaxter
                    .filter((v) => v.platsId === valdPlats.id)
                    .map((v) => (
                      <li key={v.id}>
                        <Link to={`/vaxter/${v.id}`} className="flex flex-col gap-1">
                          <FotoBild
                            fotoRef={fotoAvVaxt.get(v.id)}
                            alt={v.namn}
                            className={`aspect-square w-full rounded-lg ${
                              v.status === 'planerad' ? 'opacity-60 ring-1 ring-linje' : ''
                            }`}
                          />
                          <span className="truncate text-[11px] text-ljus">{v.namn}</span>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </section>
            <HandelseKnappar
              platsId={valdPlats.id}
              handelser={handelser.filter((h) => h.platsId === valdPlats.id)}
            />
            <Knapp onClick={() => setPlaceraI(valdPlats)}>Lägg till växt här</Knapp>
            <Link
              to={`/platser/${valdPlats.id}`}
              className="inline-flex items-center gap-1.5 self-start text-sm text-lov underline underline-offset-4"
            >
              Öppna platsen
              <PilIkon width={14} height={14} />
            </Link>
          </div>
        )}
      </Ark>

      {/* Växtens ark */}
      <Ark
        oppen={valdVaxt !== undefined}
        onOppenChange={(o) => !o && setVal(undefined)}
        titel={valdVaxt?.namn ?? ''}
        beskrivning={
          valdVaxt?.platsId
            ? platser.find((p) => p.id === valdVaxt.platsId)?.namn
            : 'Utan plats'
        }
      >
        {valdVaxt && (
          <div className="flex flex-col gap-5">
            <HandelseKnappar
              vaxtId={valdVaxt.id}
              platsId={valdVaxt.platsId}
              handelser={handelserForVaxt(handelser, valdVaxt.id)}
            />
            <Link
              to={`/vaxter/${valdVaxt.id}`}
              className="inline-flex items-center gap-1.5 self-start text-sm text-lov underline underline-offset-4"
            >
              Öppna kortet
              <PilIkon width={14} height={14} />
            </Link>
          </div>
        )}
      </Ark>

      {placeraI && (
        <PlaceraVaxtArk
          plats={placeraI}
          oppen
          onOppenChange={(o) => {
            if (!o) {
              setPlaceraI(undefined)
              setVal(undefined)
            }
          }}
        />
      )}
    </div>
  )
}
