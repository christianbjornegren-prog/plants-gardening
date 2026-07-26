/**
 * Paletten som data, så att den kan verifieras i test. Sanningen bor i
 * `@theme` i src/index.css — den här filen speglar den och palett.test.ts
 * ser till att spegeln inte spricker.
 */

export const PALETT = {
  /** Sidan — varm kräm, aldrig rent vitt. */
  botten: '#F5F2EB',
  /** Kort och ytor som ligger ovanpå sidan. */
  panel: '#FCFAF6',
  /** Salviagröna paneler: nyckeltal, valda chips, platshållare. */
  salvia: '#D5E1CD',
  /** Tryckt/hovrat. */
  upphojd: '#E9E6DD',
  linje: '#DDD9CF',
  'dis-svag': '#908C81',
  dis: '#676359',
  /** Tusch: brödtext, rubriker OCH ritningens linjer. */
  tusch: '#211E17',
  tra: '#C9B694',
  lov: '#8FA96F',
  /** Enda gröna som klarar brödtext på ljus botten. */
  orm: '#4E6B44',
  fermob: '#D3442E',
  /** Röd som TEXT — mörkare, eftersom botten numera är ljus. */
  'fermob-text': '#AB3321',
} as const

export type PalettNyckel = keyof typeof PALETT

/** Kromtak för brutna färger. Se CLAUDE.md. */
export const KROMTAK = 0.09

/** Enda färgen som får bryta kromtaket — och därför den enda som kan signalera. */
export const SIGNALFARGER: readonly PalettNyckel[] = ['fermob', 'fermob-text']

/**
 * Färger som bara får användas som fyllnad, aldrig som text.
 * På ljus botten är det de LJUSA som faller — tvärtemot förut.
 */
export const ENDAST_FYLLNAD: readonly PalettNyckel[] = ['tra', 'lov', 'salvia']

/**
 * Text ovanpå en fermob-fyllning är REN vit. Den varma kräm-tonen ger
 * 4,2:1 mot #D3442E och underkänns; ren vit ger 4,5:1. Skillnaden syns knappt
 * men den är mätbar — därför är det en regel och inte en smaksak.
 */
export const TEXT_PA_FERMOB = '#FFFFFF'
