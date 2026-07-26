import type { Area, GardenMap, Plant } from '../../data/types'
import { karttypEtikett } from '../../lib/kartstil'
import { LankKnapp } from '../Knapp'
import { SnabbLogg } from '../SnabbLogg'

export type Infoval = { typ: 'objekt'; id: string } | { typ: 'vaxt'; id: string }

/** Kortet som visas när man trycker på ett objekt eller en växtprick. */
export function Infokort({
  val,
  karta,
  ytor,
  vaxter,
  onStang,
}: {
  val: Infoval
  karta: GardenMap
  ytor: Area[]
  vaxter: Plant[]
  onStang: () => void
}) {
  let innehall: React.ReactNode = null

  if (val.typ === 'objekt') {
    const objekt = karta.objects.find((o) => o.id === val.id)
    if (!objekt) return null
    const yta = ytor.find((y) => y.mapObjectId === objekt.id)
    const antal = yta ? vaxter.filter((v) => v.areaId === yta.id).length : 0
    innehall = (
      <>
        <p className="font-display text-lg font-semibold">{objekt.name}</p>
        <p className="text-sm text-panel/60">{karttypEtikett(objekt.type)}</p>
        {objekt.note && <p className="mt-2 text-sm text-panel/80">{objekt.note}</p>}
        {yta && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-panel/70">
              {antal === 1 ? '1 växt bor här.' : `${antal} växter bor här.`}
            </p>
            <LankKnapp to={`/ytor/${yta.id}`}>Öppna ytan</LankKnapp>
          </div>
        )}
      </>
    )
  } else {
    const vaxt = vaxter.find((v) => v.id === val.id)
    if (!vaxt) return null
    const yta = ytor.find((y) => y.id === vaxt.areaId)
    innehall = (
      <>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{vaxt.name}</p>
            {yta && <p className="text-sm text-panel/60">Står i {yta.name}</p>}
          </div>
          <LankKnapp to={`/vaxter/${vaxt.id}`} className="shrink-0">
            Öppna växten
          </LankKnapp>
        </div>
        <div className="mt-3">
          <SnabbLogg plantId={vaxt.id} />
        </div>
      </>
    )
  }

  return (
    <div
      data-testid="infokort"
      className="absolute inset-x-3 bottom-3 z-10 mx-auto max-w-md rounded-lg border border-panel/15 bg-ljus p-4 shadow-lg"
    >
      <button
        type="button"
        aria-label="Stäng"
        onClick={onStang}
        className="absolute -top-4 -right-2 flex size-11 items-center justify-center rounded-full border border-panel/15 bg-ljus text-panel/70 shadow-sm"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path
            d="M2.5 2.5 11.5 11.5 M11.5 2.5 2.5 11.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {innehall}
    </div>
  )
}
