import { tolkaPlatsTyp } from './kartkonvertering'
import type { Handelse, HandelseTyp, Plats, PunktM, Sol, Tradgard, Vaxt } from './types'

/**
 * Migrering v1 → v2. REN funktion: vet ingenting om Firestore, tar hela den
 * gamla datamängden och returnerar den nya. Se docs/ARKITEKTUR.md.
 *
 * Idén med v2 är att "yta" och "kartobjekt" var samma sak hela tiden. Därför
 * blir varje kartobjekt en plats (med samma id), och ytan som pekade på det
 * smälter in i platsen.
 */

export const MIGRERINGSVERSION = 2

export const TRADGARD_FRAMSIDAN = 'framsidan'
export const TRADGARD_BAKSIDAN = 'baksidan'
export const TRADGARD_INOMHUS = 'inomhus'

/** Trädgårdarna som alltid finns. Skapas tyst, går att döpa om. */
export function grundTradgardar(): Tradgard[] {
  return [
    { id: TRADGARD_FRAMSIDAN, namn: 'Framsidan', ordning: 0 },
    { id: TRADGARD_BAKSIDAN, namn: 'Baksidan', ordning: 1 },
    { id: TRADGARD_INOMHUS, namn: 'Inomhus', ordning: 2 },
  ]
}

export interface V1Objekt {
  id: string
  type: string
  name: string
  points: PunktM[]
  note?: string
}

export interface V1Karta {
  widthM: number
  heightM: number
  objects: V1Objekt[]
}

export interface V1Area {
  id: string
  name: string
  mapObjectId?: string
  sunExposure?: string
  soil?: string
  note?: string
}

export interface V1Plant {
  id: string
  name: string
  areaId: string
  position?: { x: number; y: number }
  photoRefs?: string[]
  note?: string
  moveHistory?: { fromAreaId: string; toAreaId: string; date: string }[]
}

export interface V1LogEntry {
  id: string
  plantId?: string
  areaId?: string
  type: string
  date: string
  note?: string
  photoRef?: string
}

export interface V1Data {
  karta: V1Karta | null
  areas: V1Area[]
  plants: V1Plant[]
  logEntries: V1LogEntry[]
}

export interface V2Data {
  tradgardar: Tradgard[]
  platser: Plats[]
  vaxter: Vaxt[]
  handelser: Handelse[]
}

const KANDA_TYPER: readonly HandelseTyp[] = [
  'foto',
  'vattnat',
  'gödslat',
  'beskuret',
  'planterat',
  'flyttat',
  'anteckning',
]

const KANDA_SOL: readonly string[] = ['sol', 'halvskugga', 'skugga']

function somSol(varde: unknown): Sol | undefined {
  return typeof varde === 'string' && KANDA_SOL.includes(varde) ? (varde as Sol) : undefined
}

function textEller(varde: unknown, reserv?: string): string | undefined {
  const text = typeof varde === 'string' ? varde.trim() : ''
  return text.length > 0 ? text : reserv
}

