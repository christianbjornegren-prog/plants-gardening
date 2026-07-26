import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { rapporteraDataFel } from './fel'
import { utanUndefined } from '../lib/rensa'
import { franLagradGeometri, tillLagradGeometri, tolkaPlatsTyp } from './kartkonvertering'
import {
  grundTradgardar,
  migreraV1TillV2,
  MIGRERINGSVERSION,
  type V1Area,
  type V1Data,
  type V1LogEntry,
  type V1Plant,
} from './migrering'
import type {
  Handelse,
  HandelseTyp,
  Plats,
  PlatsTyp,
  PunktM,
  Sol,
  Status,
  Tradgard,
  Vaderstreck,
  Vaxt,
} from './types'

/**
 * Datalagret. Importeras alltid dynamiskt (await import) så att Firebase
 * hamnar i en egen chunk.
 *
 * Skrivningar är fire-and-forget mot den lokala cachen och UI:t lyssnar
 * med onSnapshot — vi väntar aldrig på server-ack (offline-first,
 * se docs/ARKITEKTUR.md).
 */

const sorterare = new Intl.Collator('sv')

/**
 * Skrivfel går till felkanalen så att UI:t kan säga till. Tidigare hamnade de
 * bara i konsolen, vilket gjorde en nekad skrivning omöjlig att skilja från
 * en app som hängt sig.
 */
function loggaFel(fel: unknown): void {
  rapporteraDataFel(fel, 'skrivning')
}

function loggaLasfel(fel: unknown): void {
  rapporteraDataFel(fel, 'lasning')
}

const tradgardCol = (uid: string) => collection(getDb(), 'users', uid, 'tradgardar')
const platsCol = (uid: string) => collection(getDb(), 'users', uid, 'platser')
const vaxtCol = (uid: string) => collection(getDb(), 'users', uid, 'vaxter')
const handelseCol = (uid: string) => collection(getDb(), 'users', uid, 'handelser')
const migreringDoc = (uid: string) => doc(getDb(), 'users', uid, 'meta', 'migrering')

export function nyttId(): string {
  return crypto.randomUUID().slice(0, 8)
}

/* ------------------------------------------------------------------ läsning */

function tillTradgard(snap: QueryDocumentSnapshot<DocumentData>): Tradgard {
  const d = snap.data()
  return {
    id: snap.id,
    namn: typeof d.namn === 'string' ? d.namn : '',
    ordning: typeof d.ordning === 'number' ? d.ordning : 99,
    widthM: typeof d.widthM === 'number' ? d.widthM : undefined,
    heightM: typeof d.heightM === 'number' ? d.heightM : undefined,
  }
}

function tillPlats(snap: QueryDocumentSnapshot<DocumentData>): Plats {
  const d = snap.data()
  return {
    id: snap.id,
    tradgardId: typeof d.tradgardId === 'string' ? d.tradgardId : '',
    namn: typeof d.namn === 'string' ? d.namn : '',
    typ: tolkaPlatsTyp(d.typ),
    egenTyp: d.egenTyp as string | undefined,
    geometri: franLagradGeometri(d.geometri),
    sol: d.sol as Sol | undefined,
    jord: d.jord as string | undefined,
    vetterMot: d.vetterMot as string | undefined,
    vaderstreck: d.vaderstreck as Vaderstreck | undefined,
    status: d.status === 'planerad' ? 'planerad' : 'finns',
    anteckning: d.anteckning as string | undefined,
  }
}

function tillVaxt(snap: QueryDocumentSnapshot<DocumentData>): Vaxt {
  const d = snap.data()
  return {
    id: snap.id,
    namn: typeof d.namn === 'string' ? d.namn : '',
    platsId: d.platsId as string | undefined,
    position: d.position as Vaxt['position'],
    status: d.status === 'planerad' ? 'planerad' : 'finns',
    sort: d.sort as string | undefined,
    planterad: d.planterad as string | undefined,
    antal: typeof d.antal === 'number' ? d.antal : undefined,
    sol: d.sol as Sol | undefined,
    jord: d.jord as string | undefined,
    anteckning: d.anteckning as string | undefined,
  }
}

