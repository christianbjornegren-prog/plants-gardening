import type { PunktM } from '../data/types'

/**
 * Former med kurvor.
 *
 * En trädgård har sällan bara raka kanter. Varje hörn kan därför märkas som
 * RUNT eller SPETSIGT. Runda hörn får tangenter (Catmull-Rom), spetsiga blir
 * riktiga knäckar. En rabatt formad som bokstaven D är fyra punkter där de två
 * på högersidan är runda och de två till vänster spetsiga.
 *
 * Punkterna är sanningen — kurvan härleds. Det gör att mått, snap och
 * dragning fungerar precis som förut.
 */

/** Catmull-Rom med spänning 0,5. Klassiskt värde; högre ger öglor. */
const TANGENT = 1 / 6

/**
 * Tangenten begränsas till en andel av det egna segmentet.
 *
 * Utan detta blir kurvan fel så fort två grannsegment har mycket olika längd:
 * tangenten räknas på avståndet mellan hörnets GRANNAR, så ett kort segment
 * får en tangent längre än sig självt och kurvan slår en ögla. Det syntes som
 * en liten krumelur vid ett hörn.
 */
const MAX_ANDEL = 0.42

function begransadTangent(fran: PunktM, mot: PunktM, dx: number, dy: number): PunktM {
  const langd = Math.hypot(dx, dy)
  if (langd < 1e-9) return [fran[0], fran[1]]
  const tak = MAX_ANDEL * Math.hypot(mot[0] - fran[0], mot[1] - fran[1])
  const skala = tak > 0 && langd > tak ? tak / langd : 1
  return [fran[0] + dx * skala, fran[1] + dy * skala]
}

export function arRund(runda: number[] | undefined, index: number): boolean {
  return runda?.includes(index) ?? false
}

export function vaxlaRunt(runda: number[] | undefined, index: number): number[] {
  const nu = runda ?? []
  return nu.includes(index) ? nu.filter((i) => i !== index) : [...nu, index].sort((a, b) => a - b)
}

/** Alla index, för "runda alla hörn". */
export function allaRunda(antalPunkter: number): number[] {
  return Array.from({ length: antalPunkter }, (_, i) => i)
}

function vid(punkter: PunktM[], i: number, sluten: boolean): PunktM {
  const n = punkter.length
  if (sluten) return punkter[((i % n) + n) % n]!
  return punkter[Math.min(Math.max(i, 0), n - 1)]!
}

interface Segment {
  fran: PunktM
  c1: PunktM
  c2: PunktM
  till: PunktM
}

function segment(
  punkter: PunktM[],
  runda: number[] | undefined,
  i: number,
  sluten: boolean,
): Segment {
  const p0 = vid(punkter, i - 1, sluten)
  const p1 = vid(punkter, i, sluten)
  const p2 = vid(punkter, i + 1, sluten)
  const p3 = vid(punkter, i + 2, sluten)
  const n = punkter.length

  // Spetsigt hörn = ingen tangent, alltså kontrollpunkt i hörnet självt.
  const c1: PunktM = arRund(runda, ((i % n) + n) % n)
    ? begransadTangent(p1, p2, (p2[0] - p0[0]) * TANGENT, (p2[1] - p0[1]) * TANGENT)
    : [p1[0], p1[1]]
  const c2: PunktM = arRund(runda, (((i + 1) % n) + n) % n)
    ? begransadTangent(p2, p1, -(p3[0] - p1[0]) * TANGENT, -(p3[1] - p1[1]) * TANGENT)
    : [p2[0], p2[1]]

  return { fran: p1, c1, c2, till: p2 }
}

function segmenten(punkter: PunktM[], runda: number[] | undefined, sluten: boolean): Segment[] {
  const antal = sluten ? punkter.length : punkter.length - 1
  return Array.from({ length: Math.max(antal, 0) }, (_, i) => segment(punkter, runda, i, sluten))
}

const tal = (v: number) => Number(v.toFixed(4))

/** SVG-path. Rena raksträckor skrivs som L så att pathen inte blir onödigt tung. */
export function formTillPath(
  punkter: PunktM[],
  runda?: number[],
  sluten = true,
): string {
  if (punkter.length === 0) return ''
  if (punkter.length === 1) return `M ${tal(punkter[0]![0])} ${tal(punkter[0]![1])}`

  const delar = [`M ${tal(punkter[0]![0])} ${tal(punkter[0]![1])}`]
  for (const s of segmenten(punkter, runda, sluten)) {
    const rak =
      s.c1[0] === s.fran[0] && s.c1[1] === s.fran[1] && s.c2[0] === s.till[0] && s.c2[1] === s.till[1]
    delar.push(
      rak
        ? `L ${tal(s.till[0])} ${tal(s.till[1])}`
        : `C ${tal(s.c1[0])} ${tal(s.c1[1])}, ${tal(s.c2[0])} ${tal(s.c2[1])}, ${tal(s.till[0])} ${tal(s.till[1])}`,
    )
  }
  if (sluten) delar.push('Z')
  return delar.join(' ')
}

function pa(s: Segment, t: number): PunktM {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [
    a * s.fran[0] + b * s.c1[0] + c * s.c2[0] + d * s.till[0],
    a * s.fran[1] + b * s.c1[1] + c * s.c2[1] + d * s.till[1],
  ]
}

/**
 * Kurvan samplad till en tät polygon. Används för träffytor, centroid och
 * omkrets — annars skulle ett tryck bredvid en utbuktande kant missa.
 * Raka segment behöver inga mellanpunkter.
 */
export function formTillPolygon(
  punkter: PunktM[],
  runda?: number[],
  sluten = true,
  perSegment = 12,
): PunktM[] {
  if (punkter.length < 3) return punkter
  const ut: PunktM[] = []
  for (const s of segmenten(punkter, runda, sluten)) {
    const rak =
      s.c1[0] === s.fran[0] && s.c1[1] === s.fran[1] && s.c2[0] === s.till[0] && s.c2[1] === s.till[1]
    ut.push(s.fran)
    if (!rak) {
      for (let k = 1; k < perSegment; k++) ut.push(pa(s, k / perSegment))
    }
  }
  if (!sluten) ut.push(punkter[punkter.length - 1]!)
  return ut
}
