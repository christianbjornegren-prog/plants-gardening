import type { SoltimmarRaster } from '../../lib/soltimmar'

/**
 * Soltimmar som mörker: ju färre timmar, desto tätare slöja över rutan.
 * Ritningen lyser igenom där solen når — kartan läggs OVANPÅ, den ersätter
 * ingenting. Fullt solbelysta rutor ritas inte alls.
 */
export function Varmekarta({ raster }: { raster: SoltimmarRaster }) {
  if (raster.maxTimmar <= 0) return null
  const rutor = []
  for (let rad = 0; rad < raster.rader; rad++) {
    for (let kolumn = 0; kolumn < raster.kolumner; kolumn++) {
      const timmar = raster.timmar[rad * raster.kolumner + kolumn]!
      const andel = timmar / raster.maxTimmar
      if (andel > 0.97) continue
      rutor.push(
        <rect
          key={`${rad}-${kolumn}`}
          x={kolumn * raster.rutaM}
          y={rad * raster.rutaM}
          width={raster.rutaM}
          height={raster.rutaM}
          opacity={0.55 * (1 - andel)}
        />,
      )
    }
  }
  return (
    <g style={{ fill: 'var(--color-tusch)' }} className="pointer-events-none">
      {rutor}
    </g>
  )
}