function tillHandelse(snap: QueryDocumentSnapshot<DocumentData>): Handelse {
  const d = snap.data()
  return {
    id: snap.id,
    typ: (d.typ as HandelseTyp | undefined) ?? 'anteckning',
    datum: typeof d.datum === 'string' ? d.datum : '',
    vaxtId: d.vaxtId as string | undefined,
    platsId: d.platsId as string | undefined,
    fotoRef: d.fotoRef as string | undefined,
    anteckning: d.anteckning as string | undefined,
    franPlatsId: d.franPlatsId as string | undefined,
    tillPlatsId: d.tillPlatsId as string | undefined,
    datumOkant: d.datumOkant === true ? true : undefined,
  }
}

export function lyssnaPaTradgardar(uid: string, mottagare: (v: Tradgard[]) => void): () => void {
  return onSnapshot(
    tradgardCol(uid),
    (snap) => mottagare(snap.docs.map(tillTradgard).sort((a, b) => a.ordning - b.ordning)),
    loggaLasfel,
  )
}

export function lyssnaPaPlatser(uid: string, mottagare: (v: Plats[]) => void): () => void {
  return onSnapshot(
    platsCol(uid),
    (snap) => mottagare(snap.docs.map(tillPlats).sort((a, b) => sorterare.compare(a.namn, b.namn))),
    loggaLasfel,
  )
}

export function lyssnaPaVaxter(uid: string, mottagare: (v: Vaxt[]) => void): () => void {
  return onSnapshot(
    vaxtCol(uid),
    (snap) => mottagare(snap.docs.map(tillVaxt).sort((a, b) => sorterare.compare(a.namn, b.namn))),
    loggaLasfel,
  )
}

/** Sorterad med nyaste först (ISO-strängar jämförs lexikografiskt). */
export function lyssnaPaHandelser(uid: string, mottagare: (v: Handelse[]) => void): () => void {
  return onSnapshot(
    handelseCol(uid),
    (snap) => mottagare(snap.docs.map(tillHandelse).sort((a, b) => b.datum.localeCompare(a.datum))),
    loggaLasfel,
  )
}

/* ---------------------------------------------------------------- trädgårdar */

export interface TradgardFalt {
  namn: string
  ordning: number
  widthM?: number
  heightM?: number
}

/**
 * Ny ritning. Används för att skissa om en trädgård utan att röra nuläget —
 * "Baksidan" bredvid "Baksidan kommande".
 */
export function skapaTradgard(uid: string, falt: TradgardFalt): string {
  const ny = doc(tradgardCol(uid))
  void setDoc(ny, utanUndefined({ ...falt })).catch(loggaFel)
  return ny.id
}

/** Tar bort ritningen OCH platserna som hör till den. Växterna blir hemlösa. */
export function taBortTradgard(uid: string, id: string, platser: Plats[], vaxter: Vaxt[]): void {
  for (const plats of platser) {
    const dar = vaxter.filter((v) => v.platsId === plats.id)
    taBortPlats(uid, plats.id, dar, [])
  }
  void deleteDoc(doc(tradgardCol(uid), id)).catch(loggaFel)
}

export function sparaTradgardMatt(uid: string, id: string, widthM: number, heightM: number): void {
  void setDoc(doc(tradgardCol(uid), id), { widthM, heightM }, { merge: true }).catch(loggaFel)
}

export function dopOmTradgard(uid: string, id: string, namn: string): void {
  void updateDoc(doc(tradgardCol(uid), id), { namn }).catch(loggaFel)
}

/* -------------------------------------------------------------------- platser */

