import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { utanUndefined } from '../lib/rensa'
import { franLagratObjekt, tillLagradKarta } from './kartkonvertering'
import type {
  Area,
  GardenMap,
  LogEntry,
  LogType,
  MapObject,
  Plant,
  PlantMove,
  SunExposure,
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

function loggaFel(fel: unknown): void {
  console.error('Ripvägen 11: skrivning misslyckades', fel)
}

function ytaCol(uid: string) {
  return collection(getDb(), 'users', uid, 'areas')
}

function vaxtCol(uid: string) {
  return collection(getDb(), 'users', uid, 'plants')
}

function loggCol(uid: string) {
  return collection(getDb(), 'users', uid, 'logEntries')
}

function kartaDoc(uid: string) {
  return doc(getDb(), 'users', uid, 'garden', 'map')
}

function tillYta(snap: QueryDocumentSnapshot<DocumentData>): Area {
  const data = snap.data()
  return {
    id: snap.id,
    name: typeof data.name === 'string' ? data.name : '',
    mapObjectId: data.mapObjectId as string | undefined,
    sunExposure: data.sunExposure as SunExposure | undefined,
    soil: data.soil as string | undefined,
    note: data.note as string | undefined,
  }
}

function tillVaxt(snap: QueryDocumentSnapshot<DocumentData>): Plant {
  const data = snap.data()
  return {
    id: snap.id,
    name: typeof data.name === 'string' ? data.name : '',
    areaId: typeof data.areaId === 'string' ? data.areaId : '',
    position: data.position as Plant['position'],
    photoRefs: Array.isArray(data.photoRefs) ? (data.photoRefs as string[]) : [],
    note: data.note as string | undefined,
    moveHistory: Array.isArray(data.moveHistory) ? (data.moveHistory as PlantMove[]) : [],
  }
}

export function lyssnaPaYtor(uid: string, mottagare: (ytor: Area[]) => void): () => void {
  return onSnapshot(ytaCol(uid), (snap) => {
    mottagare(snap.docs.map(tillYta).sort((a, b) => sorterare.compare(a.name, b.name)))
  })
}

export function lyssnaPaVaxter(uid: string, mottagare: (vaxter: Plant[]) => void): () => void {
  return onSnapshot(vaxtCol(uid), (snap) => {
    mottagare(snap.docs.map(tillVaxt).sort((a, b) => sorterare.compare(a.name, b.name)))
  })
}

function tillLoggpost(snap: QueryDocumentSnapshot<DocumentData>): LogEntry {
  const data = snap.data()
  return {
    id: snap.id,
    plantId: data.plantId as string | undefined,
    areaId: data.areaId as string | undefined,
    type: (data.type as LogType | undefined) ?? 'anteckning',
    date: typeof data.date === 'string' ? data.date : '',
    note: data.note as string | undefined,
    photoRef: data.photoRef as string | undefined,
  }
}

/** Sorterad med nyaste först (ISO-strängar jämförs lexikografiskt). */
export function lyssnaPaLogg(uid: string, mottagare: (poster: LogEntry[]) => void): () => void {
  return onSnapshot(loggCol(uid), (snap) => {
    mottagare(snap.docs.map(tillLoggpost).sort((a, b) => b.date.localeCompare(a.date)))
  })
}

export interface LoggFalt {
  plantId?: string
  areaId?: string
  type: LogType
  note?: string
  photoRef?: string
}

export function skapaLoggpost(uid: string, falt: LoggFalt): string {
  const ny = doc(loggCol(uid))
  void setDoc(ny, utanUndefined({ ...falt, date: new Date().toISOString() })).catch(loggaFel)
  return ny.id
}

export function taBortLoggpost(uid: string, id: string): void {
  void deleteDoc(doc(loggCol(uid), id)).catch(loggaFel)
}

/** null = ingen karta upplagd än. */
export function lyssnaPaKarta(uid: string, mottagare: (karta: GardenMap | null) => void): () => void {
  return onSnapshot(kartaDoc(uid), (snap) => {
    if (!snap.exists()) {
      mottagare(null)
      return
    }
    const data = snap.data()
    mottagare({
      widthM: typeof data.widthM === 'number' ? data.widthM : 0,
      heightM: typeof data.heightM === 'number' ? data.heightM : 0,
      objects: Array.isArray(data.objects) ? data.objects.map(franLagratObjekt) : [],
    })
  })
}

export function skapaKarta(uid: string, widthM: number, heightM: number): void {
  void setDoc(kartaDoc(uid), { widthM, heightM, objects: [] }).catch(loggaFel)
}

export function uppdateraKartaMatt(uid: string, widthM: number, heightM: number): void {
  void updateDoc(kartaDoc(uid), { widthM, heightM }).catch(loggaFel)
}

/** Lägger till eller ersätter ett objekt i kartan (hela dokumentet skrivs om). */
export function sparaKartobjekt(uid: string, karta: GardenMap, objekt: MapObject): void {
  const ovriga = karta.objects.filter((o) => o.id !== objekt.id)
  void setDoc(
    kartaDoc(uid),
    tillLagradKarta({ ...karta, objects: [...ovriga, objekt] }),
  ).catch(loggaFel)
}

/** Tar bort objektet och kopplar loss ytor som pekade på det. */
export function taBortKartobjekt(
  uid: string,
  karta: GardenMap,
  objektId: string,
  kopplladeYtaIds: string[],
): void {
  void setDoc(
    kartaDoc(uid),
    tillLagradKarta({ ...karta, objects: karta.objects.filter((o) => o.id !== objektId) }),
  ).catch(loggaFel)
  for (const ytaId of kopplladeYtaIds) {
    void updateDoc(doc(ytaCol(uid), ytaId), { mapObjectId: deleteField() }).catch(loggaFel)
  }
}

export function nyttObjektId(): string {
  return crypto.randomUUID().slice(0, 8)
}

export function kopplaYtaTillObjekt(uid: string, ytaId: string, objektId: string | undefined): void {
  void updateDoc(doc(ytaCol(uid), ytaId), {
    mapObjectId: objektId ?? deleteField(),
  }).catch(loggaFel)
}

/** Sätter växtens läge på kartan (position i meter). */
export function placeraVaxt(uid: string, plantId: string, x: number, y: number): void {
  void updateDoc(doc(vaxtCol(uid), plantId), { position: { x, y } }).catch(loggaFel)
}

export interface YtaFalt {
  name: string
  sunExposure?: SunExposure
  soil?: string
  note?: string
}

export function skapaYta(uid: string, falt: YtaFalt): string {
  const ny = doc(ytaCol(uid))
  void setDoc(ny, utanUndefined({ ...falt })).catch(loggaFel)
  return ny.id
}

export function uppdateraYta(uid: string, id: string, falt: YtaFalt): void {
  void updateDoc(doc(ytaCol(uid), id), {
    name: falt.name,
    sunExposure: falt.sunExposure ?? deleteField(),
    soil: falt.soil ?? deleteField(),
    note: falt.note ?? deleteField(),
  }).catch(loggaFel)
}

function stadaFoton(fotoRefs: string[]): void {
  if (fotoRefs.length === 0) return
  void (async () => {
    const { taBortFoto } = await import('../lib/photoStore')
    await Promise.all(fotoRefs.map(taBortFoto))
  })().catch(loggaFel)
}

/** Tar även bort ytans egna loggposter och deras foton. */
export function taBortYta(uid: string, id: string, loggposter: LogEntry[]): void {
  void deleteDoc(doc(ytaCol(uid), id)).catch(loggaFel)
  for (const post of loggposter) taBortLoggpost(uid, post.id)
  stadaFoton(loggposter.flatMap((post) => (post.photoRef ? [post.photoRef] : [])))
}

export interface VaxtFalt {
  name: string
  areaId: string
  note?: string
  photoRefs?: string[]
}

export function skapaVaxt(uid: string, falt: VaxtFalt): string {
  const ny = doc(vaxtCol(uid))
  void setDoc(
    ny,
    utanUndefined({
      name: falt.name,
      areaId: falt.areaId,
      note: falt.note,
      photoRefs: falt.photoRefs ?? [],
      moveHistory: [],
    }),
  ).catch(loggaFel)
  // Varje växt börjar sin tidslinje med en planterad-post.
  skapaLoggpost(uid, { plantId: ny.id, type: 'planterat' })
  return ny.id
}

export function uppdateraVaxt(uid: string, id: string, falt: { name: string; note?: string }): void {
  void updateDoc(doc(vaxtCol(uid), id), {
    name: falt.name,
    note: falt.note ?? deleteField(),
  }).catch(loggaFel)
}

/** Byte av yta loggas alltid i moveHistory; kartpositionen nollställs. */
export function flyttaVaxt(uid: string, vaxt: Plant, tillYtaId: string): void {
  if (tillYtaId === vaxt.areaId) return
  const flytt: PlantMove = {
    fromAreaId: vaxt.areaId,
    toAreaId: tillYtaId,
    date: new Date().toISOString(),
  }
  void updateDoc(doc(vaxtCol(uid), vaxt.id), {
    areaId: tillYtaId,
    moveHistory: [...vaxt.moveHistory, flytt],
    position: deleteField(),
  }).catch(loggaFel)
}

/**
 * Flytt via kartan: ny position, och om prickens nya läge hör till en annan
 * yta byts även ytan (med post i moveHistory).
 */
export function flyttaVaxtPaKartan(
  uid: string,
  vaxt: Plant,
  x: number,
  y: number,
  tillYtaId: string | undefined,
): void {
  if (tillYtaId && tillYtaId !== vaxt.areaId) {
    const flytt: PlantMove = {
      fromAreaId: vaxt.areaId,
      toAreaId: tillYtaId,
      date: new Date().toISOString(),
    }
    void updateDoc(doc(vaxtCol(uid), vaxt.id), {
      areaId: tillYtaId,
      moveHistory: [...vaxt.moveHistory, flytt],
      position: { x, y },
    }).catch(loggaFel)
    return
  }
  placeraVaxt(uid, vaxt.id, x, y)
}

export function laggTillVaxtFoto(uid: string, vaxt: Plant, fotoRef: string): void {
  void updateDoc(doc(vaxtCol(uid), vaxt.id), {
    photoRefs: [...vaxt.photoRefs, fotoRef],
  }).catch(loggaFel)
}

/** Tar även bort växtens loggposter och alla foton (galleri + loggfoton). */
export function taBortVaxt(uid: string, vaxt: Plant, loggposter: LogEntry[]): void {
  void deleteDoc(doc(vaxtCol(uid), vaxt.id)).catch(loggaFel)
  for (const post of loggposter) taBortLoggpost(uid, post.id)
  const fotoRefs = new Set(vaxt.photoRefs)
  for (const post of loggposter) {
    if (post.photoRef) fotoRefs.add(post.photoRef)
  }
  stadaFoton([...fotoRefs])
}
