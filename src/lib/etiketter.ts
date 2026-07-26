import type { SunExposure } from '../data/types'

export const SOLLAGEN: readonly { varde: SunExposure; etikett: string }[] = [
  { varde: 'sol', etikett: 'Sol' },
  { varde: 'halvskugga', etikett: 'Halvskugga' },
  { varde: 'skugga', etikett: 'Skugga' },
]

export function sollageEtikett(varde: SunExposure): string {
  return SOLLAGEN.find((s) => s.varde === varde)?.etikett ?? varde
}
