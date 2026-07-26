import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Adresskylt } from '../components/Adresskylt'
import { FotoBild } from '../components/FotoBild'
import { Knapp } from '../components/Knapp'
import { useNyVaxt } from '../components/NyVaxt'
import { PilIkon } from '../components/Ikoner'
import { Tidslinje } from '../components/Tidslinje'
import { TomtLage } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import type { Handelse, Vaxt } from '../data/types'
import { formatDatum } from '../lib/format'
import { handelserSedan, ofotograferade, senastaFotot, senasteFotoPerVaxt } from '../lib/handelser'

/**
 * Hem är en instrumentbräda, inte ett fotoalbum: siffrorna först, sedan vad
 * som hänt och vad som väntar.
 *
 * Den stora hjältebilden låg här förut och lästes som "du ska ladda upp ett
 * foto" — särskilt när den var tom. Nu är bilden ett kort bland andra, och
 * varje sektion säger med egna ord varför den finns.
 *
 * Tre sektioner ("Utan plats", "Väntar på sin första bild", "Dags att fota
 * igen") sa samma sak tre gånger: här är växter som saknar något. De är en
 * enda lista nu, där varje rad bär sitt eget skäl.
 */

const DAGAR_TILL_UPPFOLJNING = 60

export function HemView() {
  const { vaxter, platser, handelser, laddad } = useData()
  const { oppna } = useNyVaxt()

  if (!laddad) return null

  if (vaxter.length === 0 && platser.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <Adresskylt stor />
        <TomtLage
          rubrik="Trädgården är tom än"
          text="Börja med att fota en växt. Namn räcker — plats och det andra kan komma sen."
          atgard={
            <Knapp variant="primar" onClick={() => oppna()}>
              Fota första växten
            </Knapp>
          }
        />
      </div>
    )
  }

  const veckan = handelserSedan(handelser, 7)
  const planerade = [
    ...vaxter.filter((v) => v.status === 'planerad'),
    ...platser.filter((p) => p.status === 'planerad'),
  ]
  const hemlosa = vaxter.filter((v) => !v.platsId && v.status === 'finns')
  const uppfoljning = ofotograferade(vaxter, handelser, DAGAR_TILL_UPPFOLJNING)
  const fotoAvVaxt = senasteFotoPerVaxt(handelser)
  const senaste = senastaFotot(handelser)

  // En rad per växt, med det mest handfasta skälet. Saknad plats väger tyngst:
  // utan plats går växten inte att hitta på ritningen.
  const attGora: { vaxt: Vaxt; skal: string }[] = []
  const redan = new Set<string>()
  for (const v of hemlosa) {
    attGora.push({ vaxt: v, skal: 'Ingen plats vald' })
    redan.add(v.id)
  }
  for (const { vaxt, dagarSedan } of uppfoljning) {
    if (redan.has(vaxt.id)) continue
    attGora.push({
      vaxt,
      skal:
        dagarSedan === undefined
          ? 'Ingen bild än'
          : `Inte fotad på ${dagarSedan} dagar`,
    })
  }

  return (
    <div className="tona-upp mx-auto w-full max-w-2xl px-5 py-5 md:px-8 md:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Adresskylt />
        <span className="mono text-xs text-dis-svag">
          {new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long' }).format(new Date())}
        </span>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-3">
        <Nyckeltal etikett="Växter" varde={vaxter.length} till="/vaxter" />
        <Nyckeltal etikett="Platser" varde={platser.length} />
      </dl>

      <div className="mb-8">
        <Knapp variant="primar" onClick={() => oppna()}>
          Fota en växt
        </Knapp>
      </div>

      <div className="flex flex-col gap-8">
        {senaste && <SenasteBilden handelse={senaste} />}

        {/* Tom vecka visas bara när det inte finns något annat att titta på —
            annars är det en rubrik som säger "ingenting". */}
        {(veckan.length > 0 || (attGora.length === 0 && planerade.length === 0)) && (
          <Avsnitt
            rubrik="Den här veckan"
            tom={veckan.length === 0 ? 'Inget loggat den här veckan.' : undefined}
          >
            <Tidslinje
              handelser={veckan.slice(0, 6)}
              vaxter={vaxter}
              platser={platser}
              visaMal
              bilder="sma"
            />
          </Avsnitt>
        )}

        {planerade.length > 0 && (
          <Avsnitt rubrik="Planerat" underrubrik="Ritat men inte planterat än.">
            <ul className="flex flex-col gap-1">
              {planerade.map((rad) => (
                <li key={rad.id}>
                  <Link
                    to={'typ' in rad ? `/platser/${rad.id}` : `/vaxter/${rad.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-dashed border-linje px-3 text-sm text-tusch hover:bg-panel"
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

        {attGora.length > 0 && (
          <Avsnitt rubrik="Att göra" underrubrik="Växter som saknar något.">
            <ul className="flex flex-col">
              {attGora.slice(0, 6).map(({ vaxt, skal }) => (
                <li key={vaxt.id}>
                  <Link
                    to={`/vaxter/${vaxt.id}`}
                    className="flex min-h-14 items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-panel"
                  >
                    <FotoBild
                      fotoRef={fotoAvVaxt.get(vaxt.id)}
                      alt={vaxt.namn}
                      className="size-11 shrink-0 rounded-lg"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-tusch">{vaxt.namn}</span>
                      <span className="block truncate text-xs text-dis">{skal}</span>
                    </span>
                    <PilIkon width={14} height={14} className="shrink-0 text-dis-svag" />
                  </Link>
                </li>
              ))}
            </ul>
          </Avsnitt>
        )}

        <Link
          to="/logg"
          className="inline-flex items-center gap-1.5 self-start text-sm text-orm underline underline-offset-4"
        >
          Hela loggen
          <PilIkon width={14} height={14} />
        </Link>
      </div>
    </div>
  )
}

function Nyckeltal({ etikett, varde, till }: { etikett: string; varde: number; till?: string }) {
  const innehall = (
    <>
      <dt className="text-xs text-dis">{etikett}</dt>
      <dd className="mono mt-1 text-2xl text-tusch">{varde}</dd>
    </>
  )
  return till ? (
    <Link
      to={till}
      className="rounded-2xl bg-salvia px-3 py-3 transition-opacity duration-200 ease-[var(--ease-mjuk)] hover:opacity-85"
    >
      {innehall}
    </Link>
  ) : (
    <div className="rounded-2xl bg-salvia px-3 py-3">{innehall}</div>
  )
}

function Avsnitt({
  rubrik,
  underrubrik,
  tom,
  children,
}: {
  rubrik: string
  underrubrik?: string
  tom?: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">{rubrik}</h2>
      {underrubrik && <p className="mt-1 text-xs text-dis">{underrubrik}</p>}
      {tom ? <p className="py-3 text-sm text-dis">{tom}</p> : <div className="mt-2">{children}</div>}
    </section>
  )
}

/** Senaste bilden som ett kort — inte som en helskärmshjälte. */
function SenasteBilden({ handelse }: { handelse: Handelse }) {
  const { vaxter, platser } = useData()
  const vaxt = vaxter.find((v) => v.id === handelse.vaxtId)
  const plats = platser.find((p) => p.id === handelse.platsId)
  const till = vaxt ? `/vaxter/${vaxt.id}` : plats ? `/platser/${plats.id}` : '/logg'

  return (
    <section>
      <h2 className="mb-2 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
        Senast i trädgården
      </h2>
      <Link
        to={till}
        className="flex items-center gap-4 rounded-2xl border border-linje bg-panel p-3 transition-colors duration-200 ease-[var(--ease-mjuk)] hover:bg-upphojd"
      >
        <FotoBild
          fotoRef={handelse.fotoRef}
          alt={vaxt?.namn ?? plats?.namn ?? 'Senaste bilden'}
          className="size-20 shrink-0 rounded-lg"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-semibold text-tusch">
            {vaxt?.namn ?? plats?.namn ?? 'Senaste bilden'}
          </span>
          <span className="mono block text-xs text-dis">
            {formatDatum(new Date(handelse.datum))}
          </span>
        </span>
        <PilIkon width={16} height={16} className="shrink-0 text-dis-svag" />
      </Link>
    </section>
  )
}
