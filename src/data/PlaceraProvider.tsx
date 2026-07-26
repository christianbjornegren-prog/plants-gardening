import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * Kuben: växt, plats och ritning nås från varandras håll. Det här är den lilla
 * delade avsikten "nästa tryck på ritningen placerar DEN HÄR växten", som
 * överlever navigering mellan vyer — i stället för att trås genom fyra
 * router-parametrar. Se docs/ARKITEKTUR.md.
 */
export interface PlaceraUppdrag {
  vaxtId: string
  vaxtNamn: string
}

interface PlaceraApi {
  uppdrag?: PlaceraUppdrag
  begar: (uppdrag: PlaceraUppdrag) => void
  avbryt: () => void
}

const PlaceraContext = createContext<PlaceraApi | undefined>(undefined)

export function PlaceraProvider({ children }: { children: ReactNode }) {
  const [uppdrag, setUppdrag] = useState<PlaceraUppdrag>()

  const begar = useCallback((nytt: PlaceraUppdrag) => setUppdrag(nytt), [])
  const avbryt = useCallback(() => setUppdrag(undefined), [])

  const varde = useMemo(() => ({ uppdrag, begar, avbryt }), [uppdrag, begar, avbryt])
  return <PlaceraContext.Provider value={varde}>{children}</PlaceraContext.Provider>
}

export function usePlacera(): PlaceraApi {
  const api = useContext(PlaceraContext)
  if (!api) throw new Error('usePlacera kräver PlaceraProvider')
  return api
}
