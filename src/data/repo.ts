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
import type { Area, Plant, PlantMove, SunExposure } from './types'

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

export function taBortYta(uid: string, id: string): void {
  void deleteDoc(doc(ytaCol(uid), id)).catch(loggaFel)
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

export function laggTillVaxtFoto(uid: string, vaxt: Plant, fotoRef: string): void {
  void updateDoc(doc(vaxtCol(uid), vaxt.id), {
    photoRefs: [...vaxt.photoRefs, fotoRef],
  }).catch(loggaFel)
}

export function taBortVaxt(uid: string, vaxt: Plant): void {
  void deleteDoc(doc(vaxtCol(uid), vaxt.id)).catch(loggaFel)
  void (async () => {
    const { taBortFoto } = await import('../lib/photoStore')
    await Promise.all(vaxt.photoRefs.map(taBortFoto))
  })().catch(loggaFel)
}
