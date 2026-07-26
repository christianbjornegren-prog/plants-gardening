import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useUid } from '../auth/AuthProvider'
import { Adresskylt } from '../components/Adresskylt'
import { Falt, inmatningsStil } from '../components/Falt'
import { KartobjektLager } from '../components/karta/KartobjektLager'
import { Infokort, type Infoval } from '../components/karta/Infokort'
import { useKartYta } from '../components/karta/useKartYta'
import { VaxtPrickLager } from '../components/karta/VaxtPrickLager'
import { Knapp, LankKnapp } from '../components/Knapp'
import { useData } from '../data/DataProvider'
import type { GardenMap } from '../data/types'
import { avstand, punktIPolygon, snappaPunkt } from '../lib/geometri'
import { tolkaMeter } from '../lib/format'
import { KARTSTIL } from '../lib/kartstil'
import { beraknaPrickar } from '../lib/vaxtplacering'
import { viewBoxAttribut } from '../lib/viewbox'

export function KartaView() {
  const { karta, laddad } = useData()
  if (!laddad) return null
  if (!karta) return <KartaSetup />
  return <LevandeKarta karta={karta} />
}

/** Första gången: ange tomtens mått, sedan ritas allt skalenligt. */
function KartaSetup() {
  const uid = useUid()
  const [bredd, setBredd] = useState('')
  const [djup, setDjup] = useState('')
  const [fel, setFel] = useState(false)

  function skapa(e: FormEvent) {
    e.preventDefault()
    const breddM = tolkaMeter(bredd, 2)
    const djupM = tolkaMeter(djup, 2)
    if (!breddM || !djupM) {
      setFel(true)
      return
    }
    void (async () => {
      const { skapaKarta } = await import('../data/repo')
      skapaKarta(uid, breddM, djupM)
    })()
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <Adresskylt stor />
      <p className="max-w-xs text-center text-sm/6 text-panel/60">
        Ange tomtens mått, så ritas kartan skalenligt. Måtten går att ändra senare.
      </p>
      <form onSubmit={skapa} className="flex w-full max-w-xs flex-col gap-4">
        <div className="flex gap-3">
          <Falt etikett="Bredd (m)">
            <input
              type="text"
              inputMode="decimal"
              required
              value={bredd}
              onChange={(e) => setBredd(e.target.value)}
              placeholder="18"
              className={`${inmatningsStil} w-full font-mono`}
            />
          </Falt>
          <Falt etikett="Djup (m)">
            <input
              type="text"
              inputMode="decimal"
              required
              value={djup}
              onChange={(e) => setDjup(e.target.value)}
              placeholder="11,5"
              className={`${inmatningsStil} w-full font-mono`}
            />
          </Falt>
        </div>
        {fel && (
          <p className="text-sm text-fermob">Ange måtten i meter, till exempel 18 och 11,5.</p>
        )}
        <Knapp type="submit" variant="primar">
          Skapa kartan
        </Knapp>
      </form>
    </div>
  )
}

/** Startanimationen visas en gång per appstart. */
let startanimationVisad = false

type Gest =
  | { typ: 'pan'; senastX: number; senastY: number; totalPx: number; objektId?: string }
  | { typ: 'pinch'; avstandPx: number }
  | { typ: 'prick'; plantId: string; startX: number; startY: number; flyttad: boolean }

