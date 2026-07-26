import { useNavigate, useParams } from 'react-router-dom'
import { useUid } from '../auth/AuthProvider'
import { LankKnapp, TaBortKnapp } from '../components/Knapp'
import { VaxtRad } from '../components/VaxtRad'
import { SaknasVy, VyHuvud } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import { sollageEtikett } from '../lib/etiketter'

export function YtaDetaljView() {
  const { id } = useParams()
  const { ytor, vaxter, laddad } = useData()
  const uid = useUid()
  const navigate = useNavigate()

  if (!laddad) return null
  const hittad = ytor.find((y) => y.id === id)
  if (!hittad) return <SaknasVy text="Ytan finns inte längre." tillbakaTill="/ytor" />
  const yta = hittad

  const vaxterHar = vaxter.filter((v) => v.areaId === yta.id)
  const detaljer = [yta.sunExposure && sollageEtikett(yta.sunExposure), yta.soil].filter(Boolean)

  function taBort() {
    void (async () => {
      const { taBortYta } = await import('../data/repo')
      taBortYta(uid, yta.id)
      navigate('/ytor', { replace: true })
    })()
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-5 md:p-8">
      <VyHuvud
        titel={yta.name}
        tillbakaTill="/ytor"
        hoger={<LankKnapp to={`/ytor/${yta.id}/andra`}>Ändra</LankKnapp>}
      />

      {detaljer.length > 0 && (
        <p className="mb-3 text-sm text-panel/70">{detaljer.join(' · ')}</p>
      )}
      {yta.note && <p className="mb-3 whitespace-pre-wrap text-panel/85">{yta.note}</p>}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Växter här</h2>
          <LankKnapp to={`/vaxter/ny?yta=${yta.id}`} variant="primar">
            Lägg till växt
          </LankKnapp>
        </div>
        {vaxterHar.length === 0 ? (
          <p className="py-6 text-center text-sm text-panel/60">
            Här bor inga växter än.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {vaxterHar.map((vaxt) => (
              <VaxtRad key={vaxt.id} vaxt={vaxt} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 border-t border-panel/10 pt-6">
        {vaxterHar.length > 0 ? (
          <p className="text-sm text-panel/50">
            Ytan har växter — flytta eller ta bort dem innan ytan kan tas bort.
          </p>
        ) : (
          <TaBortKnapp onBekraftad={taBort}>Ta bort ytan</TaBortKnapp>
        )}
      </section>
    </div>
  )
}
