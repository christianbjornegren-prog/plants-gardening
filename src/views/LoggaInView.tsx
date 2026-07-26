import { useState } from 'react'
import { Adresskylt } from '../components/Adresskylt'
import { GoogleIkon } from '../components/Ikoner'
import { useAuth } from '../auth/AuthProvider'

/** Visas bara i molnläge (riktig Firebase-config) när ingen är inloggad. */
export function LoggaInView() {
  const auth = useAuth()
  const [fel, setFel] = useState<string>()
  const [skickar, setSkickar] = useState(false)

  async function loggaIn() {
    setFel(undefined)
    setSkickar(true)
    try {
      const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import(
        'firebase/auth'
      )
      const { getFirebaseApp } = await import('../lib/firebase')
      const auth = getAuth(getFirebaseApp())
      auth.languageCode = 'sv'
      const leverantor = new GoogleAuthProvider()
      // Alltid kontoväljaren: två personer delar ofta en dator, och en app som
      // tyst loggar in fel konto är svår att förstå.
      leverantor.setCustomParameters({ prompt: 'select_account' })
      try {
        await signInWithPopup(auth, leverantor)
      } catch (e) {
        const kod = (e as { code?: string }).code ?? ''
        // Installerad på hemskärmen kan popup vara blockerad — fall tillbaka
        // på omdirigering i stället för att bara misslyckas.
        if (kod === 'auth/popup-blocked' || kod === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(auth, leverantor)
          return
        }
        if (kod === 'auth/popup-closed-by-user' || kod === 'auth/cancelled-popup-request') {
          setSkickar(false)
          return
        }
        throw e
      }
    } catch {
      setFel('Det gick inte att logga in. Försök igen.')
      setSkickar(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-8">
      <Adresskylt stor />

      {auth.status === 'ej-behorig' ? (
        <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
          <p role="alert" className="text-sm/6 text-ljus">
            <span className="mono">{auth.epost}</span> har inte tillgång till den här trädgården.
          </p>
          <p className="text-sm/6 text-dis">
            Ripvägen 11 är privat. Logga in med det konto du blivit tillagd med.
          </p>
        </div>
      ) : (
        <p className="max-w-xs text-center text-sm/6 text-dis">
          Trädgårdsjournalen för Ripvägen 11. Privat — bara inbjudna konton kommer in.
        </p>
      )}

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={() => void loggaIn()}
          disabled={skickar}
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-fermob px-4
            font-medium text-white transition-[background-color,opacity] duration-200
            ease-[var(--ease-mjuk)] hover:bg-fermob/90 disabled:opacity-60"
        >
          <GoogleIkon width={18} height={18} />
          {auth.status === 'ej-behorig' ? 'Logga in med ett annat konto' : 'Logga in med Google'}
        </button>

        {fel && (
          <p role="alert" className="text-center text-sm text-fermob-lyft">
            {fel}
          </p>
        )}
      </div>
    </div>
  )
}
