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
  | 'stenparti'
  | 'grus'
  | 'vatten'
  | 'annat'

/** Allt som får finnas i databasen — inklusive äldre värden. */
export const ALLA_PLATSTYPER: readonly PlatsTyp[] = [
  'rabatt',
  'gräsmatta',
  'pallkrage',
  'altan',
  'bod',
  'häck',
  'träd',
  'staket',
  'stenparti',
  'grus',
  'vatten',
  'annat',
]

/**
 * Det som erbjuds i ritläget. 'häck' ligger kvar som giltigt värde så att
 * befintliga former inte tappar sin stil, men föreslås inte längre. Behövs
 * något som inte finns här väljer man 'annat' och skriver ett eget namn
 * (`egenTyp`).
 */
export const PLATSTYPER: readonly PlatsTyp[] = [
  'rabatt',
  'gräsmatta',
  'pallkrage',
  'stenparti',
  'grus',
  'vatten',
  'träd',
  'altan',
  'bod',
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
  /**
   * Grader MEDURS som norr ligger från ritningens uppåt. 0 = uppåt är norr.
   * Saknas ⇒ ej angivet; Solen frågar efter den innan skuggor visas skarpt.
   */
  norrVinkel?: number
  /** Läge för solberäkningen. Saknas ⇒ Solen föreslår Sigtuna. */
  latitud?: number
  longitud?: number
}

export interface Geometri {
  punkter: PunktM[]
  /**
   * Index på de hörn som ska vara RUNDA. Punkterna är sanningen; kurvan
   * härleds (se lib/form.ts). En D-formad rabatt är fyra punkter där de två
   * på ena sidan står här.
   */
  runda?: number[]
}

/** users/{uid}/platser/{id} */
export interface Plats {
  id: string
  tradgardId: string
  namn: string
  typ: PlatsTyp
  /** Eget namn på typen när 'annat' inte räcker: "Stenparti", "Kompost". */
  egenTyp?: string
  /** Saknas för platser utan form, t.ex. "Köksfönstret". */
  geometri?: Geometri
  sol?: Sol
  jord?: string
  /** Trädgårds-id. Bara meningsfull för platser utan geometri. */
  vetterMot?: string
  vaderstreck?: Vaderstreck
  status: Status
  anteckning?: string
  /** Höjd i meter — bara för skuggberäkningen i Solen. Saknas ⇒ kastar ingen skugga. */
  hojdM?: number
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
  /** Latinskt namn. Fylls i automatiskt om man tar ett namnförslag. */
  latin?: string
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
/**
 * users/{uid}/skuggkallor/{id} — skuggkastare UTANFÖR tomten: grannens hus,
 * radhuslängan, skogsbrynet. Ritas som enkla rektanglar i Solen-vyn.
 * Koordinaterna delar ritningens meterplan och FÅR ligga utanför tomten.
 */
export interface Skuggkalla {
  id: string
  tradgardId: string
  namn: string
  punkter: PunktM[]
  hojdM: number
}

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
