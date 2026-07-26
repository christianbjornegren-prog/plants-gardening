import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useUid } from '../auth/AuthProvider'
import type { Area, LogEntry, Plant } from './types'

export interface DataVarde {
  ytor: Area[]
  vaxter: Plant[]
  /** Sorterad med nyaste först. */
  logg: LogEntry[]
  /** false tills alla lyssnare gett sitt första svar — visa inget innan dess. */
  laddad: boolean
}

const DataContext = createContext<DataVarde | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const uid = useUid()
  const [ytor, setYtor] = useState<Area[]>()
  const [vaxter, setVaxter] = useState<Plant[]>()
  const [logg, setLogg] = useState<LogEntry[]>()

  useEffect(() => {
    let aktiv = true
    const stangare: (() => void)[] = []
    void (async () => {
      const repo = await import('./repo')
      if (!aktiv) return
      stangare.push(
        repo.lyssnaPaYtor(uid, (nya) => {
          if (aktiv) setYtor(nya)
        }),
        repo.lyssnaPaVaxter(uid, (nya) => {
          if (aktiv) setVaxter(nya)
        }),
        repo.lyssnaPaLogg(uid, (nya) => {
          if (aktiv) setLogg(nya)
        }),
      )
    })()
    return () => {
      aktiv = false
      for (const stang of stangare) stang()
    }
  }, [uid])

  const varde: DataVarde = {
    ytor: ytor ?? [],
    vaxter: vaxter ?? [],
    logg: logg ?? [],
    laddad: ytor !== undefined && vaxter !== undefined && logg !== undefined,
  }
  return <DataContext.Provider value={varde}>{children}</DataContext.Provider>
}

export function useData(): DataVarde {
  const varde = useContext(DataContext)
  if (!varde) throw new Error('useData kräver DataProvider')
  return varde
}

export function ytaNamn(ytor: Area[], id: string): string {
  return ytor.find((y) => y.id === id)?.name ?? 'Okänd yta'
}
