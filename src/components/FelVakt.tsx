import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { lyssnaPaDataFel, type DataFel } from '../data/fel'

/**
 * Gör datalagrets fel synliga.
 *
 * Utan detta ser en nekad skrivning ut som att knappen "flimrar till och går
 * tillbaka" (Firestore lägger på ändringen lokalt och rullar tillbaka när
 * servern nekar), och en nekad läsning ser ut som en app som hängt sig.
 */
export function FelVakt() {
  const [lasfel, setLasfel] = useState<DataFel>()
  /** Samma fel om och om igen ska inte bli en vägg av toasts. */
  const senastRef = useRef(0)

  useEffect(
    () =>
      lyssnaPaDataFel((fel) => {
        if (fel.typ === 'lasning') {
          setLasfel(fel)
          return
        }
        const nu = Date.now()
        if (nu - senastRef.current < 4000) return
        senastRef.current = nu
        toast.custom(
          () => (
            <div
              role="alert"
              className="flex w-full items-center gap-3 rounded-xl border border-fermob-lyft/40 bg-panel px-4 py-3"
            >
              <span className="flex-1 text-sm text-ljus">{fel.meddelande}</span>
              {fel.behorighet && <LoggaUtKnapp />}
            </div>
          ),
          { duration: 8000 },
        )
      }),
    [],
  )

  if (!lasfel) return null

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-50 flex items-center gap-3 border-b border-fermob-lyft/40 bg-panel px-4 py-3"
    >
      <span className="min-w-0 flex-1 text-sm text-ljus">{lasfel.meddelande}</span>
      {lasfel.behorighet ? (
        <LoggaUtKnapp />
      ) : (
        <button
          type="button"
          onClick={() => setLasfel(undefined)}
          className="min-h-9 shrink-0 px-2 text-sm text-dis hover:text-ljus"
        >
          Dölj
        </button>
      )}
    </div>
  )
}

function LoggaUtKnapp() {
  return (
    <button
      type="button"
      onClick={() => {
        void (async () => {
          const { getAuth, signOut } = await import('firebase/auth')
          const { getFirebaseApp } = await import('../lib/firebase')
          await signOut(getAuth(getFirebaseApp()))
        })()
      }}
      className="min-h-9 shrink-0 rounded-lg border border-linje px-3 text-sm text-fermob-lyft"
    >
      Logga in igen
    </button>
  )
}
