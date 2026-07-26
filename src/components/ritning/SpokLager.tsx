import type { Plats } from '../../data/types'
import { formTillPath } from '../../lib/form'

/**
 * En annan ritning lagd som spöke under den aktuella.
 *
 * Poängen med två ritningar över samma tomt ("Baksidan" och "Baksidan
 * kommande") är att SE skillnaden. Utan överlägg måste man byta fram och
 * tillbaka och lita på minnet.
 */
export function SpokLager({ platser }: { platser: Plats[] }) {
  return (
    <g className="pointer-events-none" aria-hidden>
      {platser
        .filter((p) => (p.geometri?.punkter.length ?? 0) >= 2)
        .map((plats) => (
          <path
            key={`spoke-${plats.id}`}
            d={formTillPath(plats.geometri!.punkter, plats.geometri!.runda)}
            fill="none"
            stroke="var(--color-fermob-text)"
            strokeOpacity={0.7}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        ))}
    </g>
  )
}
