import { useEffect, useState, type FormEvent } from 'react'
import { useUid } from '../auth/AuthProvider'
import type { LogType } from '../data/types'
import { LOGGTYPER } from '../lib/logg'
import { inmatningsStil } from './Falt'
import { DroppeIkon, GodselIkon, PennaIkon, SaxIkon } from './Ikoner'
import { Knapp } from './Knapp'

const SNABBVAL: { typ: LogType; Ikon: typeof DroppeIkon }[] = [
  { typ: 'vattnat', Ikon: DroppeIkon },
  { typ: 'gödslat', Ikon: GodselIkon },
  { typ: 'beskuret', Ikon: SaxIkon },
]

/**
 * Snabbloggning: ett tryck loggar direkt, med möjlighet att ångra.
 * Loggar på växt (plantId) eller yta (areaId) — aldrig båda.
 */
export function SnabbLogg({ plantId, areaId }: { plantId?: string; areaId?: string }) {
  const uid = useUid()
  const [senaste, setSenaste] = useState<{ id: string; typ: LogType }>()
  const [antecknar, setAntecknar] = useState(false)
  const [text, setText] = useState('')

  useEffect(() => {
    if (!senaste) return
    const timer = setTimeout(() => setSenaste(undefined), 6000)
    return () => clearTimeout(timer)
  }, [senaste])

  function logga(typ: LogType, note?: string) {
    void (async () => {
      const { skapaLoggpost } = await import('../data/repo')
      const id = skapaLoggpost(uid, { plantId, areaId, type: typ, note })
      setSenaste({ id, typ })
    })()
  }

  function angra() {
    if (!senaste) return
    const { id } = senaste
    setSenaste(undefined)
    void (async () => {
      const { taBortLoggpost } = await import('../data/repo')
      taBortLoggpost(uid, id)
    })()
  }

  function sparaAnteckning(e: FormEvent) {
    e.preventDefault()
    const trimmad = text.trim()
    if (!trimmad) return
    logga('anteckning', trimmad)
    setText('')
    setAntecknar(false)
  }

  return (
    <section aria-label="Logga skötsel">
      <div className="grid grid-cols-3 gap-2">
        {SNABBVAL.map(({ typ, Ikon }) => (
          <button
            key={typ}
            type="button"
            onClick={() => logga(typ)}
            className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md border border-orm/35 bg-lov/10 px-2 py-1.5 text-orm transition-colors active:bg-lov/25"
          >
            <Ikon width={20} height={20} />
            <span className="text-xs font-medium">{LOGGTYPER[typ]}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 flex min-h-8 items-center justify-between gap-2">
        {senaste ? (
          <p className="text-sm text-orm" role="status">
            {LOGGTYPER[senaste.typ]} — antecknat.
          </p>
        ) : (
          <span />
        )}
        {senaste ? (
          <button
            type="button"
            onClick={angra}
            className="min-h-8 rounded px-2 text-sm text-fermob underline underline-offset-2"
          >
            Ångra
          </button>
        ) : (
          !antecknar && (
            <button
              type="button"
              onClick={() => setAntecknar(true)}
              className="flex min-h-8 items-center gap-1.5 rounded px-2 text-sm text-panel/70"
            >
              <PennaIkon width={16} height={16} />
              Skriv anteckning
            </button>
          )
        )}
      </div>

      {antecknar && (
        <form onSubmit={sparaAnteckning} className="mt-1 flex flex-col gap-2">
          <textarea
            rows={3}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Anteckning"
            className={inmatningsStil}
          />
          <div className="flex gap-2">
            <Knapp type="submit" variant="primar">
              Spara anteckning
            </Knapp>
            <Knapp
              onClick={() => {
                setAntecknar(false)
                setText('')
              }}
            >
              Avbryt
            </Knapp>
          </div>
        </form>
      )}
    </section>
  )
}
