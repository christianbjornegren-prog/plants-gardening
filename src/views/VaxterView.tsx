import { useData, ytaNamn } from '../data/DataProvider'
import { LankKnapp } from '../components/Knapp'
import { VaxtRad } from '../components/VaxtRad'
import { VyHuvud } from '../components/VyHuvud'

export function VaxterView() {
  const { vaxter, ytor, laddad } = useData()
  if (!laddad) return null

  return (
    <div className="mx-auto w-full max-w-2xl p-5 md:p-8">
      <VyHuvud
        titel="Växter"
        hoger={
          vaxter.length > 0 && (
            <LankKnapp to="/vaxter/ny" variant="primar">
              Ny växt
            </LankKnapp>
          )
        }
      />
      {vaxter.length === 0 ? (
        <div className="mt-14 flex flex-col items-center gap-5 text-center">
          <p className="max-w-xs text-panel/60">Här bor inga växter än.</p>
          <LankKnapp to="/vaxter/ny" variant="primar">
            Lägg till den första
          </LankKnapp>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {vaxter.map((vaxt) => (
            <VaxtRad key={vaxt.id} vaxt={vaxt} undertext={ytaNamn(ytor, vaxt.areaId)} />
          ))}
        </ul>
      )}
    </div>
  )
}
