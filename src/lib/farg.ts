/**
 * Färgmatematik för att kunna VERIFIERA paletten i test i stället för att lita
 * på ögat: OKLCH-krom (kromtaket, se CLAUDE.md) och WCAG-kontrast.
 *
 * OKLab-koefficienterna är Björn Ottossons. Ingen beroendekedja — det är
 * tjugo rader och det ska stå i repot.
 */

export type Rgb = [number, number, number]

function franSrgb(kanal: number): number {
  return kanal <= 0.04045 ? kanal / 12.92 : ((kanal + 0.055) / 1.055) ** 2.4
}

export function hexTillRgb(hex: string): Rgb {
  const rensad = hex.replace('#', '')
  if (rensad.length !== 6) throw new Error(`Ogiltig hex: ${hex}`)
  return [0, 2, 4].map((i) => Number.parseInt(rensad.slice(i, i + 2), 16) / 255) as Rgb
}

export interface Oklch {
  /** Ljushet 0–1. */
  L: number
  /** Krom. Kromtaket i CLAUDE.md är 0,09. */
  C: number
  /** Kulör i grader. */
  H: number
}

export function hexTillOklch(hex: string): Oklch {
  const [R, G, B] = hexTillRgb(hex).map(franSrgb) as Rgb
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return {
    L,
    C: Math.hypot(a, b),
    H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
  }
}

export function relativLuminans(hex: string): number {
  const [R, G, B] = hexTillRgb(hex).map(franSrgb) as Rgb
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

/** WCAG-kontrastkvot, 1–21. */
export function kontrast(a: string, b: string): number {
  const x = relativLuminans(a)
  const y = relativLuminans(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
