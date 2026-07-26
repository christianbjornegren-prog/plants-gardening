import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { appLage } from '../lib/lage'

/** Fast uid i lokalt läge — en enda användare, se CLAUDE.md. */
export const LOKAL_UID = 'agare'

export type AuthState =
  | { status: 'laddar' }
  | { status: 'utloggad' }
  | { status: 'inloggad'; uid: string }

const AuthContext = createContext<AuthState>({ status: 'laddar' })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    appLage === 'lokal' ? { status: 'inloggad', uid: LOKAL_UID } : { status: 'laddar' },
  )

  useEffect(() => {
    if (appLage === 'lokal') return
    let avregistrera: (() => void) | undefined
    let avbruten = false
    void (async () => {
      // firebase/auth laddas bara i molnläge
      const { getAuth, onAuthStateChanged } = await import('firebase/auth')
      const { getFirebaseApp } = await import('../lib/firebase')
      if (avbruten) return
      avregistrera = onAuthStateChanged(getAuth(getFirebaseApp()), (anvandare) => {
        setState(anvandare ? { status: 'inloggad', uid: anvandare.uid } : { status: 'utloggad' })
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

/** Får bara användas i vyer som renderas när användaren är inloggad. */
export function useUid(): string {
  const state = useAuth()
  if (state.status !== 'inloggad') {
    throw new Error('useUid kräver inloggad användare')
  }
  return state.uid
}
