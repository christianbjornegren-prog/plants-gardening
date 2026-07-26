import { Link } from 'react-router-dom'
import { useData } from '../data/DataProvider'
import { sollageEtikett } from '../lib/etiketter'
import { LankKnapp } from '../components/Knapp'
import { VyHuvud } from '../components/VyHuvud'

export function YtorView() {
  const { ytor, vaxter, laddad } = useData()
  if (!laddad) return null

  return (
    <div className="mx-auto w-full max-w-2xl p-5 md:p-8">
      <VyHuvud
        titel="Ytor"
        hoger={
          ytor.length > 0 && (
            <LankKnapp to="/ytor/ny" variant="primar">
              Ny yta
            </LankKnapp>
          )
        }
      />
      {ytor.length === 0 ? (
        <div className="mt-14 flex flex-col items-center gap-5 text-center">
          <p className="max-w-xs text-panel/60">
            Inga ytor än. En yta är en plats där växter bor — en rabatt, en pallkrage eller en
            fönsterbräda.
          </p>
          <LankKnapp to="/ytor/ny" variant="primar">
            Lägg till den första
          </LankKnapp>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {ytor.map((yta) => {
            const antal = vaxter.filter((v) => v.areaId === yta.id).length
            const detaljer = [
              yta.sunExposure && sollageEtikett(yta.sunExposure),
              yta.soil,
              antal === 1 ? '1 växt' : `${antal} växter`,
            ].filter(Boolean)
            return (
              <li key={yta.id}>
                <Link
                  to={`/ytor/${yta.id}`}
                  className="block rounded-lg border border-tra bg-tra/20 px-4 py-3"
                >
                  <span className="block font-medium">{yta.name}</span>
                  <span className="mt-0.5 block text-sm text-panel/60">
                    {detaljer.join(' · ')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
