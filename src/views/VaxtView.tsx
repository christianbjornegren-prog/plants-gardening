import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDataRot } from '../auth/AuthProvider'
import { Ark } from '../components/Ark'
import { Chip, Uppgift } from '../components/Chip'
import { inmatningsStil } from '../components/Falt'
import { Fototidslinje } from '../components/Fototidslinje'
import { HandelseKnappar } from '../components/HandelseKnappar'
import { Knapp, TaBortKnapp } from '../components/Knapp'
import { PlatsValjare } from '../components/PlatsValjare'
import { Tidslinje } from '../components/Tidslinje'
import { SaknasVy, VyHuvud } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import { usePlacera } from '../data/PlaceraProvider'
import type { VaxtFalt } from '../data/repo'
import { SOLLAGEN, solEtikett } from '../lib/etiketter'
import { fototidslinje, handelserForVaxt } from '../lib/handelser'

/**
 * Växtkortet. Ifyllda uppgifter visas som rader, tomma erbjuds som chips —
 * en växt med bara namn och foto ser ren ut, en hon bryr sig om blir rik.
 * Aldrig ett formulär att "komma igenom" (se docs/DESIGNLOGG.md).
 */

type Falt = 'sort' | 'latin' | 'planterad' | 'antal' | 'jord' | 'anteckning' | 'namn'

const FALT_ETIKETT: Record<Falt, string> = {
  namn: 'Namn',
  sort: 'Sort',
  // Fylls i automatiskt om man tog ett namnförslag, men går alltid att skriva
  // om — det är hennes anteckning, inte en artbestämning.
  latin: 'Latinskt namn',
  // "Planterades" (datum) skiljs medvetet från knappen "Planterad" (åtgärden
  // som gör en planerad växt verklig) — samma ord för två saker förvirrar.
  planterad: 'Planterades',
  antal: 'Antal',
  jord: 'Jord',
  anteckning: 'Anteckning',
}

const PLATSHALLARE: Record<Falt, string> = {
  namn: 'Hortensian vid boden',
  sort: 'Annabelle',
  latin: 'Hydrangea arborescens',
  planterad: 'maj 2023',
  antal: '3',
  jord: 'Lerjord, mullrik',
  anteckning: 'Blommar sent, tål torka dåligt',
}

