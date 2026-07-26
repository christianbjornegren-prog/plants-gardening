import type { Area, GardenMap, Plant, PunktM } from '../data/types'
import { centroid, punktIPolygon } from './geometri'

export interface VaxtPrick {
  vaxt: Plant
  x: number
  y: number
  /** true om växten har en egen sparad position (annars automatiskt placerad). */
  egenPosition: boolean
}

/**
 * Var växtprickarna ritas:
 * - växt med sparad position → där
 * - växt utan position, vars yta är kopplad till ett kartobjekt → automatiskt
 *   läge kring objektets centroid (deterministiskt, spiral med 0,45 m steg)
 * - övriga växter (t.ex. inne på en fönsterbräda utan kartkoppling) → inte på kartan
 */
export function beraknaPrickar(vaxter: Plant[], ytor: Area[], karta: GardenMap): VaxtPrick[] {
  const objektAvId = new Map(karta.objects.map((objekt) => [objekt.id, objekt]))
  const ytaTillObjekt = new Map<string, string>()
  for (const yta of ytor) {
    if (yta.mapObjectId && objektAvId.has(yta.mapObjectId)) {
      ytaTillObjekt.set(yta.id, yta.mapObjectId)
    }
  }

  const prickar: VaxtPrick[] = []
  const autoRaknare = new Map<string, number>()

  for (const vaxt of vaxter) {
    if (vaxt.position) {
      prickar.push({ vaxt, x: vaxt.position.x, y: vaxt.position.y, egenPosition: true })
      continue
    }
    const objektId = ytaTillObjekt.get(vaxt.areaId)
    if (!objektId) continue
    const objekt = objektAvId.get(objektId)
    if (!objekt || objekt.points.length < 3) continue

    const index = autoRaknare.get(objektId) ?? 0
    autoRaknare.set(objektId, index + 1)
    const [x, y] = autoLage(objekt.points, index)
    prickar.push({ vaxt, x, y, egenPosition: false })
  }
  return prickar
}

/**
 * Deterministisk spiral. Basen ligger strax under centroiden så att prickarna
 * inte landar på objektets namnetikett; utanför polygonen → centroiden.
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
