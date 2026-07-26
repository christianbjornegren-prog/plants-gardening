import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useUid } from '../auth/AuthProvider'
import type { Handelse, Plats, Tradgard, Vaxt } from './types'

export interface DataVarde {
  tradgardar: Tradgard[]
  platser: Plats[]
  vaxter: Vaxt[]
  /** Sorterad med nyaste först. */
  handelser: Handelse[]
  /** false tills migrering körts och alla lyssnare svarat — visa inget innan dess. */
  laddad: boolean
}

const DataContext = createContext<DataVarde | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const uid = useUid()
  const [tradgardar, setTradgardar] = useState<Tradgard[]>()
  const [platser, setPlatser] = useState<Plats[]>()
  const [vaxter, setVaxter] = useState<Vaxt[]>()
  const [handelser, setHandelser] = useState<Handelse[]>()

  useEffect(() => {
    let aktiv = true
    const stangare: (() => void)[] = []
    void (async () => {
      const repo = await import('./repo')
      // Migreringen körs FÖRE lyssnarna så att vyerna aldrig ser ett halvt
      // migrerat tillstånd (se docs/ARKITEKTUR.md).
      await repo.sakerstallDatamodell(uid)
      if (!aktiv) return
      stangare.push(
        repo.lyssnaPaTradgardar(uid, (nya) => aktiv && setTradgardar(nya)),
        repo.lyssnaPaPlatser(uid, (nya) => aktiv && setPlatser(nya)),
        repo.lyssnaPaVaxter(uid, (nya) => aktiv && setVaxter(nya)),
        repo.lyssnaPaHandelser(uid, (nya) => aktiv && setHandelser(nya)),
      )
    })()
    return () => {
      aktiv = false
      for (const stang of stangare) stang()
    }
  }, [uid])

  const varde = useMemo<DataVarde>(
    () => ({
      tradgardar: tradgardar ?? [],
      platser: platser ?? [],
      vaxter: vaxter ?? [],
      handelser: handelser ?? [],
      laddad:
        tradgardar !== undefined &&
        platser !== undefined &&
        vaxter !== undefined &&
        handelser !== undefined,
    }),
    [tradgardar, platser, vaxter, handelser],
  )

  return <DataContext.Provider value={varde}>{children}</DataContext.Provider>
}

export function useData(): DataVarde {
  const varde = useContext(DataContext)
  if (!varde) throw new Error('useData kräver DataProvider')
  return varde
}

/* ------------------------------------------------------------- uppslagshjälp */

export function platsNamn(platser: Plats[], id: string | undefined): string | undefined {
  if (!id) return undefined
  return platser.find((p) => p.id === id)?.namn
}

export function tradgardNamn(tradgardar: Tradgard[], id: string | undefined): string | undefined {
  if (!id) return undefined
  return tradgardar.find((t) => t.id === id)?.namn
}

/** Trädgårdar som har mått, och därmed en ritning. */
export function medRitning(tradgardar: Tradgard[]): Tradgard[] {
  return tradgardar.filter((t) => t.widthM !== undefined && t.heightM !== undefined)
}