export function VaxtView() {
  const { id } = useParams()
  const { vaxter, platser, tradgardar, handelser, laddad } = useData()
  const uid = useDataRot()
  const navigera = useNavigate()
  const placera = usePlacera()

  const [redigerar, setRedigerar] = useState<Falt>()
  const [visaMer, setVisaMer] = useState(false)
  const [utkast, setUtkast] = useState('')
  const [visaSol, setVisaSol] = useState(false)
  const [visaPlats, setVisaPlats] = useState(false)

  if (!laddad) return null
  const vaxt = vaxter.find((v) => v.id === id)
  if (!vaxt) return <SaknasVy text="Växten finns inte längre." tillbakaTill="/vaxter" />

  const mina = handelserForVaxt(handelser, vaxt.id)
  const foton = fototidslinje(mina)
  const plats = platser.find((p) => p.id === vaxt.platsId)
  const tradgard = tradgardar.find((t) => t.id === plats?.tradgardId)

  function spara(falt: Partial<VaxtFalt>) {
    void (async () => {
      const repo = await import('../data/repo')
      repo.uppdateraVaxt(uid, vaxt!.id, falt)
    })()
  }

  function oppnaFalt(falt: Falt) {
    setUtkast(
      falt === 'namn'
        ? vaxt!.namn
        : falt === 'antal'
          ? (vaxt!.antal?.toString() ?? '')
          : ((vaxt![falt] as string | undefined) ?? ''),
    )
    setRedigerar(falt)
  }

  function tillampa(text: string) {
    const falt = redigerar
    if (!falt) return
    const rensat = text.trim()
    if (falt === 'namn') {
      if (rensat) spara({ namn: rensat })
    } else if (falt === 'antal') {
      const tal = Number.parseInt(rensat, 10)
      spara({ antal: Number.isFinite(tal) && tal > 0 ? tal : undefined })
    } else {
      spara({ [falt]: rensat || undefined } as Partial<VaxtFalt>)
    }
    setRedigerar(undefined)
  }

  function sparaFalt(e: FormEvent) {
    e.preventDefault()
    tillampa(utkast)
  }

  const saknade: Falt[] = (
    ['sort', 'latin', 'planterad', 'antal', 'jord', 'anteckning'] as Falt[]
  ).filter(
    (f) => (f === 'antal' ? vaxt.antal === undefined : !vaxt[f as keyof typeof vaxt]),
  )

  return (
    <div className="tona-upp mx-auto w-full max-w-2xl px-5 py-5 md:px-8 md:py-8">
      <VyHuvud
        titel={vaxt.namn}
        underrubrik={
          plats ? `${plats.namn}${tradgard ? ` · ${tradgard.namn}` : ''}` : 'Utan plats än'
        }
        tillbakaTill="/vaxter"
        hoger={
          <button
            type="button"
            onClick={() => oppnaFalt('namn')}
            className="min-h-11 shrink-0 px-2 text-sm text-dis hover:text-tusch"
          >
            Ändra
          </button>
        }
      />

      {vaxt.status === 'planerad' && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-dashed border-linje px-4 py-3">
          <p className="flex-1 text-sm text-dis">Planerad — inte planterad än.</p>
          <Knapp
            variant="primar"
            onClick={() => {
              void (async () => {
                const repo = await import('../data/repo')
                repo.markeraPlanterad(uid, vaxt)
              })()
            }}
          >
            Planterad
          </Knapp>
        </div>
      )}

      <Fototidslinje
        foton={foton}
        alt={vaxt.namn}
        tomText={`Ingen bild på ${vaxt.namn} än. Tryck Foto nedan — sen kan du följa den över säsongen.`}
      />

      <div className="mt-5">
        <HandelseKnappar vaxtId={vaxt.id} platsId={vaxt.platsId} handelser={mina} />
      </div>

      <dl className="mt-7 divide-y divide-linje/60 border-y border-linje/60">
        <Uppgift etikett="Plats">
          <button
            type="button"
            onClick={() => setVisaPlats(true)}
            className="text-left underline decoration-linje underline-offset-4 hover:decoration-dis"
          >
            {plats ? plats.namn : 'Välj plats'}
          </button>
        </Uppgift>
        {vaxt.sol && (
          <Uppgift etikett="Sol">
            <button type="button" onClick={() => setVisaSol(true)} className="text-left">
              {solEtikett(vaxt.sol)}
            </button>
          </Uppgift>
        )}
        {(['sort', 'latin', 'planterad', 'antal', 'jord', 'anteckning'] as Falt[])
          .filter((f) => (f === 'antal' ? vaxt.antal !== undefined : vaxt[f as keyof typeof vaxt]))
          .map((f) => (
            <Uppgift key={f} etikett={FALT_ETIKETT[f]} mono={f === 'planterad' || f === 'antal'}>
              <button type="button" onClick={() => oppnaFalt(f)} className="text-left">
                {f === 'antal' ? `${vaxt.antal} st` : String(vaxt[f as keyof typeof vaxt])}
              </button>
            </Uppgift>
          ))}
      </dl>

      {/* Chipraden krymper allteftersom och försvinner när allt är ifyllt. */}
      <div className="mt-4 flex flex-wrap gap-2">
        {!vaxt.sol && <Chip onClick={() => setVisaSol(true)}>+ Sol</Chip>}
        {saknade.map((f) => (
          <Chip key={f} onClick={() => oppnaFalt(f)}>
            + {FALT_ETIKETT[f]}
          </Chip>
        ))}
      </div>

      {plats?.geometri && (
        <button
          type="button"
          onClick={() => {
            placera.begar({ vaxtId: vaxt.id, vaxtNamn: vaxt.namn })
            navigera('/ritning')
          }}
          className="mt-5 text-sm text-orm underline underline-offset-4"
        >
          {vaxt.position ? 'Flytta på ritningen' : 'Placera på ritningen'}
        </button>
      )}

      <section className="mt-9">
        <h2 className="mb-1 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
          Historik
        </h2>
        <Tidslinje
          handelser={mina}
          vaxter={vaxter}
          platser={platser}
          bilder="sma"
          tomText="Inget loggat än. Knapparna ovanför skriver med dagens datum."
        />
      </section>

      {/* Sällanvalen samlade: status sätts en gång, radering nästan aldrig.
          Båda låg tidigare framme och drog blicken från det man är här för. */}
      <div className="mt-10 border-t border-linje pt-5">
        <button
          type="button"
          onClick={() => setVisaMer((n) => !n)}
          className="text-sm text-dis hover:text-tusch"
        >
          {visaMer ? 'Färre detaljer' : 'Fler detaljer'}
        </button>

        {visaMer && (
          <div className="mt-4 flex flex-col items-start gap-4">
            {vaxt.status === 'finns' && (
              <Chip onClick={() => spara({ status: 'planerad' })}>Inte planterad än</Chip>
            )}
            <TaBortKnapp
              variant="lank"
              onBekraftad={() => {
                void (async () => {
                  const repo = await import('../data/repo')
                  repo.taBortVaxt(uid, vaxt, mina)
                  navigera('/vaxter')
                })()
              }}
            >
              Ta bort växten
            </TaBortKnapp>
          </div>
        )}
      </div>

      {/* Ark: fritextfält */}
      <Ark
        oppen={redigerar !== undefined}
        onOppenChange={(o) => !o && setRedigerar(undefined)}
        titel={redigerar ? FALT_ETIKETT[redigerar] : ''}
      >
        <form onSubmit={sparaFalt} className="flex flex-col gap-4">
          {redigerar === 'anteckning' ? (
            <textarea
              rows={4}
              autoFocus
              value={utkast}
              onChange={(e) => setUtkast(e.target.value)}
              placeholder={PLATSHALLARE.anteckning}
              aria-label="Anteckning"
              className={inmatningsStil}
            />
          ) : (
            <input
              type="text"
              autoFocus
              inputMode={redigerar === 'antal' ? 'numeric' : 'text'}
              value={utkast}
              onChange={(e) => setUtkast(e.target.value)}
              placeholder={redigerar ? PLATSHALLARE[redigerar] : ''}
              aria-label={redigerar ? FALT_ETIKETT[redigerar] : ''}
              className={`${inmatningsStil} ${
                redigerar === 'antal' || redigerar === 'planterad' ? 'mono' : ''
              }`}
            />
          )}
          <Knapp type="submit" variant="primar">
            Spara
          </Knapp>
          {redigerar !== 'namn' && (
            <button
              type="button"
              onClick={() => tillampa('')}
              className="text-sm text-dis underline underline-offset-4"
            >
              Ta bort uppgiften
            </button>
          )}
        </form>
      </Ark>

      {/* Ark: sol */}
      <Ark oppen={visaSol} onOppenChange={setVisaSol} titel="Sol">
        <div className="flex flex-wrap gap-2">
          {SOLLAGEN.map(({ varde, etikett }) => (
            <Chip
              key={varde}
              vald={vaxt.sol === varde}
              onClick={() => {
                spara({ sol: vaxt.sol === varde ? undefined : varde })
                setVisaSol(false)
              }}
            >
              {etikett}
            </Chip>
          ))}
        </div>
      </Ark>

      <PlatsValjare
        oppen={visaPlats}
        onOppenChange={setVisaPlats}
        valdPlatsId={vaxt.platsId}
        onValj={(platsId) => {
          void (async () => {
            const repo = await import('../data/repo')
            repo.flyttaVaxt(uid, vaxt, platsId)
          })()
        }}
      />
    </div>
  )
}
