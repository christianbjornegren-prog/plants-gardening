import { appLage } from './lage'

/**
 * Foton bakom en gemensam nyckel-abstraktion (se docs/DATAMODELL.md):
 * - lokalt läge: IndexedDB, nyckel "lokal:<id>"
 * - molnläge: Firebase Storage, nyckel = lagringsvägen "users/<uid>/photos/<id>.jpg"
 * Firebase Storage saknar offline-stöd, därför denna delning.
 */

const IDB_NAMN = 'ripvagen-foton'
const IDB_STORE = 'foton'

let dbLofte: Promise<IDBDatabase> | undefined

function oppnaFotoDb(): Promise<IDBDatabase> {
  dbLofte ??= new Promise((losning, avslag) => {
    const begaran = indexedDB.open(IDB_NAMN, 1)
    begaran.onupgradeneeded = () => begaran.result.createObjectStore(IDB_STORE)
    begaran.onsuccess = () => losning(begaran.result)
    begaran.onerror = () => avslag(begaran.error ?? new Error('Kunde inte öppna fotodatabasen'))
  })
  return dbLofte
}

async function medFotoStore<T>(
  lage: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await oppnaFotoDb()
  return new Promise((losning, avslag) => {
    const begaran = operation(db.transaction(IDB_STORE, lage).objectStore(IDB_STORE))
    begaran.onsuccess = () => losning(begaran.result)
    begaran.onerror = () => avslag(begaran.error ?? new Error('Fotodatabasen svarade inte'))
  })
}

/** Sparar ett (redan komprimerat) foto och returnerar dess nyckel. */
export async function sparaFoto(uid: string, blob: Blob): Promise<string> {
  const id = crypto.randomUUID()
  if (appLage === 'lokal') {
    await medFotoStore('readwrite', (s) => s.put(blob, id))
    return `lokal:${id}`
  }
  const sokvag = `users/${uid}/photos/${id}.jpg`
  const { getStorage, ref, uploadBytes } = await import('firebase/storage')
  const { getFirebaseApp } = await import('./firebase')
  await uploadBytes(ref(getStorage(getFirebaseApp()), sokvag), blob, {
    contentType: 'image/jpeg',
  })
  return sokvag
}

const urlCache = new Map<string, string>()

/** URL som kan sättas på en <img>. undefined om fotot saknas. */
export async function hamtaFotoUrl(fotoRef: string): Promise<string | undefined> {
  const cachad = urlCache.get(fotoRef)
  if (cachad) return cachad

  let url: string | undefined
  if (fotoRef.startsWith('lokal:')) {
    const blob = await medFotoStore<Blob | undefined>('readonly', (s) =>
      s.get(fotoRef.slice('lokal:'.length)),
    )
    if (blob) url = URL.createObjectURL(blob)
  } else {
    const { getDownloadURL, getStorage, ref } = await import('firebase/storage')
    const { getFirebaseApp } = await import('./firebase')
    try {
      url = await getDownloadURL(ref(getStorage(getFirebaseApp()), fotoRef))
    } catch {
      url = undefined
    }
  }
  if (url) urlCache.set(fotoRef, url)
  return url
}

export async function taBortFoto(fotoRef: string): Promise<void> {
  const cachad = urlCache.get(fotoRef)
  if (cachad?.startsWith('blob:')) URL.revokeObjectURL(cachad)
  urlCache.delete(fotoRef)

  if (fotoRef.startsWith('lokal:')) {
    await medFotoStore('readwrite', (s) => s.delete(fotoRef.slice('lokal:'.length)))
    return
  }
  const { deleteObject, getStorage, ref } = await import('firebase/storage')
  const { getFirebaseApp } = await import('./firebase')
  await deleteObject(ref(getStorage(getFirebaseApp()), fotoRef))
}
