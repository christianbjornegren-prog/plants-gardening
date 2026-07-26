/**
 * Datamodellen — se docs/DATAMODELL.md, som ska hållas i synk med denna fil.
 *
 * Fyra begrepp: Trädgård → Plats → Växt → Händelse.
 * Ordet "yta" finns inte. Det som ritas på ritningen och det som håller
 * växter är SAMMA sak: en plats.
 */

/** En punkt i meter, origo i tomtens ena hörn. */
export type PunktM = [number, number]

/** Styr ritstil och namnförslag — ALDRIG vad som är tillåtet. */
export type PlatsTyp =
  | 'bod'
  | 'altan'
  | 'rabatt'
  | 'gräsmatta'
  | 'pallkrage'
  | 'häck'
  | 'träd'
  | 'staket'
  | 'annat'

export const PLATSTYPER: readonly PlatsTyp[] = [
  'rabatt',
  'gräsmatta',
  'pallkrage',
  'altan',
  'bod',
  'häck',
  'träd',
  'staket',
  'annat',
]

/** Planerat ritas streckat och listas separat på Hem. */
export type Status = 'finns' | 'planerad'

export type Sol = 'sol' | 'halvskugga' | 'skugga'

export type Vaderstreck = 'N' | 'NO' | 'O' | 'SO' | 'S' | 'SV' | 'V' | 'NV'

export const VADERSTRECK: readonly Vaderstreck[] = ['N', 'NO', 'O', 'SO', 'S', 'SV', 'V', 'NV']

/** users/{uid}/tradgardar/{id} — saknas mått finns ingen ritning. */
export interface Tradgard {
  id: string
  namn: string
  ordning: number
  widthM?: number
  heightM?: number
}

export interface Geometri {
  punkter: PunktM[]
}

/** users/{uid}/platser/{id} */
export interface Plats {
  id: string
  tradgardId: string
  namn: string
  typ: PlatsTyp
  /** Saknas för platser utan form, t.ex. "Köksfönstret". */
  geometri?: Geometri
  sol?: Sol
  jord?: string
  /** Trädgårds-id. Bara meningsfull för platser utan geometri. */
  vetterMot?: string
  vaderstreck?: Vaderstreck
  status: Status
  anteckning?: string
}

/** users/{uid}/vaxter/{id} — allt utom namn är valfritt. */
export interface Vaxt {
  id: string
  namn: string
  /** Saknas = hemlös växt. Fullt giltigt tillstånd. */
  platsId?: string
  /** Läge på ritningen i meter. */
  position?: { x: number; y: number }
  status: Status
  /** Fri text, hennes egna ord. Aldrig en artdatabas. */
  sort?: string
  /** Fri text: "2023", "maj 2023", "12 maj 2023". */
  planterad?: string
  antal?: number
  sol?: Sol
  jord?: string
  anteckning?: string
}

export type HandelseTyp =
  | 'foto'
  | 'vattnat'
  | 'gödslat'
  | 'beskuret'
  | 'planterat'
  | 'flyttat'
  | 'anteckning'

/**
 * users/{uid}/handelser/{id} — ALL historik. Foton är händelser, flyttar är
 * händelser. Datum lagras som ISO-sträng.
 */
export interface Handelse {
  id: string
  typ: HandelseTyp
  datum: string
  vaxtId?: string
  platsId?: string
  fotoRef?: string
  anteckning?: string
  /** Endast på 'flyttat'. */
  franPlatsId?: string
  tillPlatsId?: string
  /** Migrerat foto vars exakta datum inte gick att återskapa. */
  datumOkant?: boolean
}
