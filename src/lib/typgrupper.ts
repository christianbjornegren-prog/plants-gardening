import type { PlatsTyp } from '../data/types'

/**
 * Typerna grupperade. Elva lösa chips väger tungt just för att de saknar
 * struktur — med rubriker läser ögat tre grupper i stället för elva val.
 * Typen sätts en gång per form och ska inte dominera panelen.
 */
export const TYPGRUPPER: readonly { rubrik: string; typer: readonly PlatsTyp[] }[] = [
  { rubrik: 'Odling', typer: ['rabatt', 'pallkrage', 'gräsmatta', 'träd'] },
  { rubrik: 'Mark', typer: ['grus', 'stenparti', 'vatten'] },
  { rubrik: 'Byggt', typer: ['altan', 'bod', 'staket'] },
]
