import type { HandelseTyp, PlatsTyp, Sol, Vaderstreck } from '../data/types'

/** All UI-text på svenska, vardagligt trädgårdsspråk. Se CLAUDE.md. */

export const SOLLAGEN: readonly { varde: Sol; etikett: string }[] = [
  { varde: 'sol', etikett: 'Sol' },
  { varde: 'halvskugga', etikett: 'Halvskugga' },
  { varde: 'skugga', etikett: 'Skugga' },
]

export function solEtikett(varde: Sol): string {
  return SOLLAGEN.find((s) => s.varde === varde)?.etikett ?? varde
}

const PLATSTYP_ETIKETT: Record<PlatsTyp, string> = {
  rabatt: 'Rabatt',
  gräsmatta: 'Gräsmatta',
  pallkrage: 'Pallkrage',
  altan: 'Altan',
  bod: 'Bod',
  häck: 'Häck',
  träd: 'Träd',
  staket: 'Staket',
  annat: 'Annat',
}

export function platstypEtikett(typ: PlatsTyp): string {
  return PLATSTYP_ETIKETT[typ]
}

const HANDELSE_ETIKETT: Record<HandelseTyp, string> = {
  foto: 'Foto',
  vattnat: 'Vattnat',
  gödslat: 'Gödslat',
  beskuret: 'Beskuret',
  planterat: 'Planterat',
  flyttat: 'Flyttat',
  anteckning: 'Anteckning',
}

export function handelseEtikett(typ: HandelseTyp): string {
  return HANDELSE_ETIKETT[typ]
}

const VADERSTRECK_ETIKETT: Record<Vaderstreck, string> = {
  N: 'Norr',
  NO: 'Nordost',
  O: 'Öster',
  SO: 'Sydost',
  S: 'Söder',
  SV: 'Sydväst',
  V: 'Väster',
  NV: 'Nordväst',
}

export function vaderstreckEtikett(varde: Vaderstreck): string {
  return VADERSTRECK_ETIKETT[varde]
}

/** "3 växter" / "1 växt" — räkneord i mono sätts av anropande vy. */
export function antalVaxter(antal: number): string {
  return antal === 1 ? '1 växt' : `${antal} växter`
}

export function antalPlatser(antal: number): string {
  return antal === 1 ? '1 plats' : `${antal} platser`
}
