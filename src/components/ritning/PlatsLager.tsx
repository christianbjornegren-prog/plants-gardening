import type { CSSProperties } from 'react'
import type { Plats, PunktM, Tradgard } from '../../data/types'
import { centroid, omkrets, omslutandeRektangel } from '../../lib/geometri'
import { RITPRIO, RITSTIL, TOMTGRANS_VIKT, TUSCH } from '../../lib/ritstil'
import { Hatchning } from './Hatchning'

function punktStrang(punkter: PunktM[]): string {
  return punkter.map((p) => p.join(',')).join(' ')
}

/**
 * Tomtgräns + alla platser med form + namnetiketter. Ren renderare —
 * interaktion sköts av vyn via data-plats-id.
 *
 * Linjeviktshierarkin (tomtgräns → byggnad → plantering) är inte dekoration;
 * den är det som får ritningen att läsas som en ritning.
 */
export function PlatsLager({
  tradgard,
  platser,
  mpp,
  animera = false,
  valdPlatsId,
  interaktiv = false,
}: {
  tradgard: Tradgard
  platser: Plats[]
  /** Meter per skärmpixel — för skärmkonstanta etiketter. */
  mpp: number
  animera?: boolean
  valdPlatsId?: string
  interaktiv?: boolean
}) {
  const breddM = tradgard.widthM ?? 0
  const hojdM = tradgard.heightM ?? 0
  const medForm = platser.filter((p) => (p.geometri?.punkter.length ?? 0) >= 2)

  const ritRank = new Map(
    [...medForm]
      .sort((a, b) => RITPRIO[a.typ] - RITPRIO[b.typ])
      .map((plats, index) => [plats.id, index]),
  )

  return (
    <g>
      <Hatchning />

      {/* Tomtgränsen. Med non-scaling-stroke räknas dash-mönster i skärm-
          pixlar, så dash-längden sätts till omkretsen i px. Vyn stänger av
          animera-läget när animationen spelat klart — då försvinner
          dasharrayn helt och konturen är heldragen på alla zoomnivåer. */}
      <polygon
        data-testid="tomtgrans"
        points={`0,0 ${breddM},0 ${breddM},${hojdM} 0,${hojdM}`}
        vectorEffect="non-scaling-stroke"
        strokeWidth={TOMTGRANS_VIKT}
        strokeLinejoin="round"
        className={animera ? 'anim-objekt' : undefined}
        style={
          {
            fill: 'color-mix(in srgb, var(--color-panel) 55%, var(--color-botten))',
            stroke: TUSCH,
            ...(animera
              ? {
                  strokeDasharray: (2 * (breddM + hojdM)) / mpp,
                  strokeDashoffset: (2 * (breddM + hojdM)) / mpp,
                  '--rit-d': '0ms',
                  '--fyll-d': '300ms',
                }
              : {}),
          } as CSSProperties
        }
      />

      {medForm.map((plats) => {
        const punkter = plats.geometri!.punkter
        const stil = RITSTIL[plats.typ]
        const vald = plats.id === valdPlatsId
        const planerad = plats.status === 'planerad'
        const rank = ritRank.get(plats.id) ?? 0
        const stroke = vald ? 'var(--color-fermob-lyft)' : stil.kontur
        const gemensamma = {
          vectorEffect: 'non-scaling-stroke' as const,
          strokeWidth: vald ? stil.vikt + 1 : stil.vikt,
          strokeLinejoin: 'round' as const,
          strokeLinecap: 'round' as const,
          'data-plats-id': plats.id,
          cursor: interaktiv ? 'pointer' : undefined,
        }

        // Planerat ritas streckat — ritningskonvention, gratis semantik.
        const streck = planerad ? '7 5' : stil.streckad ? '0.45 0.3' : undefined

        if (stil.oppen) {
          return (
            <polyline
              key={plats.id}
              points={punktStrang(punkter)}
              {...gemensamma}
              className={animera ? 'anim-tona' : undefined}
              strokeDasharray={streck ?? '0.45 0.3'}
              style={{ fill: 'none', stroke, '--ton-d': `${250 + rank * 90}ms` } as CSSProperties}
            />
          )
        }

        const langdPx = omkrets(punkter) / mpp
        return (
          <polygon
            key={plats.id}
            points={punktStrang(punkter)}
            {...gemensamma}
            className={animera ? 'anim-objekt' : undefined}
            strokeDasharray={planerad ? streck : undefined}
            style={
              {
                fill: planerad ? 'none' : stil.fyll,
                stroke,
                ...(animera && !planerad
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

      {/* Namnen SATTA I ritningen: versaler, spärrade, i trä-tonen.
          Visas bara när formen är stor nog på skärmen. */}
      {medForm.map((plats) => {
        if (!plats.namn) return null
        const punkter = plats.geometri!.punkter
        const rekt = omslutandeRektangel(punkter)
        if (rekt.bredd / mpp < 74 || rekt.hojd / mpp < 26) return null
        // Namnet får aldrig rinna ut ur sin form. Grov breddgissning räcker:
        // versal spärrad text i 9,5 px ≈ 7 px per tecken.
        if (plats.namn.length * 7 > (rekt.bredd / mpp) * 0.92) return null
        const [cx, cy] = centroid(punkter)
        const stil = RITSTIL[plats.typ]
        return (
          <text
            key={`etikett-${plats.id}`}
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9.5 * mpp}
            letterSpacing={1.1 * mpp}
            className={`pointer-events-none select-none ${animera ? 'anim-tona' : ''}`}
            style={
              {
                fill: stil.etikett ?? 'var(--color-tra)',
                fontWeight: 500,
                textTransform: 'uppercase',
                '--ton-d': '950ms',
              } as CSSProperties
            }
          >
            {plats.namn.toUpperCase()}
          </text>
        )
      })}
    </g>
  )
}
