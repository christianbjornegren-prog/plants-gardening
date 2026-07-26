/**
 * Datamodellen — se docs/DATAMODELL.md, som ska hållas i synk med denna fil.
 * Appen handlar om platser och individer, inte arter.
 */

export type MapObjectType =
  | 'bod'
  | 'altan'
  | 'rabatt'
  | 'gräsmatta'
  | 'pallkrage'
  | 'häck'
  | 'träd'
  | 'staket'
  | 'annat'

/** Kartobjektstyper som kan kopplas till en yta med växter. */
export const VAXTBARA_TYPER: readonly MapObjectType[] = ['rabatt', 'pallkrage', 'gräsmatta', 'annat']

/** En punkt i meter, origo i tomtens ena hörn. */
export type PunktM = [number, number]

export interface MapObject {
  id: string
  type: MapObjectType
  name: string
  points: PunktM[]
  note?: string
}

/** ETT dokument: users/{uid}/garden/map */
export interface GardenMap {
  widthM: number
  heightM: number
  objects: MapObject[]
}

export type SunExposure = 'sol' | 'halvskugga' | 'skugga'

/** users/{uid}/areas/{areaId} */
export interface Area {
  id: string
  name: string
  mapObjectId?: string
  sunExposure?: SunExposure
  soil?: string
  note?: string
}

/** Datum lagras som ISO-strängar (t.ex. "2026-07-26T14:02:00.000Z"). */
export interface PlantMove {
  fromAreaId: string
  toAreaId: string
  date: string
}

/** users/{uid}/plants/{plantId} */
export interface Plant {
  id: string
  name: string
  areaId: string
  /** Läge på kartan i meter, om växten är utplacerad. */
  position?: { x: number; y: number }
  photoRefs: string[]
  note?: string
  moveHistory: PlantMove[]
}

export type LogType = 'vattnat' | 'gödslat' | 'beskuret' | 'planterat' | 'anteckning'

/** users/{uid}/logEntries/{entryId} — minst en av plantId/areaId sätts. */
export interface LogEntry {
  id: string
  plantId?: string
  areaId?: string
  type: LogType
  date: string
  note?: string
  photoRef?: string
}