export interface PlatsFalt {
  tradgardId: string
  namn: string
  typ: PlatsTyp
  egenTyp?: string
  punkter?: PunktM[]
  runda?: number[]
  sol?: Sol
  jord?: string
  vetterMot?: string
  vaderstreck?: Vaderstreck
  status?: Status
  anteckning?: string
}

function platsPayload(falt: PlatsFalt): Record<string, unknown> {
  return utanUndefined({
    tradgardId: falt.tradgardId,
    namn: falt.namn,
    typ: falt.typ,
    egenTyp: falt.egenTyp,
    geometri: falt.punkter?.length
      ? tillLagradGeometri({ punkter: falt.punkter, runda: falt.runda })
      : undefined,
    sol: falt.sol,
    jord: falt.jord,
    vetterMot: falt.vetterMot,
    vaderstreck: falt.vaderstreck,
    status: falt.status ?? 'finns',
    anteckning: falt.anteckning,
  })
}

export function skapaPlats(uid: string, falt: PlatsFalt): string {
  const ny = doc(platsCol(uid))
  void setDoc(ny, platsPayload(falt)).catch(loggaFel)
  return ny.id
}

/**
 * Skriver tillbaka en plats med SAMMA id. Finns för ångra-funktionen i
 * ritläget: en borttagen plats ska kunna återuppstå exakt som den var, så att
 * växternas platsId fortfarande pekar rätt.
 */
export function aterskapaPlats(uid: string, plats: Plats): void {
  const { id, geometri, ...falt } = plats
  void setDoc(
    doc(platsCol(uid), id),
    utanUndefined({ ...falt, geometri: geometri ? tillLagradGeometri(geometri) : undefined }),
  ).catch(loggaFel)
}

/**
 * Sätter växtens plats och läge UTAN att skriva en händelse. Bara för ångra —
 * en ångrad flytt ska inte lämna spår i historiken.
 */
export function aterstallVaxtPlacering(
  uid: string,
  vaxtId: string,
  platsId: string | undefined,
  position: { x: number; y: number } | undefined,
): void {
  void updateDoc(doc(vaxtCol(uid), vaxtId), {
    platsId: platsId ?? deleteField(),
    position: position ?? deleteField(),
  }).catch(loggaFel)
}

/** Bara de fält som skickas med rörs; undefined raderar fältet. */
export function uppdateraPlats(uid: string, id: string, falt: Partial<PlatsFalt>): void {
  const uppdatering: Record<string, unknown> = {}
  if ('tradgardId' in falt) uppdatering.tradgardId = falt.tradgardId
  if ('namn' in falt) uppdatering.namn = falt.namn
  if ('typ' in falt) uppdatering.typ = falt.typ
  if ('status' in falt) uppdatering.status = falt.status ?? 'finns'
  if ('punkter' in falt) {
    uppdatering.geometri = falt.punkter?.length
      ? tillLagradGeometri({ punkter: falt.punkter, runda: falt.runda })
      : deleteField()
  }
  for (const nyckel of [
    'sol',
    'jord',
    'vetterMot',
    'vaderstreck',
    'anteckning',
    'egenTyp',
  ] as const) {
    if (nyckel in falt) uppdatering[nyckel] = falt[nyckel] ?? deleteField()
  }
  if (Object.keys(uppdatering).length === 0) return
  void updateDoc(doc(platsCol(uid), id), uppdatering).catch(loggaFel)
}

export function sparaPlatsGeometri(
  uid: string,
  id: string,
  punkter: PunktM[],
  runda?: number[],
): void {
  void updateDoc(doc(platsCol(uid), id), {
    geometri: tillLagradGeometri({ punkter, runda }),
  }).catch(loggaFel)
}

/**
 * Tar bort platsen. Växterna där blir HEMLÖSA — aldrig raderade. Platsens egna
 * händelser (och deras foton) städas.
 */
