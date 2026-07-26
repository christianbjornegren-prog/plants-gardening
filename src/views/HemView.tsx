import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Adresskylt } from '../components/Adresskylt'
import { FotoBild } from '../components/FotoBild'
import { Knapp, LankKnapp } from '../components/Knapp'
import { useNyVaxt } from '../components/NyVaxt'
import { PilIkon } from '../components/Ikoner'
import { Tidslinje } from '../components/Tidslinje'
import { TomtLage } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import type { Handelse, Vaxt } from '../data/types'
import { formatDatum, formatDatumKort } from '../lib/format'
import { handelserSedan, ofotograferade, senastaFotot, senasteFotoPerVaxt } from '../lib/handelser'

/**
 * Hem är en instrumentbräda, inte ett fotoalbum: siffrorna först, sedan vad
 * som hänt och vad som väntar.
 *
 * Den stora hjältebilden låg här förut och lästes som "du ska ladda upp ett
 * foto" — särskilt när den var tom. Nu är bilden ett kort bland andra, och
 * varje sektion säger med egna ord varför den finns.
 */

const DAGAR_TILL_UPPFOLJNING = 60

export function HemView() {
  const { vaxter, platser, tradgardar, handelser, laddad } = useData()
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
  const aldrigFotade = uppfoljning.filter((r) => r.dagarSedan === undefined).map((r) => r.vaxt)
  const langeSedan = uppfoljning.filter((r) => r.dagarSedan !== undefined).slice(0, 6)
  const fotoAvVaxt = senasteFotoPerVaxt(handelser)
  const senaste = senastaFotot(handelser)
  const ritningar = tradgardar.filter((t) => t.widthM !== undefined)

  return (
    <div className="tona-upp mx-auto w-full max-w-2xl px-5 py-5 md:px-8 md:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Adresskylt />
        <span className="mono text-xs text-dis-svag">
          {new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long' }).format(new Date())}
        </span>
      </div>

      <dl className="mb-6 grid grid-cols-3 gap-3">
        <Nyckeltal etikett="Växter" varde={vaxter.length} till="/vaxter" />
        <Nyckeltal etikett="Platser" varde={platser.length} />
        <Nyckeltal etikett="Denna vecka" varde={veckan.length} till="/logg" />
      </dl>

      <div className="mb-8 flex flex-wrap gap-2">
        <Knapp variant="primar" onClick={() => oppna()}>
          Fota en växt
        </Knapp>
        {ritningar.length > 0 && <LankKnapp to="/ritning">Öppna ritningen</LankKnapp>}
      </div>

      <div className="flex flex-col gap-8">
        {senaste && <SenasteBilden handelse={senaste} />}

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

        {planerade.length > 0 && (
          <Avsnitt rubrik="Planerat" underrubrik="Ritat men inte planterat än.">
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

        {hemlosa.length > 0 && (
          <Avsnitt
            rubrik="Utan plats"
            underrubrik="Appen vet inte var de står. Öppna kortet och välj plats."
          >
            <VaxtRutor vaxter={hemlosa.slice(0, 6)} fotoAvVaxt={fotoAvVaxt} />
          </Avsnitt>
        )}

        {aldrigFotade.length > 0 && (
          <Avsnitt
            rubrik="Väntar på sin första bild"
            underrubrik="Utan bild går det inte att följa dem över säsongen."
          >
            <VaxtRutor vaxter={aldrigFotade.slice(0, 6)} fotoAvVaxt={fotoAvVaxt} />
          </Avsnitt>
        )}

        {langeSedan.length > 0 && (
          <Avsnitt
            rubrik="Dags att fota igen"
            underrubrik={`Inte fotade på ${DAGAR_TILL_UPPFOLJNING} dagar. En bild nu ger jämförelsen mot i våras.`}
          >
            <ul className="grid grid-cols-3 gap-3">
              {langeSedan.map(({ vaxt }) => {
                const senasteBild = handelser.find((h) => h.vaxtId === vaxt.id && h.fotoRef)
                return (
                  <li key={vaxt.id}>
                    <Link to={`/vaxter/${vaxt.id}`} className="flex flex-col gap-1.5">
                      <FotoBild
                        fotoRef={fotoAvVaxt.get(vaxt.id)}
                        alt={vaxt.namn}
                        className="aspect-square w-full rounded-lg"
                      />
                      <span className="truncate text-xs text-ljus">{vaxt.namn}</span>
                      <span className="mono text-[10px] text-dis-svag">
                        {senasteBild ? formatDatumKort(new Date(senasteBild.datum)) : '—'}
                      </span>
                    </Link>
                  </li>
                )
              })}
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

function Nyckeltal({ etikett, varde, till }: { etikett: string; varde: number; till?: string }) {
  const innehall = (
    <>
      <dt className="text-xs text-dis-svag">{etikett}</dt>
      <dd className="mono mt-1 text-2xl text-ljus">{varde}</dd>
    </>
  )
  return till ? (
    <Link
      to={till}
      className="rounded-xl border border-linje bg-panel px-3 py-3 transition-colors duration-200 ease-[var(--ease-mjuk)] hover:bg-upphojd"
    >
      {innehall}
    </Link>
  ) : (
    <div className="rounded-xl border border-linje bg-panel px-3 py-3">{innehall}</div>
  )
}

function VaxtRutor({ vaxter, fotoAvVaxt }: { vaxter: Vaxt[]; fotoAvVaxt: Map<string, string> }) {
  return (
    <ul className="grid grid-cols-3 gap-3">
      {vaxter.map((v) => (
        <li key={v.id}>
          <Link to={`/vaxter/${v.id}`} className="flex flex-col gap-1.5">
            <FotoBild
              fotoRef={fotoAvVaxt.get(v.id)}
              alt={v.namn}
              className="aspect-square w-full rounded-lg"
            />
            <span className="truncate text-xs text-ljus">{v.namn}</span>
          </Link>
        </li>
      ))}
    </ul>
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
        className="flex items-center gap-4 rounded-xl border border-linje bg-panel p-3 transition-colors duration-200 ease-[var(--ease-mjuk)] hover:bg-upphojd"
      >
        <FotoBild
          fotoRef={handelse.fotoRef}
          alt={vaxt?.namn ?? plats?.namn ?? 'Senaste bilden'}
          className="size-20 shrink-0 rounded-lg"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-semibold text-ljus">
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
