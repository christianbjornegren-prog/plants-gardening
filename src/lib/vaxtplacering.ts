import type { Plats, PunktM, Vaxt } from '../data/types'
import { centroid, punktIPolygon } from './geometri'

export interface VaxtPrick {
  vaxt: Vaxt
  x: number
  y: number
  /** true om växten har en egen sparad position (annars automatiskt placerad). */
  egenPosition: boolean
}

/**
 * Var växtprickarna ritas i EN trädgård:
 * - växt vars plats ligger i trädgården och som har sparad position → där
 * - växt utan position, vars plats har geometri → automatiskt läge kring
 *   formens centroid (deterministiskt, spiral med 0,45 m steg)
 * - hemlösa växter och växter på platser utan form (t.ex. köksfönstret) →
 *   inte på ritningen alls
 */
export function beraknaPrickar(vaxter: Vaxt[], platser: Plats[], tradgardId: string): VaxtPrick[] {
  const ritbara = new Map(
    platser
      .filter((p) => p.tradgardId === tradgardId && (p.geometri?.punkter.length ?? 0) >= 3)
      .map((p) => [p.id, p]),
  )

  const prickar: VaxtPrick[] = []
  const autoRaknare = new Map<string, number>()

  for (const vaxt of vaxter) {
    if (!vaxt.platsId) continue
    const plats = ritbara.get(vaxt.platsId)
    if (!plats?.geometri) continue

    if (vaxt.position) {
      prickar.push({ vaxt, x: vaxt.position.x, y: vaxt.position.y, egenPosition: true })
      continue
    }
    const index = autoRaknare.get(plats.id) ?? 0
    autoRaknare.set(plats.id, index + 1)
    const [x, y] = autoLage(plats.geometri.punkter, index)
    prickar.push({ vaxt, x, y, egenPosition: false })
  }
  return prickar
}

/**
 * Deterministisk spiral. Basen ligger strax under centroiden så att prickarna
 * inte landar på platsens namnetikett; utanför polygonen → centroiden.
 */
function autoLage(polygon: PunktM[], index: number): PunktM {
  const [cx, cy] = centroid(polygon)
  const nedanfor: PunktM = [cx, cy + 0.6]
  const bas: PunktM = punktIPolygon(nedanfor, polygon) ? nedanfor : [cx, cy]
  if (index === 0) return bas
  const varv = Math.ceil(index / 6)
  const vinkel = (index % 6) * (Math.PI / 3) + varv * 0.5
  const radie = 0.45 * varv
  const kandidat: PunktM = [bas[0] + Math.cos(vinkel) * radie, bas[1] + Math.sin(vinkel) * radie]
  return punktIPolygon(kandidat, polygon) ? kandidat : [cx, cy]
}

/**
 * Vilken plats en punkt på ritningen hamnar i. Översta träffen vinner
 * (arrayordning = z-ordning) så att ett träd ovanpå en rabatt inte slukas.
 */
export function platsVidPunkt(
  punkt: PunktM,
  platser: Plats[],
  tradgardId: string,
): Plats | undefined {
  return [...platser]
    .reverse()
    .find(
      (p) =>
        p.tradgardId === tradgardId &&
        (p.geometri?.punkter.length ?? 0) >= 3 &&
        punktIPolygon(punkt, p.geometri!.punkter),
    )
}