export function taBortPlats(uid: string, id: string, vaxterDar: Vaxt[], handelser: Handelse[]): void {
  void deleteDoc(doc(platsCol(uid), id)).catch(loggaFel)
  for (const vaxt of vaxterDar) {
    void updateDoc(doc(vaxtCol(uid), vaxt.id), {
      platsId: deleteField(),
      position: deleteField(),
    }).catch(loggaFel)
  }
  void stadaHandelser(uid, 'platsId', id, handelser).catch(loggaFel)
}

/* --------------------------------------------------------------------- växter */

export interface VaxtFalt {
  namn: string
  platsId?: string
  status?: Status
  sort?: string
  planterad?: string
  antal?: number
  sol?: Sol
  jord?: string
  anteckning?: string
}

export function skapaVaxt(uid: string, falt: VaxtFalt): string {
  const ny = doc(vaxtCol(uid))
  void setDoc(
    ny,
    utanUndefined({
      namn: falt.namn,
      platsId: falt.platsId,
      status: falt.status ?? 'finns',
      sort: falt.sort,
      planterad: falt.planterad,
      antal: falt.antal,
      sol: falt.sol,
      jord: falt.jord,
      anteckning: falt.anteckning,
    }),
  ).catch(loggaFel)
  return ny.id
}

/**
 * Bara de fält som skickas med rörs; undefined raderar fältet.
 * (Ingen automatisk "Planterat"-post — den ljög, se docs/DESIGNLOGG.md.)
 */
export function uppdateraVaxt(uid: string, id: string, falt: Partial<VaxtFalt>): void {
  const uppdatering: Record<string, unknown> = {}
  if ('namn' in falt) uppdatering.namn = falt.namn
  if ('status' in falt) uppdatering.status = falt.status ?? 'finns'
  for (const nyckel of [
    'platsId',
    'sort',
    'planterad',
    'antal',
    'sol',
    'jord',
    'anteckning',
  ] as const) {
    if (nyckel in falt) uppdatering[nyckel] = falt[nyckel] ?? deleteField()
  }
  if (Object.keys(uppdatering).length === 0) return
  void updateDoc(doc(vaxtCol(uid), id), uppdatering).catch(loggaFel)
}

/** Sätter växtens läge på ritningen (position i meter). */
export function placeraVaxt(uid: string, vaxtId: string, x: number, y: number): void {
  void updateDoc(doc(vaxtCol(uid), vaxtId), { position: { x, y } }).catch(loggaFel)
}

export function taBortPlacering(uid: string, vaxtId: string): void {
  void updateDoc(doc(vaxtCol(uid), vaxtId), { position: deleteField() }).catch(loggaFel)
}

/**
 * Byte av plats; kartläget nollställs.
 *
 * En hemlös växt som får sin FÖRSTA plats har inte flyttat någonstans — det
 * är att fylla i en uppgift, inte en händelse i trädgården. Därför loggas
 * bara riktiga flyttar, annars fylls loggen av "Flyttat" direkt efter att
 * varje ny växt lagts till.
 */
export function flyttaVaxt(uid: string, vaxt: Vaxt, tillPlatsId: string | undefined): void {
  if (tillPlatsId === vaxt.platsId) return
  void updateDoc(doc(vaxtCol(uid), vaxt.id), {
    platsId: tillPlatsId ?? deleteField(),
    position: deleteField(),
  }).catch(loggaFel)
  if (!vaxt.platsId) return
  skapaHandelse(uid, {
    typ: 'flyttat',
    vaxtId: vaxt.id,
    platsId: tillPlatsId,
    franPlatsId: vaxt.platsId,
    tillPlatsId,
  })
}

/**
 * Flytt via ritningen: ny position, och om prickens nya läge hör till en annan
 * plats byts även platsen (med flyttat-händelse).
 */