function LevandeKarta({ karta }: { karta: GardenMap }) {
  const { vaxter, ytor } = useData()
  const uid = useUid()
  const { behallareRef, vb, mpp, tillMeter, panoreraPx, zoomaVid } = useKartYta(
    karta.widthM,
    karta.heightM,
  )

  const [animera, setAnimera] = useState(() => !startanimationVisad)
  if (!startanimationVisad) startanimationVisad = true

  // Efter att animationen spelat klart återgår lagren till statiskt läge
  // (utan dasharray) så konturerna är heldragna på alla zoomnivåer.
  useEffect(() => {
    if (!animera) return
    const timer = setTimeout(() => setAnimera(false), 2600)
    return () => clearTimeout(timer)
  }, [animera])

  const [infoval, setInfoval] = useState<Infoval>()
  const [dragen, setDragen] = useState<{ plantId: string; x: number; y: number }>()

  const gestRef = useRef<Gest | null>(null)
  const pekareRef = useRef(new Map<number, { x: number; y: number }>())

  const prickar = beraknaPrickar(vaxter, ytor, karta)

  function slappPrick(plantId: string, x: number, y: number) {
    const vaxt = vaxter.find((v) => v.id === plantId)
    if (!vaxt) return
    const traffat = [...karta.objects]
      .reverse()
      .find((objekt) => !KARTSTIL[objekt.type].oppen && punktIPolygon([x, y], objekt.points))
    const yta = traffat ? ytor.find((y2) => y2.mapObjectId === traffat.id) : undefined
    void (async () => {
      const { flyttaVaxtPaKartan } = await import('../data/repo')
      flyttaVaxtPaKartan(uid, vaxt, x, y, yta?.id)
    })()
  }

  function vidPekareNed(e: ReactPointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pekareRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pekareRef.current.size === 2) {
      const [a, b] = [...pekareRef.current.values()]
      gestRef.current = { typ: 'pinch', avstandPx: Math.hypot(a!.x - b!.x, a!.y - b!.y) }
      setDragen(undefined)
      return
    }

    const mal = e.target as Element
    const prickEl = mal.closest('[data-vaxt-id]')
    if (prickEl) {
      gestRef.current = {
        typ: 'prick',
        plantId: prickEl.getAttribute('data-vaxt-id') ?? '',
        startX: e.clientX,
        startY: e.clientY,
        flyttad: false,
      }
      return
    }
    gestRef.current = {
      typ: 'pan',
      senastX: e.clientX,
      senastY: e.clientY,
      totalPx: 0,
      objektId: mal.closest('[data-objekt-id]')?.getAttribute('data-objekt-id') ?? undefined,
    }
  }

  function vidPekareFlytt(e: ReactPointerEvent<SVGSVGElement>) {
    const gest = gestRef.current
    if (!gest) return
    if (pekareRef.current.has(e.pointerId)) {
      pekareRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    if (gest.typ === 'pinch') {
      if (pekareRef.current.size < 2) return
      const [a, b] = [...pekareRef.current.values()]
      const nytt = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      if (nytt > 10) {
        const mitt = tillMeter((a!.x + b!.x) / 2, (a!.y + b!.y) / 2)
        zoomaVid(gest.avstandPx / nytt, mitt)
        gest.avstandPx = nytt
      }
      return
    }

    if (gest.typ === 'prick') {
      if (!gest.flyttad && avstand([gest.startX, gest.startY], [e.clientX, e.clientY]) > 6) {
        gest.flyttad = true
      }
      if (gest.flyttad) {
        const [x, y] = snappaPunkt(tillMeter(e.clientX, e.clientY))
        setDragen({ plantId: gest.plantId, x, y })
      }
      return
    }

    // pan
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

    if (gest?.typ === 'pinch') {
      if (pekareRef.current.size === 1) {
        const [kvar] = [...pekareRef.current.values()]
        gestRef.current = { typ: 'pan', senastX: kvar!.x, senastY: kvar!.y, totalPx: 99 }
      } else if (pekareRef.current.size === 0) {
        gestRef.current = null
      }
      return
    }

    if (gest?.typ === 'prick') {
      if (gest.flyttad) {
        const [x, y] = snappaPunkt(tillMeter(e.clientX, e.clientY))
        setDragen(undefined)
        slappPrick(gest.plantId, x, y)
      } else {
        setInfoval({ typ: 'vaxt', id: gest.plantId })
      }
      gestRef.current = null
      return
    }

    if (gest?.typ === 'pan') {
      if (gest.totalPx < 8) {
        setInfoval(gest.objektId ? { typ: 'objekt', id: gest.objektId } : undefined)
      }
      gestRef.current = null
    }
  }

  return (
    <div
      ref={behallareRef}
      data-testid="karta"
      className="relative flex-1 touch-none overflow-hidden select-none"
    >
      {vb && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={viewBoxAttribut(vb)}
          onPointerDown={vidPekareNed}
          onPointerMove={vidPekareFlytt}
          onPointerUp={vidPekareUpp}
          onPointerCancel={vidPekareUpp}
        >
          <KartobjektLager
            karta={karta}
            mpp={mpp}
            animera={animera}
            interaktiv
            valtObjektId={infoval?.typ === 'objekt' ? infoval.id : undefined}
          />
          <VaxtPrickLager
            prickar={prickar}
            mpp={mpp}
            animera={animera}
            valdId={infoval?.typ === 'vaxt' ? infoval.id : undefined}
            dragen={dragen}
          />
        </svg>
      )}

      <div className="pointer-events-none absolute top-3 left-3">
        <Adresskylt />
      </div>
      <LankKnapp to="/karta/redigera" className="absolute top-3 right-3 bg-ljus/90">
        Redigera
      </LankKnapp>

      {infoval && (
        <Infokort
          val={infoval}
          karta={karta}
          ytor={ytor}
          vaxter={vaxter}
          onStang={() => setInfoval(undefined)}
        />
      )}
    </div>
  )
}
