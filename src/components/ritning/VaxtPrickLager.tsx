import { useEffect, useState, type CSSProperties } from 'react'
import type { VaxtPrick } from '../../lib/vaxtplacering'

/**
 * Växtprickarna. Varje prick har en osynlig träffyta på ~44 px och en synlig
 * prick med skärmkonstant storlek. Den valda pricken växer och BÄR MINIATYREN
 * av just den plantan — det är kopplingen mellan ritningen och fotona.
 */
export function VaxtPrickLager({
  prickar,
  mpp,
  animera = false,
  valdId,
  dragen,
  fotoRefAvVaxt,
}: {
  prickar: VaxtPrick[]
  mpp: number
  animera?: boolean
  valdId?: string
  /** Pågående dragning: ritar den pricken på överridna koordinater. */
  dragen?: { vaxtId: string; x: number; y: number }
  /** Senaste fotot per växt-id, för miniatyren. */
  fotoRefAvVaxt?: Map<string, string>
}) {
  return (
    <g>
      {prickar.map((prick, index) => {
        const aktivDrag = dragen?.vaxtId === prick.vaxt.id
        const x = aktivDrag ? dragen.x : prick.x
        const y = aktivDrag ? dragen.y : prick.y
        const vald = valdId === prick.vaxt.id || aktivDrag
        const planerad = prick.vaxt.status === 'planerad'
        const fotoRef = fotoRefAvVaxt?.get(prick.vaxt.id)
        const r = (vald ? 17 : 6.5) * mpp

        return (
          <g
            key={prick.vaxt.id}
            data-vaxt-id={prick.vaxt.id}
            className={animera && !aktivDrag ? 'anim-prick' : undefined}
            style={{ '--prick-d': `${1050 + index * 45}ms` } as CSSProperties}
            cursor="grab"
          >
            <circle cx={x} cy={y} r={22 * mpp} fill="transparent" />

            {vald && fotoRef ? (
              <PrickMiniatyr
                fotoRef={fotoRef}
                x={x}
                y={y}
                r={r}
                id={prick.vaxt.id}
                alt={prick.vaxt.namn}
              />
            ) : (
              <circle
                cx={x}
                cy={y}
                r={r}
                vectorEffect="non-scaling-stroke"
                strokeWidth={vald ? 2 : 1.4}
                strokeDasharray={planerad ? '3 3' : undefined}
                style={{
                  fill: planerad ? 'none' : 'var(--color-orm)',
                  stroke: vald ? 'var(--color-fermob-text)' : 'var(--color-panel)',
                }}
              />
            )}
          </g>
        )
      })}
    </g>
  )
}

function PrickMiniatyr({
  fotoRef,
  x,
  y,
  r,
  id,
  alt,
}: {
  fotoRef: string
  x: number
  y: number
  r: number
  id: string
  alt: string
}) {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    let aktiv = true
    void (async () => {
      const { hamtaFotoUrl } = await import('../../lib/photoStore')
      const hittad = await hamtaFotoUrl(fotoRef)
      if (aktiv) setUrl(hittad)
    })()
    return () => {
      aktiv = false
    }
  }, [fotoRef])

  if (!url) {
    return <circle cx={x} cy={y} r={r} style={{ fill: 'var(--color-orm)' }} />
  }

  return (
    <>
      <clipPath id={`prick-${id}`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <image
        href={url}
        x={x - r}
        y={y - r}
        width={r * 2}
        height={r * 2}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#prick-${id})`}
      >
        <title>{alt}</title>
      </image>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeWidth={2}
        style={{ stroke: 'var(--color-fermob-text)' }}
      />
    </>
  )
}
