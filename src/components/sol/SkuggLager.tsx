import type { PunktM } from '../../data/types'
import { skuggpolygoner } from '../../lib/skugga'
import type { Skuggare } from '../../lib/soltimmar'

/**
 * Skuggorna vid ETT ögonblick. Alla delytor ritas i en grupp med
 * gruppopacitet — överlappande skuggor blir då jämnt mörka i stället för
 * dubbelt så mörka, och ingen polygonunion behöver räknas ut.
 */
export function SkuggLager({
  skuggare,
  azimut,
  hojd,
  norrVinkel,
}: {
  skuggare: Skuggare[]
  azimut: number
  hojd: number
  norrVinkel: number
}) {
  if (hojd <= 0) return null
  return (
    <g opacity={0.28} style={{ fill: 'var(--color-tusch)' }} className="pointer-events-none">
      {skuggare.map((s, i) =>
        skuggpolygoner(s.punkter, s.hojdM, azimut, hojd, norrVinkel).map((yta, j) => (
          <polygon key={`${i}-${j}`} points={yta.map(([x, y]) => `${x},${y}`).join(' ')} />
        )),
      )}
    </g>
  )
}

/** Punktlista → SVG-points, för skuggkällornas rektanglar. */
export function tillPoints(punkter: PunktM[]): string {
  return punkter.map(([x, y]) => `${x},${y}`).join(' ')
}
