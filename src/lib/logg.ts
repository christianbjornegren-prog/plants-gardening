import type { LogEntry, LogType, Plant } from '../data/types'

export const LOGGTYPER: Record<LogType, string> = {
  vattnat: 'Vattnat',
  gödslat: 'Gödslat',
  beskuret: 'Beskuret',
  planterat: 'Planterat',
  anteckning: 'Anteckning',
}

/** Poster för en växt: allt som loggats direkt på växten. */
export function loggForVaxt(logg: LogEntry[], plantId: string): LogEntry[] {
  return logg.filter((post) => post.plantId === plantId)
}

/**
 * Poster för en yta: det som loggats på själva ytan plus det som loggats
 * på växterna som står där nu.
 */
export function loggForYta(logg: LogEntry[], vaxter: Plant[], areaId: string): LogEntry[] {
  const vaxterHar = new Set(vaxter.filter((v) => v.areaId === areaId).map((v) => v.id))
  return logg.filter(
    (post) => post.areaId === areaId || (post.plantId !== undefined && vaxterHar.has(post.plantId)),
  )
}
