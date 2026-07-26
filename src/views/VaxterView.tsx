import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { FotoBild } from '../components/FotoBild'
import { inmatningsStil } from '../components/Falt'
import { SokIkon } from '../components/Ikoner'
import { Knapp } from '../components/Knapp'
import { useNyVaxt } from '../components/NyVaxt'
import { TomtLage } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import type { Vaxt } from '../data/types'
import { antalVaxter } from '../lib/etiketter'
import { senasteFotoPerVaxt } from '../lib/handelser'

/**
 * Överblicken över allt hon äger: bildkort, inte textrader. Segmentet väljer
 * trädgård, rubrikerna är platser. Två nivåer räcker.
 */
type Urval = 'alla' | 'utan-plats' | 'planerade' | string

export function VaxterView() {
  const { vaxter, platser, tradgardar, handelser, laddad } = useData()
  const { oppna } = useNyVaxt()
  const [urval, setUrval] = useState<Urval>('alla')
  const [sok, setSok] = useState('')

  if (!laddad) return null

  const fotoAvVaxt = senasteFotoPerVaxt(handelser)
  const platsAvId = new Map(platser.map((p) => [p.id, p]))

  const sokt = sok.trim().toLowerCase()
  const matchar = (v: Vaxt) =>
    !sokt ||
    v.namn.toLowerCase().includes(sokt) ||
    (v.sort?.toLowerCase().includes(sokt) ?? false) ||
    (platsAvId.get(v.platsId ?? '')?.namn.toLowerCase().includes(sokt) ?? false)

  const iUrval = vaxter.filter((v) => {
    if (!matchar(v)) return false
    if (urval === 'alla') return true
    if (urval === 'utan-plats') return !v.platsId
    if (urval === 'planerade') return v.status === 'planerad'
    return platsAvId.get(v.platsId ?? '')?.tradgardId === urval
  })

  // Gruppering på plats, med hemlösa först — de är dem hon behöver hitta.
  const grupper = new Map<string, Vaxt[]>()
  for (const v of iUrval) {
    const nyckel = v.platsId ?? ''
    grupper.set(nyckel, [...(grupper.get(nyckel) ?? []), v])
  }
  const ordnade = [...grupper.entries()].sort(([a], [b]) => {
    if (a === '') return -1
    if (b === '') return 1
    return (platsAvId.get(a)?.namn ?? '').localeCompare(platsAvId.get(b)?.namn ?? '', 'sv')
  })

  if (vaxter.length === 0) {
    return (
      <TomtLage
        rubrik="Här bor inga växter än"
        text="Lägg till den första. Ett namn räcker — plats och det andra kan komma sen."
        atgard={
          <Knapp variant="primar" onClick={() => oppna()}>
            Fota första växten
          </Knapp>
        }
      />
    )
  }

  return (
    <div className="tona-upp mx-auto w-full max-w-3xl">
      <div className="sticky top-0 z-10 border-b border-linje bg-botten px-5 pt-5 pb-3 md:px-8">
        <div className="relative mb-3">
          <SokIkon
            width={18}
            height={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-dis-svag"
          />
          <input
            type="search"
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            placeholder="Sök växt, sort eller plats"
            aria-label="Sök"
            className={`${inmatningsStil} pl-10`}
          />
        </div>
        <div className="dolj-scroll -mx-5 flex gap-2 overflow-x-auto px-5 md:-mx-8 md:px-8">
          <Chip vald={urval === 'alla'} onClick={() => setUrval('alla')}>
            Alla
          </Chip>
          {tradgardar.map((t) => (
            <Chip key={t.id} vald={urval === t.id} onClick={() => setUrval(t.id)}>
              {t.namn}
            </Chip>
          ))}
          <Chip vald={urval === 'utan-plats'} onClick={() => setUrval('utan-plats')}>
            Utan plats
          </Chip>
          <Chip vald={urval === 'planerade'} onClick={() => setUrval('planerade')}>
            Planerade
          </Chip>
        </div>
      </div>

      <div className="flex flex-col gap-7 px-5 py-6 md:px-8">
        {ordnade.length === 0 && (
          <p className="py-10 text-center text-sm text-dis">Inga växter matchar.</p>
        )}

        {ordnade.map(([platsId, ivaxter]) => {
          const plats = platsAvId.get(platsId)
          const tradgard = tradgardar.find((t) => t.id === plats?.tradgardId)
          return (
            <section key={platsId || 'utan-plats'}>
              <h2 className="mb-2 flex items-baseline justify-between gap-3">
                {plats ? (
                  <Link
                    to={`/platser/${plats.id}`}
                    className="truncate text-xs font-medium tracking-[0.08em] text-tra uppercase"
                  >
                    {plats.namn}
                    {tradgard && <span className="text-dis-svag"> · {tradgard.namn}</span>}
                  </Link>
                ) : (
                  <span className="text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
                    Utan plats
                  </span>
                )}
                <span className="mono shrink-0 text-xs text-dis-svag">
                  {antalVaxter(ivaxter.length)}
                </span>
              </h2>

              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ivaxter.map((v) => (
                  <li key={v.id}>
                    <Link to={`/vaxter/${v.id}`} className="flex flex-col gap-1.5">
                      <div className="relative">
                        <FotoBild
                          fotoRef={fotoAvVaxt.get(v.id)}
                          alt={v.namn}
                          className={`aspect-square w-full rounded-xl ${
                            v.status === 'planerad' ? 'opacity-60 ring-1 ring-linje' : ''
                          }`}
                        />
                        {v.status === 'planerad' && (
                          <span className="mono absolute top-2 left-2 rounded bg-botten/85 px-1.5 py-0.5 text-[10px] text-dis">
                            planerad
                          </span>
                        )}
                      </div>
                      <span className="truncate text-sm text-ljus">{v.namn}</span>
                      {v.sort && <span className="truncate text-xs text-dis-svag">{v.sort}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
