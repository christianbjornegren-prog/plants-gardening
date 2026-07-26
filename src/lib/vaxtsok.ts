/**
 * Namnförslag när man skriver in en växt.
 *
 * Detta är INTE en artdatabas. Listan innehåller namn — svenskt, latinskt och
 * de vanligaste smeknamnen — och ingenting annat. Ingen skötselinformation,
 * inga zoner, inga såddtider. Syftet är att slippa stava "Hylotelephium" och
 * att två plantor av samma sort får samma namn så listan går att söka i.
 *
 * Fri text vinner alltid. Förslagen är ett erbjudande, aldrig ett krav — heter
 * hennes buske "Mormors ros" så heter den det.
 */

export interface VaxtNamn {
  /** Svenskt namn, det som skrivs in. */
  sv: string
  /** Latinskt namn — hamnar i fältet Latinskt namn om man tar förslaget. */
  lat: string
  /** Grov grupp: perenn, buske, träd… Visas som liten etikett i listan. */
  kat: string
  /** Alternativa svenska namn man kan tänkas söka på. */
  alt?: string[]
}

/**
 * Jämförbar form: gemener, utan diakriter. Så hittar "hortensia" både
 * "Hortensia" och "Hortènsia", och "aeaeoe"-varianter spelar ingen roll.
 */
export function normalisera(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/** Lägre poäng = bättre träff. Exakt före början-på före någonstans-i. */
function poang(kandidat: string, fraga: string): number | undefined {
  if (kandidat === fraga) return 0
  if (kandidat.startsWith(fraga)) return 1
  // Början av ett senare ord: "vinbär" ska hitta "Svarta vinbär".
  if (kandidat.includes(` ${fraga}`)) return 2
  if (kandidat.includes(fraga)) return 3
  return undefined
}

export const MAX_FORSLAG = 8

/**
 * Söker på svenskt namn, latinskt namn och alternativnamn. Svenskt namn väger
 * tyngst — det är det man skriver — latin sist.
 */
export function sokVaxtnamn(
  namn: readonly VaxtNamn[],
  fraga: string,
  max = MAX_FORSLAG,
): VaxtNamn[] {
  const q = normalisera(fraga)
  if (q.length < 2) return []

  const traffar: { post: VaxtNamn; rank: number }[] = []
  for (const post of namn) {
    const kandidater: [string, number][] = [
      [post.sv, 0],
      ...(post.alt ?? []).map((a): [string, number] => [a, 4]),
      [post.lat, 8],
    ]
    let bast: number | undefined
    for (const [text, vikt] of kandidater) {
      const p = poang(normalisera(text), q)
      if (p !== undefined && (bast === undefined || p + vikt < bast)) bast = p + vikt
    }
    if (bast !== undefined) traffar.push({ post, rank: bast })
  }

  traffar.sort((a, b) => a.rank - b.rank || a.post.sv.localeCompare(b.post.sv, 'sv'))
  return traffar.slice(0, max).map((t) => t.post)
}

let cache: VaxtNamn[] | undefined
let pagar: Promise<VaxtNamn[]> | undefined

/**
 * Laddas först när någon börjar skriva. 40 kB namn ska inte ligga i
 * startbunten — appen öppnas för att titta, inte för att lägga till.
 */
export function laddaVaxtnamn(): Promise<VaxtNamn[]> {
  if (cache) return Promise.resolve(cache)
  pagar ??= import('../data/vaxtnamn.json').then((m) => {
    cache = m.default as VaxtNamn[]
    return cache
  })
  return pagar
}
