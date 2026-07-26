import { useCallback, useEffect, useState } from 'react'

export interface Angring {
  /** Visas på knappen: "Ångra ta bort platsen". */
  etikett: string
  gor: () => void
}

const MAXDJUP = 20

/**
 * Ångra i ritläget. Varje åtgärd lägger sin MOTSATS på stacken när den utförs
 * — billigare och mer förutsägbart än att spara hela ritningen före varje
 * ändring.
 *
 * Stacken lever bara under sessionen i ritläget. Det räcker för det den är
 * till för: att våga prova.
 */
export function useAngra() {
  const [angringar, setAngringar] = useState<Angring[]>([])

  const minns = useCallback((etikett: string, gor: () => void) => {
    setAngringar((nu) => [...nu.slice(-(MAXDJUP - 1)), { etikett, gor }])
  }, [])

  const angra = useCallback(() => {
    setAngringar((nu) => {
      const sista = nu[nu.length - 1]
      if (!sista) return nu
      sista.gor()
      return nu.slice(0, -1)
    })
  }, [])

  const rensa = useCallback(() => setAngringar([]), [])

  // Cmd/Ctrl+Z — det är där handen redan ligger på en dator.
  useEffect(() => {
    function vidTangent(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        angra()
      }
    }
    window.addEventListener('keydown', vidTangent)
    return () => window.removeEventListener('keydown', vidTangent)
  }, [angra])

  return {
    angringar,
    minns,
    angra,
    rensa,
    kanAngra: angringar.length > 0,
    nastaEtikett: angringar[angringar.length - 1]?.etikett,
  }
}
