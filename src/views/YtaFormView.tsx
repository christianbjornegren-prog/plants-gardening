import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUid } from '../auth/AuthProvider'
import { Falt, inmatningsStil } from '../components/Falt'
import { Knapp, LankKnapp } from '../components/Knapp'
import { SaknasVy, VyHuvud } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import type { Area, SunExposure } from '../data/types'
import { SOLLAGEN } from '../lib/etiketter'

export function YtaFormView() {
  const { id } = useParams()
  const { ytor, laddad } = useData()
  if (!laddad) return null
  const befintlig = id ? ytor.find((y) => y.id === id) : undefined
  if (id && !befintlig) return <SaknasVy text="Ytan finns inte längre." tillbakaTill="/ytor" />
  return <YtaForm key={id ?? 'ny'} befintlig={befintlig} />
}

function YtaForm({ befintlig }: { befintlig: Area | undefined }) {
  const uid = useUid()
  const navigate = useNavigate()
  const [namn, setNamn] = useState(befintlig?.name ?? '')
  const [sollage, setSollage] = useState<SunExposure | undefined>(befintlig?.sunExposure)
  const [jordman, setJordman] = useState(befintlig?.soil ?? '')
  const [anteckning, setAnteckning] = useState(befintlig?.note ?? '')

  function spara(e: FormEvent) {
    e.preventDefault()
    void (async () => {
      const repo = await import('../data/repo')
      const falt = {
        name: namn.trim(),
        sunExposure: sollage,
        soil: jordman.trim() || undefined,
        note: anteckning.trim() || undefined,
      }
      if (befintlig) {
        repo.uppdateraYta(uid, befintlig.id, falt)
        navigate(`/ytor/${befintlig.id}`, { replace: true })
      } else {
        const nyttId = repo.skapaYta(uid, falt)
        navigate(`/ytor/${nyttId}`, { replace: true })
      }
    })()
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-5 md:p-8">
      <VyHuvud
        titel={befintlig ? 'Ändra yta' : 'Ny yta'}
        tillbakaTill={befintlig ? `/ytor/${befintlig.id}` : '/ytor'}
      />
      <form onSubmit={spara} className="flex flex-col gap-5">
        <Falt etikett="Namn">
          <input
            type="text"
            required
            autoFocus
            value={namn}
            onChange={(e) => setNamn(e.target.value)}
            placeholder="Rabatten vid staketet"
            className={inmatningsStil}
          />
        </Falt>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Solläge</span>
          <div className="flex gap-2">
            {SOLLAGEN.map(({ varde, etikett }) => (
              <button
                key={varde}
                type="button"
                aria-pressed={sollage === varde}
                onClick={() => setSollage(sollage === varde ? undefined : varde)}
                className={`min-h-11 flex-1 rounded-md border px-2 text-sm transition-colors ${
                  sollage === varde
                    ? 'border-panel bg-panel text-ljus'
                    : 'border-panel/25 text-panel/80'
                }`}
              >
                {etikett}
              </button>
            ))}
          </div>
        </div>

        <Falt etikett="Jordmån">
          <input
            type="text"
            value={jordman}
            onChange={(e) => setJordman(e.target.value)}
            placeholder="Lerig, sandig, mullrik …"
            className={inmatningsStil}
          />
        </Falt>

        <Falt etikett="Anteckning">
          <textarea
            rows={3}
            value={anteckning}
            onChange={(e) => setAnteckning(e.target.value)}
            className={inmatningsStil}
          />
        </Falt>

        <div className="mt-2 flex gap-3">
          <Knapp type="submit" variant="primar" className="flex-1">
            Spara
          </Knapp>
          <LankKnapp to={befintlig ? `/ytor/${befintlig.id}` : '/ytor'}>Avbryt</LankKnapp>
        </div>
      </form>
    </div>
  )
}
