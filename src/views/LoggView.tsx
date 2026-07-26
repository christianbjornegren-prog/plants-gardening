import { useState } from 'react'
import { Chip } from '../components/Chip'
import { Tidslinje } from '../components/Tidslinje'
import { VyHuvud } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import type { HandelseTyp } from '../data/types'
import { handelseEtikett } from '../lib/etiketter'

const TYPER: HandelseTyp[] = [
  'foto',
  'vattnat',
  'gödslat',
  'beskuret',
  'planterat',
  'flyttat',
  'anteckning',
]

/** Hela historiken, filtrerbar på växt, plats, trädgård och typ. */
export function LoggView() {
  const { handelser, vaxter, platser, tradgardar, laddad } = useData()
  const [typ, setTyp] = useState<HandelseTyp>()
  const [mal, setMal] = useState<string>()

  if (!laddad) return null

  const platsAvId = new Map(platser.map((p) => [p.id, p]))
  const vaxtAvId = new Map(vaxter.map((v) => [v.id, v]))

  function tradgardFor(id: string | undefined): string | undefined {
    if (!id) return undefined
    return platsAvId.get(id)?.tradgardId
  }

  const filtrerade = handelser.filter((h) => {
    if (typ && h.typ !== typ) return false
    if (!mal) return true
    if (mal.startsWith('t:')) {
      const tradgardId = mal.slice(2)
      const viaPlats = tradgardFor(h.platsId)
      const viaVaxt = tradgardFor(vaxtAvId.get(h.vaxtId ?? '')?.platsId)
      return viaPlats === tradgardId || viaVaxt === tradgardId
    }
    if (mal === 'utan-plats') {
      return h.vaxtId !== undefined && !vaxtAvId.get(h.vaxtId)?.platsId
    }
    return false
  })

  return (
    <div className="tona-upp mx-auto w-full max-w-2xl px-5 py-5 md:px-8 md:py-8">
      <VyHuvud titel="Logg" />

      {/* Radbryt hellre än scrolla: med dold scrollbar såg det bara ut som
          att sista filtret var avklippt. */}
      <div className="mb-2 flex flex-wrap gap-2">
        <Chip vald={!mal} onClick={() => setMal(undefined)}>
          Allt
        </Chip>
        {tradgardar.map((t) => (
          <Chip key={t.id} vald={mal === `t:${t.id}`} onClick={() => setMal(`t:${t.id}`)}>
            {t.namn}
          </Chip>
        ))}
        <Chip vald={mal === 'utan-plats'} onClick={() => setMal('utan-plats')}>
          Utan plats
        </Chip>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip vald={!typ} onClick={() => setTyp(undefined)}>
          Alla slag
        </Chip>
        {TYPER.map((t) => (
          <Chip key={t} vald={typ === t} onClick={() => setTyp(t)}>
            {handelseEtikett(t)}
          </Chip>
        ))}
      </div>

      <p className="mono mb-2 text-xs text-dis-svag">
        {filtrerade.length === 1 ? '1 händelse' : `${filtrerade.length} händelser`}
      </p>

      <Tidslinje
        handelser={filtrerade}
        vaxter={vaxter}
        platser={platser}
        visaMal
        tomText={
          handelser.length === 0
            ? 'Inget loggat än. Öppna en växt och tryck Vattnat — det är ett tryck.'
            : 'Inget matchar filtret.'
        }
      />
    </div>
  )
}
