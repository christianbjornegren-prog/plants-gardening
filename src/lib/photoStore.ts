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
    const transaktion = db.transaction(IDB_STORE, lage)
    const begaran = operation(transaktion.objectStore(IDB_STORE))
    if (lage === 'readwrite') {
      // Skrivningar är varaktiga först vid transaction.oncomplete — en
      // transaktion kan aborta (t.ex. kvotslut) EFTER att requesten lyckats.
      transaktion.oncomplete = () => losning(begaran.result)
      transaktion.onabort = () =>
        avslag(transaktion.error ?? new Error('Fotolagringen avbröts'))
      transaktion.onerror = () =>
        avslag(transaktion.error ?? new Error('Fotolagringen misslyckades'))
    } else {
      begaran.onsuccess = () => losning(begaran.result)
      begaran.onerror = () => avslag(begaran.error ?? new Error('Fotodatabasen svarade inte'))
    }
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

/**
 * Cachen håller LÖFTEN (inte färdiga URL:er) så att samtidiga anrop för samma
 * fotoRef — t.ex. huvudbild + miniatyr i växtdetaljen — delar en enda
 * objectURL i stället för att skapa varsin där den ena läcker.
 */
const urlCache = new Map<string, Promise<string | undefined>>()

/** URL som kan sättas på en <img>. undefined om fotot saknas. */
export function hamtaFotoUrl(fotoRef: string): Promise<string | undefined> {
  let lofte = urlCache.get(fotoRef)
  if (!lofte) {
    lofte = hamtaFotoUrlIntern(fotoRef)
    urlCache.set(fotoRef, lofte)
    // Misslyckade uppslag ska inte cachas för alltid.
    void lofte.then((url) => {
      if (!url && urlCache.get(fotoRef) === lofte) urlCache.delete(fotoRef)
    })
  }
  return lofte
}

async function hamtaFotoUrlIntern(fotoRef: string): Promise<string | undefined> {
  if (fotoRef.startsWith('lokal:')) {
    const blob = await medFotoStore<Blob | undefined>('readonly', (s) =>
      s.get(fotoRef.slice('lokal:'.length)),
    )
    return blob ? URL.createObjectURL(blob) : undefined
  }
  const { getDownloadURL, getStorage, ref } = await import('firebase/storage')
  const { getFirebaseApp } = await import('./firebase')
  try {
    return await getDownloadURL(ref(getStorage(getFirebaseApp()), fotoRef))
  } catch {
    return undefined
  }
}

export async function taBortFoto(fotoRef: string): Promise<void> {
  const cachad = await urlCache.get(fotoRef)
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
