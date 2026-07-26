import { useState, type FormEvent } from 'react'
import { Adresskylt } from '../components/Adresskylt'

/** Visas bara i molnläge (riktig Firebase-config) när ingen är inloggad. */
export function LoggaInView() {
  const [epost, setEpost] = useState('')
  const [losenord, setLosenord] = useState('')
  const [fel, setFel] = useState(false)
  const [skickar, setSkickar] = useState(false)

  async function loggaIn(e: FormEvent) {
    e.preventDefault()
    setFel(false)
    setSkickar(true)
    try {
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth')
      const { getFirebaseApp } = await import('../lib/firebase')
      await signInWithEmailAndPassword(getAuth(getFirebaseApp()), epost, losenord)
    } catch {
      setFel(true)
    } finally {
      setSkickar(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-8">
      <Adresskylt stor />
      <form onSubmit={(e) => void loggaIn(e)} className="flex w-full max-w-xs flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-dis">
          E-post
          <input
            type="email"
            autoComplete="email"
            required
            value={epost}
            onChange={(e) => setEpost(e.target.value)}
            className="rounded-lg border border-linje bg-panel px-3 py-2.5 text-base text-ljus"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-dis">
          Lösenord
          <input
            type="password"
            autoComplete="current-password"
            required
            value={losenord}
            onChange={(e) => setLosenord(e.target.value)}
            className="rounded-lg border border-linje bg-panel px-3 py-2.5 text-base text-ljus"
          />
        </label>
        {fel && (
          <p role="alert" className="text-sm text-fermob-lyft">
            Det gick inte att logga in. Kontrollera e-post och lösenord.
          </p>
        )}
        <button
          type="submit"
          disabled={skickar}
          className="mt-2 min-h-11 rounded-lg bg-fermob px-4 py-2.5 font-medium text-white disabled:opacity-60"
        >
          Logga in
        </button>
      </form>
    </div>
  )
}
