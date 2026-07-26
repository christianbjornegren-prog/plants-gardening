import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useUid } from '../auth/AuthProvider'
import { Falt, inmatningsStil } from '../components/Falt'
import { Knapp, LankKnapp } from '../components/Knapp'
import { SaknasVy, VyHuvud } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import type { Area, Plant } from '../data/types'

export function VaxtFormView() {
  const { id } = useParams()
  const { vaxter, ytor, laddad } = useData()
  const [sokParams] = useSearchParams()
  if (!laddad) return null
  const befintlig = id ? vaxter.find((v) => v.id === id) : undefined
  if (id && !befintlig) return <SaknasVy text="Växten finns inte längre." tillbakaTill="/vaxter" />

  if (ytor.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl p-5 md:p-8">
        <VyHuvud titel="Ny växt" tillbakaTill="/vaxter" />
        <div className="mt-10 flex flex-col items-center gap-5 text-center">
          <p className="max-w-xs text-panel/60">
            En växt behöver en plats att bo på. Skapa en yta först — en rabatt, en pallkrage
            eller en fönsterbräda.
          </p>
          <LankKnapp to="/ytor/ny" variant="primar">
            Skapa en yta
          </LankKnapp>
        </div>
      </div>
    )
  }

  return (
    <VaxtForm
      key={id ?? 'ny'}
      befintlig={befintlig}
      ytor={ytor}
      forvaldYta={sokParams.get('yta') ?? undefined}
    />
  )
}

function VaxtForm({
  befintlig,
  ytor,
  forvaldYta,
}: {
  befintlig: Plant | undefined
  ytor: Area[]
  forvaldYta: string | undefined
}) {
  const uid = useUid()
  const navigate = useNavigate()
  const [namn, setNamn] = useState(befintlig?.name ?? '')
  const [ytaId, setYtaId] = useState(
    befintlig?.areaId ?? (forvaldYta && ytor.some((y) => y.id === forvaldYta) ? forvaldYta : ''),
  )
  const [anteckning, setAnteckning] = useState(befintlig?.note ?? '')
  const [fotoFil, setFotoFil] = useState<File>()
  const [sparar, setSparar] = useState(false)

  function valjFil(e: ChangeEvent<HTMLInputElement>) {
    setFotoFil(e.target.files?.[0])
  }

  function spara(e: FormEvent) {
    e.preventDefault()
    setSparar(true)
    void (async () => {
      try {
        const repo = await import('../data/repo')
        if (befintlig) {
          repo.uppdateraVaxt(uid, befintlig.id, {
            name: namn.trim(),
            note: anteckning.trim() || undefined,
          })
          if (ytaId !== befintlig.areaId) {
            repo.flyttaVaxt(uid, befintlig, ytaId)
          }
          navigate(`/vaxter/${befintlig.id}`, { replace: true })
          return
        }

        let photoRefs: string[] = []
        if (fotoFil) {
          const { komprimeraBild } = await import('../lib/bild')
          const { sparaFoto } = await import('../lib/photoStore')
          photoRefs = [await sparaFoto(uid, await komprimeraBild(fotoFil))]
        }
        const nyttId = repo.skapaVaxt(uid, {
          name: namn.trim(),
          areaId: ytaId,
          note: anteckning.trim() || undefined,
          photoRefs,
        })
        navigate(`/vaxter/${nyttId}`, { replace: true })
      } finally {
        setSparar(false)
      }
    })()
  }

  const tillbaka = befintlig ? `/vaxter/${befintlig.id}` : '/vaxter'

  return (
    <div className="mx-auto w-full max-w-2xl p-5 md:p-8">
      <VyHuvud titel={befintlig ? 'Ändra växt' : 'Ny växt'} tillbakaTill={tillbaka} />
      <form onSubmit={spara} className="flex flex-col gap-5">
        <Falt etikett="Namn">
          <input
            type="text"
            required
            autoFocus
            value={namn}
            onChange={(e) => setNamn(e.target.value)}
            placeholder="Hortensian vid trappan"
            className={inmatningsStil}
          />
        </Falt>

        <Falt etikett="Yta">
          <select
            required
            value={ytaId}
            onChange={(e) => setYtaId(e.target.value)}
            className={inmatningsStil}
          >
            <option value="" disabled>
              Välj yta …
            </option>
            {ytor.map((yta) => (
              <option key={yta.id} value={yta.id}>
                {yta.name}
              </option>
            ))}
          </select>
        </Falt>

        <Falt etikett="Anteckning">
          <textarea
            rows={3}
            value={anteckning}
            onChange={(e) => setAnteckning(e.target.value)}
            className={inmatningsStil}
          />
        </Falt>

        {!befintlig && (
          <Falt etikett="Foto">
            <input
              type="file"
              accept="image/*"
              onChange={valjFil}
              className="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-panel file:px-3.5 file:py-2.5 file:text-sm file:text-ljus"
            />
          </Falt>
        )}

        <div className="mt-2 flex gap-3">
          <Knapp type="submit" variant="primar" disabled={sparar} className="flex-1">
            {sparar ? 'Sparar …' : 'Spara'}
          </Knapp>
          <LankKnapp to={tillbaka}>Avbryt</LankKnapp>
        </div>
      </form>
    </div>
  )
}
