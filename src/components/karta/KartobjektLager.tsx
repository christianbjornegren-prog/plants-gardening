import type { CSSProperties } from 'react'
import type { GardenMap, MapObject, MapObjectType } from '../../data/types'
import { centroid, omkrets, omslutandeRektangel } from '../../lib/geometri'
import { KARTSTIL } from '../../lib/kartstil'

/** Ritordning för startanimationen: tomtgräns → altan → bod → rabatter → resten. */
const ANIMATIONSPRIO: Partial<Record<MapObjectType, number>> = {
  altan: 0,
  bod: 1,
  rabatt: 2,
  pallkrage: 2,
  gräsmatta: 3,
  häck: 3,
  träd: 4,
  staket: 4,
  annat: 5,
}

function punktStrang(objekt: MapObject): string {
  return objekt.points.map((p) => p.join(',')).join(' ')
}

/**
 * Tomtgräns + alla kartobjekt + namnetiketter. Ren renderare — interaktion
 * sköts av föräldern via data-objekt-id.
 */
export function KartobjektLager({
  karta,
  mpp,
  animera = false,
  valtObjektId,
  interaktiv = false,
}: {
  karta: GardenMap
  /** Meter per skärmpixel — för skärmkonstanta etiketter. */
  mpp: number
  animera?: boolean
  valtObjektId?: string
  interaktiv?: boolean
}) {
  const ritRank = new Map(
    [...karta.objects]
      .sort((a, b) => (ANIMATIONSPRIO[a.type] ?? 5) - (ANIMATIONSPRIO[b.type] ?? 5))
      .map((objekt, index) => [objekt.id, index]),
  )

  return (
    <g>
      <defs>
        <pattern id="trall" patternUnits="userSpaceOnUse" width="0.28" height="0.28">
          <rect
            width="0.28"
            height="0.28"
            style={{ fill: 'color-mix(in srgb, var(--color-tra) 50%, transparent)' }}
          />
          <path
            d="M0.14 0 V0.28"
            style={{ stroke: 'color-mix(in srgb, var(--color-panel) 22%, transparent)' }}
            strokeWidth="0.025"
          />
        </pattern>
      </defs>

      {/* Tomtgränsen. Med non-scaling-stroke räknas dash-mönster i skärm-
          pixlar, så dash-längden sätts till omkretsen i px. Föräldern stänger
          av animera-läget när animationen spelat klart — då försvinner
          dasharrayn helt och konturen är heldragen på alla zoomnivåer. */}
      <polygon
        data-testid="tomtgrans"
        points={`0,0 ${karta.widthM},0 ${karta.widthM},${karta.heightM} 0,${karta.heightM}`}
        vectorEffect="non-scaling-stroke"
        strokeWidth={2}
        strokeLinejoin="round"
        className={animera ? 'anim-objekt' : undefined}
        style={
          {
            fill: 'color-mix(in srgb, white 55%, transparent)',
            stroke: 'var(--color-panel)',
            ...(animera
              ? {
                  strokeDasharray: (2 * (karta.widthM + karta.heightM)) / mpp,
                  strokeDashoffset: (2 * (karta.widthM + karta.heightM)) / mpp,
                  '--rit-d': '0ms',
                  '--fyll-d': '300ms',
                }
              : {}),
          } as CSSProperties
        }
      />

      {karta.objects.map((objekt) => {
        const stil = KARTSTIL[objekt.type]
        const vald = objekt.id === valtObjektId
        const rank = ritRank.get(objekt.id) ?? 0
        const stroke = vald ? 'var(--color-fermob)' : stil.kontur
        const gemensamma = {
          vectorEffect: 'non-scaling-stroke',
          strokeWidth: vald ? 2.5 : 1.5,
          strokeLinejoin: 'round' as const,
          strokeLinecap: 'round' as const,
          'data-objekt-id': objekt.id,
          cursor: interaktiv ? 'pointer' : undefined,
        }

        if (stil.oppen) {
          // Staket m.m. ritas som öppen streckad linje utan fyllnad.
          return (
            <polyline
              key={objekt.id}
              points={punktStrang(objekt)}
              {...gemensamma}
              className={animera ? 'anim-tona' : undefined}
              strokeDasharray="0.45 0.3"
              style={
                {
                  fill: 'none',
                  stroke,
                  '--ton-d': `${250 + rank * 90}ms`,
                } as CSSProperties
              }
            />
          )
        }

        const langdPx = omkrets(objekt.points) / mpp
        return (
          <polygon
            key={objekt.id}
            points={punktStrang(objekt)}
            {...gemensamma}
            className={animera ? 'anim-objekt' : undefined}
            style={
              {
                fill: stil.fyll,
                stroke,
                ...(animera
                  ? {
                      strokeDasharray: langdPx,
                      strokeDashoffset: langdPx,
                      '--rit-d': `${250 + rank * 90}ms`,
                      '--fyll-d': `${620 + rank * 90}ms`,
                    }
                  : {}),
              } as CSSProperties
            }
          />
        )
      })}

      {/* Namnetiketter — bara när objektet är stort nog på skärmen. */}
      {karta.objects.map((objekt) => {
        if (!objekt.name) return null
        const rekt = omslutandeRektangel(objekt.points)
        if (rekt.bredd / mpp < 64 || rekt.hojd / mpp < 26) return null
        const [cx, cy] = centroid(objekt.points)
        const stil = KARTSTIL[objekt.type]
        return (
          <text
            key={`etikett-${objekt.id}`}
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11 * mpp}
            className={`pointer-events-none select-none ${animera ? 'anim-tona' : ''}`}
            style={
              {
                fill: stil.ljusEtikett
                  ? 'var(--color-ljus)'
                  : 'color-mix(in srgb, var(--color-panel) 78%, transparent)',
                '--ton-d': '950ms',
              } as CSSProperties
            }
          >
            {objekt.name}
          </text>
        )
      })}
    </g>
  )
}
