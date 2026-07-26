/**
 * Kartans färgton skiftar diskret med årstiden (se CLAUDE.md):
 * svalare grön april–maj, mättad juni–aug, varmare ton sep–okt,
 * avmättad nov–mars. En tonjustering, inte ett tema.
 */

export type Arstid = 'var' | 'sommar' | 'host' | 'vinter'

export function arstidFor(datum: Date): Arstid {
  const manad = datum.getMonth() // 0-indexerad
  if (manad >= 3 && manad <= 4) return 'var' // apr–maj
  if (manad >= 5 && manad <= 7) return 'sommar' // jun–aug
  if (manad >= 8 && manad <= 9) return 'host' // sep–okt
  return 'vinter' // nov–mars
}

const TONER: Record<Arstid, string> = {
  var: 'hue-rotate(7deg) saturate(0.96)',
  sommar: 'saturate(1.1)',
  host: 'hue-rotate(-9deg) saturate(0.97) brightness(1.01)',
  vinter: 'saturate(0.6) brightness(1.03)',
}

/** CSS-filter för kartobjektslagret. */
export function arstidston(datum: Date = new Date()): string {
  return TONER[arstidFor(datum)]
}