export function migreraV1TillV2(v1: V1Data, nu: string): V2Data {
  const tradgardar = grundTradgardar().map((t) =>
    t.id === TRADGARD_BAKSIDAN && v1.karta
      ? { ...t, widthM: v1.karta.widthM, heightM: v1.karta.heightM }
      : t,
  )

  // 1. Varje kartobjekt blir en plats med SAMMA id — då kan referenser byggas om.
  const platsAvId = new Map<string, Plats>()
  for (const objekt of v1.karta?.objects ?? []) {
    if (!objekt.id) continue
    platsAvId.set(objekt.id, {
      id: objekt.id,
      tradgardId: TRADGARD_BAKSIDAN,
      namn: textEller(objekt.name) ?? 'Namnlös plats',
      typ: tolkaPlatsTyp(objekt.type),
      geometri: objekt.points.length > 0 ? { punkter: objekt.points } : undefined,
      status: 'finns',
      anteckning: textEller(objekt.note),
    })
  }

  // 2. Ytorna smälter in. Ytans namn vinner — det är hennes ord.
  //    En yta vars mapObjectId pekar på ett objekt som inte finns behandlas
  //    som en yta utan koppling (annars skulle den tappas helt).
  const ytaTillPlats = new Map<string, string>()
  for (const yta of v1.areas) {
    const kopplad = yta.mapObjectId ? platsAvId.get(yta.mapObjectId) : undefined
    if (kopplad) {
      platsAvId.set(kopplad.id, {
        ...kopplad,
        namn: textEller(yta.name) ?? kopplad.namn,
        sol: somSol(yta.sunExposure),
        jord: textEller(yta.soil),
        anteckning: textEller(yta.note, kopplad.anteckning),
      })
      ytaTillPlats.set(yta.id, kopplad.id)
      continue
    }
    platsAvId.set(yta.id, {
      id: yta.id,
      tradgardId: TRADGARD_BAKSIDAN,
      namn: textEller(yta.name) ?? 'Namnlös plats',
      typ: 'annat',
      status: 'finns',
      sol: somSol(yta.sunExposure),
      jord: textEller(yta.soil),
      anteckning: textEller(yta.note),
    })
    ytaTillPlats.set(yta.id, yta.id)
  }

  // 3. Växterna. areaId → platsId; okänd yta ⇒ hemlös växt (giltigt i v2).
  const vaxter: Vaxt[] = v1.plants.map((v) => ({
    id: v.id,
    namn: textEller(v.name) ?? 'Namnlös växt',
    platsId: ytaTillPlats.get(v.areaId),
    position: v.position,
    status: 'finns',
    anteckning: textEller(v.note),
  }))

  const handelser: Handelse[] = []

  // 4. Loggposterna. Foto-poster normaliseras till typ 'foto'.
  for (const post of v1.logEntries) {
    const typ = KANDA_TYPER.includes(post.type as HandelseTyp)
      ? (post.type as HandelseTyp)
      : 'anteckning'
    handelser.push({
      id: post.id,
      typ: post.photoRef && typ === 'anteckning' ? 'foto' : typ,
      datum: post.date || nu,
      vaxtId: post.plantId,
      platsId: post.areaId ? ytaTillPlats.get(post.areaId) : undefined,
      fotoRef: post.photoRef,
      anteckning: textEller(post.note),
    })
  }

  // 5. photoRefs saknar datum i v1. Bästa tillgängliga gissning är växtens
  //    äldsta loggpost — och den flaggas som osäker i stället för att ljuga.
  const aldstaPerVaxt = new Map<string, string>()
  for (const post of v1.logEntries) {
    if (!post.plantId || !post.date) continue
    const nuvarande = aldstaPerVaxt.get(post.plantId)
    if (!nuvarande || post.date < nuvarande) aldstaPerVaxt.set(post.plantId, post.date)
  }
  for (const v of v1.plants) {
    ;(v.photoRefs ?? []).forEach((fotoRef, index) => {
      handelser.push({
        id: `foto-${v.id}-${index}`,
        typ: 'foto',
        datum: aldstaPerVaxt.get(v.id) ?? nu,
        vaxtId: v.id,
        fotoRef,
        datumOkant: true,
      })
    })
  }

  // 6. moveHistory → flyttat-händelser. Här FINNS datum, så de blir exakta.
  for (const v of v1.plants) {
    ;(v.moveHistory ?? []).forEach((flytt, index) => {
      handelser.push({
        id: `flytt-${v.id}-${index}`,
        typ: 'flyttat',
        datum: flytt.date || nu,
        vaxtId: v.id,
        franPlatsId: ytaTillPlats.get(flytt.fromAreaId),
        tillPlatsId: ytaTillPlats.get(flytt.toAreaId),
      })
    })
  }

  return {
    tradgardar,
    platser: [...platsAvId.values()],
    vaxter,
    handelser: handelser.sort((a, b) => b.datum.localeCompare(a.datum)),
  }
}
