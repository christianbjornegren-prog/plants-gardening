import { Link } from 'react-router-dom'
import { Adresskylt } from '../components/Adresskylt'
import { FotoBild } from '../components/FotoBild'
import { Knapp } from '../components/Knapp'
import { useNyVaxt } from '../components/NyVaxt'
import { PilIkon } from '../components/Ikoner'
import { Tidslinje } from '../components/Tidslinje'
import { TomtLage } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import type { Handelse, Plats, Vaxt } from '../data/types'
import { antalPlatser, antalVaxter } from '../lib/etiketter'
import { formatDatum, formatSedan } from '../lib/format'
import {
  handelserSedan,
  ofotograferade,
  senastaFotot,
  senasteFotoPerVaxt,
} from '../lib/handelser'

/**
 * Hem — överblicken. Svarar på "vad har jag, och vad hände senast?".
 * Öppnar med ett stort foto, inte med en rubrik.
 */
export function HemView() {
  const { vaxter, platser, handelser, laddad } = useData()
  const { oppna } = useNyVaxt()

  if (!laddad) return null

  const harNagot = vaxter.length > 0 || platser.length > 0
  if (!harNagot) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <Adresskylt stor />
        <TomtLage
          rubrik="Trädgården är tom än"
          text="Börja med att fota något som växer. Namn räcker — plats och det andra kan komma sen."
          atgard={
            <Knapp variant="primar" onClick={() => oppna()}>
              Fota första växten
            </Knapp>
          }
        />
      </div>
    )
  }

  const hjalte = senastaFotot(handelser)
  const veckan = handelserSedan(handelser, 7)
  const planerade = [
    ...vaxter.filter((v) => v.status === 'planerad'),
    ...platser.filter((p) => p.status === 'planerad'),
  ]
  const glomda = ofotograferade(vaxter, handelser).slice(0, 3)
  const fotoAvVaxt = senasteFotoPerVaxt(handelser)

  return (
    <div className="tona-upp mx-auto w-full max-w-2xl">
      <Hjalte handelse={hjalte} vaxter={vaxter} platser={platser} />

      <div className="flex flex-col gap-8 px-5 pt-6 pb-10 md:px-8">
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm text-dis">
          <span className="mono text-ljus">{antalVaxter(vaxter.length)}</span>
          <span>på</span>
          <span className="mono text-ljus">{antalPlatser(platser.length)}</span>
        </p>

        <Avsnitt
          rubrik="Den här veckan"
          tom={veckan.length === 0 ? 'Inget loggat den här veckan.' : undefined}
        >
          {/* Små bilder: hjältebilden bär redan det visuella, och veckan
              ska gå att skumma utan att scrolla förbi fem helbilder. */}
          <Tidslinje
            handelser={veckan.slice(0, 6)}
            vaxter={vaxter}
            platser={platser}
            visaMal
            bilder="sma"
          />
        </Avsnitt>

        {planerade.length > 0 && (
          <Avsnitt rubrik="Planerat">
            <ul className="flex flex-col gap-1">
              {planerade.map((rad) => (
                <li key={rad.id}>
                  <Link
                    to={'typ' in rad ? `/platser/${rad.id}` : `/vaxter/${rad.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-dashed border-linje px-3 text-sm text-ljus hover:bg-panel"
                  >
                    <span className="truncate">{rad.namn}</span>
                    <span className="mono shrink-0 text-[11px] text-dis-svag">
                      {'typ' in rad ? 'plats' : 'växt'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Avsnitt>
        )}

        {glomda.length > 0 && (
          <Avsnitt rubrik="Inte fotad på länge">
            <ul className="grid grid-cols-3 gap-3">
              {glomda.map(({ vaxt, dagarSedan }) => (
                <li key={vaxt.id}>
                  <Link to={`/vaxter/${vaxt.id}`} className="flex flex-col gap-1.5">
                    <FotoBild
                      fotoRef={fotoAvVaxt.get(vaxt.id)}
                      alt={vaxt.namn}
                      className="aspect-square w-full rounded-lg"
                    />
                    <span className="truncate text-xs text-ljus">{vaxt.namn}</span>
                    <span className="mono text-[10px] text-dis-svag">
                      {dagarSedan === undefined ? 'aldrig fotad' : formatSedan(dagarSedan)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Avsnitt>
        )}

        <Link
          to="/logg"
          className="inline-flex items-center gap-1.5 self-start text-sm text-lov underline underline-offset-4"
        >
          Hela loggen
          <PilIkon width={14} height={14} />
        </Link>
      </div>
    </div>
  )
}

function Avsnitt({
  rubrik,
  tom,
  children,
}: {
  rubrik: string
  tom?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-1 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
        {rubrik}
      </h2>
      {tom ? <p className="py-3 text-sm text-dis">{tom}</p> : children}
    </section>
  )
}

/** Hjältebilden: senaste händelsen med foto. Saknas den blir kylten hjälten. */
function Hjalte({
  handelse,
  vaxter,
  platser,
}: {
  handelse: Handelse | undefined
  vaxter: Vaxt[]
  platser: Plats[]
}) {
  if (!handelse) {
    return (
      <div className="flex aspect-[4/3] max-h-72 w-full flex-col items-center justify-center gap-4 border-b border-linje bg-panel">
        <Adresskylt stor />
        <p className="max-w-xs px-6 text-center text-sm/6 text-dis">
          Ingen bild än. Nästa foto du tar hamnar här.
        </p>
      </div>
    )
  }

  const vaxt = vaxter.find((v) => v.id === handelse.vaxtId)
  const plats = platser.find((p) => p.id === handelse.platsId)
  const till = vaxt ? `/vaxter/${vaxt.id}` : plats ? `/platser/${plats.id}` : '/logg'

  return (
    <Link to={till} className="relative block">
      <FotoBild
        fotoRef={handelse.fotoRef}
        alt={vaxt?.namn ?? plats?.namn ?? 'Senaste bilden'}
        className="aspect-[4/3] max-h-[26rem] w-full"
      />
      {/* Läsbarhet utan glasmorfism: en enkel mörk platta i botten. */}
      <div className="absolute inset-x-0 bottom-0 bg-botten/80 px-5 py-3 md:px-8">
        <p className="font-display text-lg font-semibold text-ljus">
          {vaxt?.namn ?? plats?.namn ?? 'Senaste bilden'}
        </p>
        <p className="mono text-xs text-dis">{formatDatum(new Date(handelse.datum))}</p>
      </div>
      <div className="absolute top-3 left-3 md:left-8">
        <Adresskylt />
      </div>
    </Link>
  )
}
