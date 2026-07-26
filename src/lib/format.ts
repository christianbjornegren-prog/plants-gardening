/** Formatering med native Intl, alltid sv-SE. Metervärden sätts alltid i mono (font-mono). */

const meterFormat = new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

/** 4.2 → "4,2 m" */
export function formatMeter(varde: number): string {
  return `${meterFormat.format(varde)} m`
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
