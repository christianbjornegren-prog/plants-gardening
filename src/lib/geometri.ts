import type { PunktM } from '../data/types'

/** Snappar ett metervärde till närmaste steg (0,1 m som standard). Resultatet
 * normaliseras så att flyttalsrester inte läcker in i sparad data. */
export function snappa(varde: number, steg = 0.1): number {
  return Number((Math.round(varde / steg) * steg).toFixed(6))
}

export function snappaPunkt(punkt: PunktM, steg = 0.1): PunktM {
  return [snappa(punkt[0], steg), snappa(punkt[1], steg)]
}

export function begransa(varde: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, varde))
}

export function avstand(a: PunktM, b: PunktM): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

/** Areaviktad polygoncentroid, med medelpunkt som reserv för degenererade fall. */
export function centroid(punkter: PunktM[]): PunktM {
  if (punkter.length === 0) return [0, 0]
  let areaSumma = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < punkter.length; i++) {
    const [x0, y0] = punkter[i]!
    const [x1, y1] = punkter[(i + 1) % punkter.length]!
    const kors = x0 * y1 - x1 * y0
    areaSumma += kors
    cx += (x0 + x1) * kors
    cy += (y0 + y1) * kors
  }
  if (Math.abs(areaSumma) < 1e-9) {
    const summa = punkter.reduce<PunktM>((ack, p) => [ack[0] + p[0], ack[1] + p[1]], [0, 0])
    return [summa[0] / punkter.length, summa[1] / punkter.length]
  }
  const faktor = 1 / (3 * areaSumma)
  return [cx * faktor, cy * faktor]
}

/** Ray casting. Punkter exakt på kanten räknas som utanför-ish — räcker för oss. */
export function punktIPolygon(punkt: PunktM, polygon: PunktM[]): boolean {
  const [px, py] = punkt
  let inne = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!
    const [xj, yj] = polygon[j]!
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inne = !inne
    }
  }
  return inne
}

/** Omkrets av en sluten polygon, i meter. */
export function omkrets(punkter: PunktM[]): number {
  if (punkter.length < 2) return 0
  let summa = 0
  for (let i = 0; i < punkter.length; i++) {
    summa += avstand(punkter[i]!, punkter[(i + 1) % punkter.length]!)
  }
  return summa
}

/**
 * Polygonens area i kvadratmeter (skolformeln). Alltid positiv — ritordningen
 * på hörnen ska inte spela roll.
 */
export function area(punkter: PunktM[]): number {
  if (punkter.length < 3) return 0
  let summa = 0
  for (let i = 0; i < punkter.length; i++) {
    const [x0, y0] = punkter[i]!
    const [x1, y1] = punkter[(i + 1) % punkter.length]!
    summa += x0 * y1 - x1 * y0
  }
  return Math.abs(summa) / 2
}

export interface Rektangel {
  x: number
  y: number
  bredd: number
  hojd: number
}

export function omslutandeRektangel(punkter: PunktM[]): Rektangel {
  if (punkter.length === 0) return { x: 0, y: 0, bredd: 0, hojd: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of punkter) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { x: minX, y: minY, bredd: maxX - minX, hojd: maxY - minY }
}

/** Flyttar alla punkter med (dx, dy). */
export function flyttaPunkter(punkter: PunktM[], dx: number, dy: number): PunktM[] {
  return punkter.map(([x, y]) => [snappa(x + dx, 0.001), snappa(y + dy, 0.001)])
}

/**
 * Skalar polygonen så att dess omslutande rektangel får angivna mått,
 * förankrad i rektangelns övre vänstra hörn. Punkterna snappas till 0,1 m.
 */
export function skalaTillMatt(punkter: PunktM[], nyBredd: number, nyHojd: number): PunktM[] {
  const rekt = omslutandeRektangel(punkter)
  if (rekt.bredd < 1e-9 || rekt.hojd < 1e-9 || nyBredd <= 0 || nyHojd <= 0) return punkter
  return punkter.map(([x, y]) => [
    snappa(rekt.x + ((x - rekt.x) / rekt.bredd) * nyBredd),
    snappa(rekt.y + ((y - rekt.y) / rekt.hojd) * nyHojd),
  ])
}
