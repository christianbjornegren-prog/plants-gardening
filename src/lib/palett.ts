/**
 * Paletten som data, så att den kan verifieras i test. Sanningen bor i
 * `@theme` i src/index.css — den här filen speglar den och palett.test.ts
 * ser till att spegeln inte spricker.
 */

export const PALETT = {
  botten: '#12110B',
  panel: '#24231B',
  upphojd: '#36342B',
  linje: '#49483E',
  'dis-svag': '#76756C',
  dis: '#A09F96',
  ljus: '#F7F5F0',
  tra: '#C9B694',
  lov: '#8FA96F',
  orm: '#4E6B44',
  fermob: '#D3442E',
  'fermob-lyft': '#E5644F',
} as const

export type PalettNyckel = keyof typeof PALETT

/** Kromtak för brutna färger. Se CLAUDE.md. */
export const KROMTAK = 0.09

/** Enda färgen som får bryta kromtaket — och därför den enda som kan signalera. */
export const SIGNALFARGER: readonly PalettNyckel[] = ['fermob', 'fermob-lyft']

/** Färger som bara får användas som fyllnad, aldrig som text. */
export const ENDAST_FYLLNAD: readonly PalettNyckel[] = ['orm', 'fermob']

/**
 * Text ovanpå en fermob-fyllning är REN vit, inte `ljus`. Den varma vita ger
 * 4,2:1 mot #D3442E och underkänns; ren vit ger 4,5:1. Skillnaden syns knappt
 * men den är mätbar — därför är det en regel och inte en smaksak.
 */
export const TEXT_PA_FERMOB = '#FFFFFF'
