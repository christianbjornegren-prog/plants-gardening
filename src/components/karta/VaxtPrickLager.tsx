import type { CSSProperties } from 'react'
import type { VaxtPrick } from '../../lib/vaxtplacering'

/**
 * Växtprickarna. Varje prick har en osynlig träffyta på ~44 px och en
 * synlig prick med skärmkonstant storlek.
 */
export function VaxtPrickLager({
  prickar,
  mpp,
  animera = false,
  valdId,
  dragen,
}: {
  prickar: VaxtPrick[]
  mpp: number
  animera?: boolean
  valdId?: string
  /** Pågående dragning: ritar den pricken på överridna koordinater. */
  dragen?: { plantId: string; x: number; y: number }
}) {
  return (
    <g>
      {prickar.map((prick, index) => {
        const aktivDrag = dragen?.plantId === prick.vaxt.id
        const x = aktivDrag ? dragen.x : prick.x
        const y = aktivDrag ? dragen.y : prick.y
        const vald = valdId === prick.vaxt.id || aktivDrag
        return (
          <g
            key={prick.vaxt.id}
            data-vaxt-id={prick.vaxt.id}
            className={animera && !aktivDrag ? 'anim-prick' : undefined}
            style={{ '--prick-d': `${1050 + index * 45}ms` } as CSSProperties}
            cursor="grab"
          >
            <circle cx={x} cy={y} r={22 * mpp} fill="transparent" />
            <circle
              cx={x}
              cy={y}
              r={(vald ? 9 : 6.5) * mpp}
              vectorEffect="non-scaling-stroke"
              strokeWidth={1.5}
              style={{
                fill: 'var(--color-orm)',
                stroke: vald ? 'var(--color-fermob)' : 'var(--color-ljus)',
              }}
            />
          </g>
        )
      })}
    </g>
  )
}
