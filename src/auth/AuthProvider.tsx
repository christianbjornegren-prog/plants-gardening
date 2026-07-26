import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { arBehorig, DELAD_DATAROT } from '../lib/behorighet'
import { appLage } from '../lib/lage'

/** Fast uid i lokalt läge — en enda användare, se CLAUDE.md. */
export const LOKAL_UID = 'agare'

export type AuthState =
  | { status: 'laddar' }
  | { status: 'utloggad' }
  /** Inloggad hos Google, men adressen står inte på listan. */
  | { status: 'ej-behorig'; epost: string }
  | { status: 'inloggad'; uid: string }

const AuthContext = createContext<AuthState>({ status: 'laddar' })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    appLage === 'lokal' ? { status: 'inloggad', uid: LOKAL_UID } : { status: 'laddar' },
  )
  /**
   * signOut() av en obehörig utlöser ett nytt auth-event med null, vilket
   * annars skulle skriva över meddelandet med "utloggad" innan det hunnit
   * läsas. Adressen sparas här och överlever den studsen.
   */
  const avvisadRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (appLage === 'lokal') return
    let avregistrera: (() => void) | undefined
    let avbruten = false
    void (async () => {
      // firebase/auth laddas bara i molnläge
      const { getAuth, getRedirectResult, onAuthStateChanged, signOut } = await import(
        'firebase/auth'
      )
      const { getFirebaseApp } = await import('../lib/firebase')
      if (avbruten) return
      const auth = getAuth(getFirebaseApp())

      // Fångar upp resultatet när popup-fallbacken gått via omdirigering.
      void getRedirectResult(auth).catch(() => undefined)

      avregistrera = onAuthStateChanged(auth, (anvandare) => {
        if (!anvandare) {
          const avvisad = avvisadRef.current
          setState(avvisad ? { status: 'ej-behorig', epost: avvisad } : { status: 'utloggad' })
          return
        }
        if (!arBehorig(anvandare.email, anvandare.emailVerified)) {
          // Appen kan ändå inte läsa något — reglerna nekar. Logga ut direkt
          // och säg varför i stället för att visa en tom app.
          const epost = anvandare.email ?? 'okänt konto'
          avvisadRef.current = epost
          // Misslyckas utloggningen får statusen inte fastna på 'laddar' —
          // då blir appen en vit sida utan förklaring.
          void signOut(auth).catch(() => setState({ status: 'ej-behorig', epost }))
          return
        }
        avvisadRef.current = undefined
        setState({ status: 'inloggad', uid: anvandare.uid })
      })
    })()
    return () => {
      avbruten = true
      avregistrera?.()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

/**
 * Roten som all data ligger under. I molnläge är den DELAD — Christian och
 * Elin ser samma trädgård, samma ritningar, samma växter. I lokalt läge finns
 * bara en användare ändå.
 *
 * Använd detta överallt utom i migreringen, som behöver det personliga uid:t
 * för att hitta data som skrevs innan trädgården blev gemensam.
 */
export function useDataRot(): string {
  const state = useAuth()
  if (state.status !== 'inloggad') {
    throw new Error('useDataRot kräver inloggad användare')
  }
  return appLage === 'lokal' ? LOKAL_UID : DELAD_DATAROT
}

/** Det egna kontots uid. Behövs bara för att flytta hem gammal privat data. */
export function usePersonligUid(): string {
  const state = useAuth()
  if (state.status !== 'inloggad') {
    throw new Error('usePersonligUid kräver inloggad användare')
  }
  return state.uid
}
