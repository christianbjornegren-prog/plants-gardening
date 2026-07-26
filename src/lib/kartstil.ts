import type { MapObjectType } from '../data/types'

export const KARTTYPER: readonly { varde: MapObjectType; etikett: string }[] = [
  { varde: 'rabatt', etikett: 'Rabatt' },
  { varde: 'gräsmatta', etikett: 'Gräsmatta' },
  { varde: 'pallkrage', etikett: 'Pallkrage' },
  { varde: 'altan', etikett: 'Altan' },
  { varde: 'bod', etikett: 'Bod' },
  { varde: 'häck', etikett: 'Häck' },
  { varde: 'träd', etikett: 'Träd' },
  { varde: 'staket', etikett: 'Staket' },
  { varde: 'annat', etikett: 'Annat' },
]

export function karttypEtikett(typ: MapObjectType): string {
  return KARTTYPER.find((t) => t.varde === typ)?.etikett ?? typ
}

export interface KartobjektStil {
  /** CSS-färg för fyllnad (tokens + color-mix, aldrig godtyckliga hex). */
  fyll: string
  kontur: string
  /** Streckad kontur (staket). */
  streckad?: boolean
  /** Öppen form utan fyllnad som ritas som linje (staket). */
  oppen?: boolean
  /** Ljus etikettext (mörka objekt som boden). */
  ljusEtikett?: boolean
}

function ton(token: string, procent: number): string {
  return `color-mix(in srgb, var(--color-${token}) ${procent}%, transparent)`
}

export const KARTSTIL: Record<MapObjectType, KartobjektStil> = {
  rabatt: { fyll: ton('tra', 55), kontur: 'var(--color-panel)' },
  gräsmatta: { fyll: ton('lov', 45), kontur: 'var(--color-panel)' },
  pallkrage: { fyll: ton('tra', 75), kontur: 'var(--color-panel)' },
  altan: { fyll: 'url(#trall)', kontur: 'var(--color-panel)' },
  bod: { fyll: ton('panel', 88), kontur: 'var(--color-panel)', ljusEtikett: true },
  häck: { fyll: ton('orm', 55), kontur: 'var(--color-orm)' },
  träd: { fyll: ton('lov', 35), kontur: 'var(--color-orm)' },
  staket: { fyll: 'none', kontur: 'var(--color-panel)', streckad: true, oppen: true },
  annat: { fyll: ton('ljus', 60), kontur: 'var(--color-panel)' },
}
