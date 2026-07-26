import type { PlatsTyp } from '../data/types'

/**
 * Ritningens material. En ritning skiljer sig från en wireframe på tre saker:
 * hatchning, linjeviktshierarki och satt typografi. Här bor de två första.
 * Se CLAUDE.md → Signaturmomentet.
 */

function ton(token: string, procent: number): string {
  return `color-mix(in srgb, var(--color-${token}) ${procent}%, transparent)`
}

/** Tusch på mörk botten är ljust. Trä-tonen är ritningens bläck. */
export const TUSCH = 'var(--color-tra)'
export const TUSCH_SVAG = ton('tra', 62)
export const GRONT_TUSCH = ton('lov', 78)

export interface PlatsStil {
  /** Fyllnad: hatchmönster (url(#…)) eller tonad token. */
  fyll: string
  kontur: string
  /** Linjevikt i SKÄRMPIXLAR (non-scaling-stroke). Hierarkin är hela poängen. */
  vikt: number
  /** Öppen form utan fyllnad, ritas som linje (staket). */
  oppen?: boolean
  /** Streckad kontur. */
  streckad?: boolean
  /** Etikettens färg — mörka ytor bär ljus text. */
  etikett?: string
}

export const RITSTIL: Record<PlatsTyp, PlatsStil> = {
  // Byggnader: grövst efter tomtgränsen, tät hatchning.
  bod: { fyll: 'url(#h-bygg)', kontur: TUSCH, vikt: 1.8, etikett: 'var(--color-tra)' },
  altan: { fyll: 'url(#h-trall)', kontur: TUSCH, vikt: 1.8, etikett: 'var(--color-tra)' },

  // Planteringar: tunnare linje, grön ton.
  rabatt: { fyll: 'url(#h-rabatt)', kontur: GRONT_TUSCH, vikt: 1.2, etikett: 'var(--color-lov)' },
  pallkrage: { fyll: 'url(#h-pallkrage)', kontur: TUSCH_SVAG, vikt: 1.4, etikett: 'var(--color-tra)' },
  gräsmatta: { fyll: 'url(#h-gras)', kontur: GRONT_TUSCH, vikt: 1, etikett: 'var(--color-lov)' },
  häck: { fyll: 'url(#h-hack)', kontur: GRONT_TUSCH, vikt: 1.2, etikett: 'var(--color-lov)' },
  träd: { fyll: 'url(#h-trad)', kontur: GRONT_TUSCH, vikt: 1.2, etikett: 'var(--color-lov)' },

  // Mark och vatten.
  stenparti: { fyll: 'url(#h-stenparti)', kontur: TUSCH_SVAG, vikt: 1.2, etikett: 'var(--color-tra)' },
  grus: { fyll: 'url(#h-grus)', kontur: TUSCH_SVAG, vikt: 1, etikett: 'var(--color-tra)' },
  vatten: { fyll: 'url(#h-vatten)', kontur: GRONT_TUSCH, vikt: 1.2, etikett: 'var(--color-lov)' },

  // Linjeobjekt.
  staket: { fyll: 'none', kontur: TUSCH_SVAG, vikt: 1.4, oppen: true, streckad: true },

  annat: { fyll: 'url(#h-annat)', kontur: TUSCH_SVAG, vikt: 1.2, etikett: 'var(--color-tra)' },
}

/** Tomtgränsen är alltid grövst — den håller ihop hela ritningen. */
export const TOMTGRANS_VIKT = 2.4

/** Ritordning för tuschanimationen: tomtgräns → altan → bod → rabatter → resten. */
export const RITPRIO: Record<PlatsTyp, number> = {
  altan: 0,
  bod: 1,
  rabatt: 2,
  pallkrage: 2,
  gräsmatta: 3,
  häck: 3,
  träd: 4,
  staket: 4,
  stenparti: 3,
  grus: 3,
  vatten: 3,
  annat: 5,
}

/** Namnförslag när en ny form ritas: "Rabatt 2". */
export function nyttPlatsNamn(befintligaAvTyp: number, etikett: string): string {
  return `${etikett} ${befintligaAvTyp + 1}`
}
