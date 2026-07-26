import { useState } from 'react'
import { useDataRot } from '../auth/AuthProvider'
import { useData } from '../data/DataProvider'
import { Ark } from './Ark'
import { Knapp } from './Knapp'
import { inmatningsStil } from './Falt'

/**
 * Välj plats för en växt. Innehåller "Ny plats…" så att man aldrig behöver
 * lämna flödet för att skapa en — men man behöver heller aldrig välja alls.
 */
export function PlatsValjare({
  oppen,
  onOppenChange,
  valdPlatsId,
  onValj,
}: {
  oppen: boolean
  onOppenChange: (oppen: boolean) => void
  valdPlatsId?: string
  onValj: (platsId: string | undefined) => void
}) {
  const { platser, tradgardar } = useData()
  const uid = useDataRot()
  const [skaparI, setSkaparI] = useState<string>()
  const [nyttNamn, setNyttNamn] = useState('')

  function valj(id: string | undefined) {
    onValj(id)
    onOppenChange(false)
  }

  function skapa(tradgardId: string) {
    const namn = nyttNamn.trim()
    if (!namn) return
    void (async () => {
      const repo = await import('../data/repo')
      const id = repo.skapaPlats(uid, { tradgardId, namn, typ: 'annat' })
      setNyttNamn('')
      setSkaparI(undefined)
      valj(id)
    })()
  }

  return (
    <Ark oppen={oppen} onOppenChange={onOppenChange} titel="Var står den?">
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => valj(undefined)}
          className={`flex min-h-11 items-center rounded-lg px-3 text-left text-sm ${
            valdPlatsId === undefined ? 'bg-upphojd text-tusch' : 'text-dis hover:text-tusch'
          }`}
        >
          Ingen plats än
        </button>

        {tradgardar.map((tradgard) => {
          const iTradgard = platser.filter((p) => p.tradgardId === tradgard.id)
          return (
            <section key={tradgard.id} className="flex flex-col gap-1">
              <h3 className="px-3 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
                {tradgard.namn}
              </h3>
              {iTradgard.map((plats) => (
                <button
                  key={plats.id}
                  type="button"
                  onClick={() => valj(plats.id)}
                  className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-left text-sm ${
                    valdPlatsId === plats.id ? 'bg-upphojd text-tusch' : 'text-tusch hover:bg-upphojd'
                  }`}
                >
                  <span className="truncate">{plats.namn}</span>
                  {plats.status === 'planerad' && (
                    <span className="mono shrink-0 text-[10px] text-dis-svag">planerad</span>
                  )}
                </button>
              ))}

              {skaparI === tradgard.id ? (
                <div className="mt-1 flex gap-2 px-1">
                  <input
                    type="text"
                    autoFocus
                    value={nyttNamn}
                    onChange={(e) => setNyttNamn(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && skapa(tradgard.id)}
                    placeholder="Köksfönstret"
                    aria-label={`Namn på ny plats i ${tradgard.namn}`}
                    className={inmatningsStil}
                  />
                  <Knapp onClick={() => skapa(tradgard.id)}>Spara</Knapp>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNyttNamn('')
                    setSkaparI(tradgard.id)
                  }}
                  className="flex min-h-11 items-center px-3 text-left text-sm text-dis hover:text-tusch"
                >
                  Ny plats…
                </button>
              )}
            </section>
          )
        })}
      </div>
    </Ark>
  )
}
