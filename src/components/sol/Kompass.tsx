import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/**
 * Vridbar kompass: dra i skivan tills N pekar åt det håll norr faktiskt
 * ligger, sett från ritningen. Detta är Solens viktigaste värde — är norr
 * fel blir varje skugga fel utan att det syns — därför en stor, direkt
 * manipulerbar skiva och inte ett gradfält i en dialog.
 */
export function Kompass({
  vinkel,
  onVinkel,
}: {
  /** Grader MEDURS som norr ligger från ritningens uppåt. */
  vinkel: number
  onVinkel: (grader: number) => void
}) {
  const ytaRef = useRef<SVGSVGElement>(null)
  const [drar, setDrar] = useState(false)

  function vinkelFran(e: ReactPointerEvent<SVGSVGElement>): number {
    const rekt = ytaRef.current?.getBoundingClientRect()
    if (!rekt) return vinkel
    const dx = e.clientX - (rekt.left + rekt.width / 2)
    const dy = e.clientY - (rekt.top + rekt.height / 2)
    // atan2 med 0° uppåt, medurs — samma konvention som norrVinkel.
    return Math.round((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        ref={ytaRef}
        width={168}
        height={168}
        viewBox="-84 -84 168 168"
        role="slider"
        aria-label="Norrvinkel"
        aria-valuenow={Math.round(vinkel)}
        aria-valuemin={0}
        aria-valuemax={359}
        tabIndex={0}
        className="cursor-grab touch-none select-none focus-visible:outline-2 focus-visible:outline-orm"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setDrar(true)
          onVinkel(vinkelFran(e))
        }}
        onPointerMove={(e) => drar && onVinkel(vinkelFran(e))}
        onPointerUp={() => setDrar(false)}
        onPointerCancel={() => setDrar(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onVinkel((vinkel + 359) % 360)
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onVinkel((vinkel + 1) % 360)
        }}
      >
        <circle r={78} fill="var(--color-panel)" stroke="var(--color-linje)" strokeWidth={1.5} />
        {Array.from({ length: 24 }, (_, i) => (
          <line
            key={i}
            x1={0}
            y1={-78}
            x2={0}
            y2={i % 6 === 0 ? -68 : -73}
            stroke="var(--color-dis-svag)"
            strokeWidth={i % 6 === 0 ? 1.5 : 1}
            transform={`rotate(${i * 15})`}
          />
        ))}
        <g transform={`rotate(${vinkel})`}>
          {/* Nålen: norrhalvan mörk, sydhalvan ljus — som en riktig kompass. */}
          <path d="M0 -58 L10 0 L-10 0 Z" fill="var(--color-tusch)" />
          <path d="M0 58 L10 0 L-10 0 Z" fill="var(--color-upphojd)" stroke="var(--color-linje)" />
          <text
            y={-40}
            textAnchor="middle"
            className="mono"
            fontSize={13}
            fill="var(--color-panel)"
          >
            N
          </text>
        </g>
        <circle r={3.5} fill="var(--color-tusch)" />
      </svg>
      <p className="mono text-xs text-dis">{Math.round(vinkel)}°</p>
    </div>
  )
}