export function flyttaVaxtPaRitningen(
  uid: string,
  vaxt: Vaxt,
  x: number,
  y: number,
  tillPlatsId: string | undefined,
): void {
  if (tillPlatsId && tillPlatsId !== vaxt.platsId) {
    void updateDoc(doc(vaxtCol(uid), vaxt.id), {
      platsId: tillPlatsId,
      position: { x, y },
    }).catch(loggaFel)
    // Samma regel som flyttaVaxt: första platsen är ingen flytt.
    if (vaxt.platsId) {
      skapaHandelse(uid, {
        typ: 'flyttat',
        vaxtId: vaxt.id,
        platsId: tillPlatsId,
        franPlatsId: vaxt.platsId,
        tillPlatsId,
      })
    }
    return
  }
  placeraVaxt(uid, vaxt.id, x, y)
}

/** Planerad → finns, med en planterat-händelse daterad i dag. */
export function markeraPlanterad(uid: string, vaxt: Vaxt): void {
  void updateDoc(doc(vaxtCol(uid), vaxt.id), { status: 'finns' }).catch(loggaFel)
  skapaHandelse(uid, { typ: 'planterat', vaxtId: vaxt.id, platsId: vaxt.platsId })
}

export function markeraPlatsAnlagd(uid: string, plats: Plats): void {
  void updateDoc(doc(platsCol(uid), plats.id), { status: 'finns' }).catch(loggaFel)
  skapaHandelse(uid, { typ: 'planterat', platsId: plats.id })
}

/** Tar även bort växtens händelser och alla deras foton. */
export function taBortVaxt(uid: string, vaxt: Vaxt, handelser: Handelse[]): void {
  void deleteDoc(doc(vaxtCol(uid), vaxt.id)).catch(loggaFel)
  void stadaHandelser(uid, 'vaxtId', vaxt.id, handelser).catch(loggaFel)
}

/* ------------------------------------------------------------------ händelser */

export interface HandelseFalt {
  typ: HandelseTyp
  vaxtId?: string
  platsId?: string
  fotoRef?: string
  anteckning?: string
  franPlatsId?: string
  tillPlatsId?: string
  /** Endast för migrerad/backdaterad data. */
  datum?: string
}

export function skapaHandelse(uid: string, falt: HandelseFalt): string {
  const ny = doc(handelseCol(uid))
  void setDoc(
    ny,
    utanUndefined({ ...falt, datum: falt.datum ?? new Date().toISOString() }),
  ).catch(loggaFel)
  return ny.id
}

export function taBortHandelse(uid: string, id: string): void {
  void deleteDoc(doc(handelseCol(uid), id)).catch(loggaFel)
}

function stadaFoton(fotoRefs: string[]): void {
  if (fotoRefs.length === 0) return
  void (async () => {
    const { taBortFoto } = await import('../lib/photoStore')
    await Promise.all(fotoRefs.map(taBortFoto))
  })().catch(loggaFel)
}

/**
 * Raderar händelser för ett mål och städar deras foton. Frågar även den lokala
 * cachen — vyns state kan sakna poster som just skrivits.
 */
async function stadaHandelser(
  uid: string,
  falt: 'vaxtId' | 'platsId',
  varde: string,
  kanda: Handelse[],
): Promise<void> {
  let cachade: Handelse[] = []
  try {
    const snap = await getDocs(query(handelseCol(uid), where(falt, '==', varde)))
    cachade = snap.docs.map(tillHandelse)
  } catch {
    cachade = []
  }
  const alla = new Map([...kanda, ...cachade].map((h) => [h.id, h]))
  for (const handelse of alla.values()) taBortHandelse(uid, handelse.id)
  stadaFoton([...alla.values()].flatMap((h) => (h.fotoRef ? [h.fotoRef] : [])))
}

/* ------------------------------------------------------------------ migrering */

async function hamtaAlla<T>(
  ref: ReturnType<typeof collection>,
  omvandla: (snap: QueryDocumentSnapshot<DocumentData>) => T,
): Promise<T[]> {
  try {
    const snap = await getDocs(ref)
    return snap.docs.map(omvandla)
  } catch {
    return []
  }
}

