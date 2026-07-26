import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  disableNetwork,
  initializeFirestore,
  persistentLocalCache,
  setLogLevel,
  type Firestore,
} from 'firebase/firestore'
import { appLage } from './lage'

/**
 * Importeras alltid dynamiskt (await import) så att Firebase-SDK:t
 * hamnar i en egen chunk och laddas först när datalagret behövs.
 */

const env = import.meta.env

let app: FirebaseApp | undefined
let db: Firestore | undefined

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(
      appLage === 'moln'
        ? {
            apiKey: env.VITE_FIREBASE_API_KEY,
            authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
            appId: env.VITE_FIREBASE_APP_ID,
          }
        : { apiKey: 'lokal', authDomain: 'lokal', projectId: 'ripvagen-11-lokal', appId: 'lokal' },
    )
  }
  return app
}

export function getDb(): Firestore {
  if (!db) {
    setLogLevel('error')
    db = initializeFirestore(getFirebaseApp(), { localCache: persistentLocalCache() })
    if (appLage === 'lokal') {
      void disableNetwork(db)
    }
  }
  return db
}
