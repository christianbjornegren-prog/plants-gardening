/** Formatering med native Intl, alltid sv-SE. Metervärden sätts alltid i mono (font-mono). */

const meterFormat = new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

/** 4.2 → "4,2 m" */
export function formatMeter(varde: number): string {
  return `${meterFormat.format(varde)} m`
}

/** Tolkar "12,5" eller "12.5" som meter. undefined om ogiltigt eller orimligt. */
export function tolkaMeter(text: string, min = 0.1, max = 200): number | undefined {
  const varde = Number.parseFloat(text.replace(',', '.'))
  if (!Number.isFinite(varde) || varde < min || varde > max) return undefined
  return varde
}

const datumFormat = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long' })
const datumMedArFormat = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function samradag(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** "i dag", "i går", "14 maj" eller "14 maj 2025" beroende på avstånd till idag. */
export function formatDatum(datum: Date, idag: Date = new Date()): string {
  if (samradag(datum, idag)) return 'i dag'
  const igar = new Date(idag)
  igar.setDate(igar.getDate() - 1)
  if (samradag(datum, igar)) return 'i går'
  return datum.getFullYear() === idag.getFullYear()
    ? datumFormat.format(datum)
    : datumMedArFormat.format(datum)
}

const kortFormat = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' })
const manadArFormat = new Intl.DateTimeFormat('sv-SE', { month: 'short', year: 'numeric' })

/** "14 maj" / "14 maj 2025" — under bilderna i fototidslinjen, alltid i mono. */
export function formatDatumKort(datum: Date, idag: Date = new Date()): string {
  const text = kortFormat.format(datum).replace('.', '')
  return datum.getFullYear() === idag.getFullYear() ? text : `${text} ${datum.getFullYear()}`
}

/**
 * "≈ maj 2026" — för migrerade foton vars exakta datum inte gick att återskapa.
 * Hellre ett ärligt ungefär än ett påhittat datum i en journal.
 */
export function formatOsakertDatum(datum: Date): string {
  return `≈ ${manadArFormat.format(datum).replace('.', '')}`
}

/** "3 dagar sedan" / "4 månader sedan" — grovt, för "inte fotad på länge". */
export function formatSedan(dagar: number): string {
  if (dagar < 1) return 'i dag'
  if (dagar === 1) return '1 dag sedan'
  if (dagar < 60) return `${dagar} dagar sedan`
  const manader = Math.round(dagar / 30)
  if (manader < 24) return `${manader} månader sedan`
  return `${Math.round(dagar / 365)} år sedan`
}