/**
 * Körs en gång per datamängd innan UI:t visar något. Migrerar v1 → v2 och
 * sår de tre trädgårdarna. Är datamängden tom blir resultatet bara
 * trädgårdarna — samma kodväg täcker både migrering och första start.
 *
 * OBS: lokalt läge och molnläge är SKILDA datamängder och migreras var för sig.
 * Gamla kollektioner raderas aldrig — det är hela rollbacken.
 */
export async function sakerstallDatamodell(uid: string): Promise<void> {
  const db = getDb()
  let redanGjord = false
  try {
    const stampel = await getDoc(migreringDoc(uid))
    redanGjord = (stampel.data()?.version ?? 0) >= MIGRERINGSVERSION
  } catch {
    redanGjord = false
  }
  if (redanGjord) return

  const [karta, areas, plants, logEntries] = await Promise.all([
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'garden', 'map'))
        if (!snap.exists()) return null
        const d = snap.data()
        return {
          widthM: typeof d.widthM === 'number' ? d.widthM : 0,
          heightM: typeof d.heightM === 'number' ? d.heightM : 0,
          objects: (Array.isArray(d.objects) ? d.objects : []).map((rad: Record<string, unknown>) => ({
            id: typeof rad.id === 'string' ? rad.id : '',
            type: typeof rad.type === 'string' ? rad.type : 'annat',
            name: typeof rad.name === 'string' ? rad.name : '',
            points: (Array.isArray(rad.points) ? rad.points : []).map(
              (p: { x?: number; y?: number }): PunktM => [p?.x ?? 0, p?.y ?? 0],
            ),
            note: typeof rad.note === 'string' ? rad.note : undefined,
          })),
        }
      } catch {
        return null
      }
    })(),
    hamtaAlla<V1Area>(collection(db, 'users', uid, 'areas'), (s) => ({
      id: s.id,
      ...(s.data() as Omit<V1Area, 'id'>),
    })),
    hamtaAlla<V1Plant>(collection(db, 'users', uid, 'plants'), (s) => ({
      id: s.id,
      ...(s.data() as Omit<V1Plant, 'id'>),
    })),
    hamtaAlla<V1LegacyLogg>(collection(db, 'users', uid, 'logEntries'), (s) => ({
      id: s.id,
      ...(s.data() as Omit<V1LegacyLogg, 'id'>),
    })),
  ])

  const v1: V1Data = { karta, areas, plants, logEntries }
  const v2 = migreraV1TillV2(v1, new Date().toISOString())

  // Trädgårdar som redan finns (t.ex. halvkörd migrering) skrivs inte över.
  const befintligaTradgardar = new Set(
    (await hamtaAlla(tradgardCol(uid), (s) => s.id)).map((id) => id),
  )

  const batch = writeBatch(db)
  for (const tradgard of v2.tradgardar) {
    if (befintligaTradgardar.has(tradgard.id)) continue
    const { id, ...falt } = tradgard
    batch.set(doc(tradgardCol(uid), id), utanUndefined(falt))
  }
  for (const plats of v2.platser) {
    const { id, geometri, ...falt } = plats
    batch.set(
      doc(platsCol(uid), id),
      utanUndefined({
        ...falt,
        geometri: geometri ? tillLagradGeometri(geometri) : undefined,
      }),
    )
  }
  for (const vaxt of v2.vaxter) {
    const { id, ...falt } = vaxt
    batch.set(doc(vaxtCol(uid), id), utanUndefined(falt))
  }
  for (const handelse of v2.handelser) {
    const { id, ...falt } = handelse
    batch.set(doc(handelseCol(uid), id), utanUndefined(falt))
  }
  batch.set(migreringDoc(uid), { version: MIGRERINGSVERSION })

  // Fire-and-forget mot cachen, precis som övriga skrivningar.
  void batch.commit().catch(loggaFel)
}

type V1LegacyLogg = V1LogEntry

export function seedTradgardar(): Tradgard[] {
  return grundTradgardar()
}
