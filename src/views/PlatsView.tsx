import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDataRot } from '../auth/AuthProvider'
import { Ark } from '../components/Ark'
import { Chip, Uppgift } from '../components/Chip'
import { inmatningsStil } from '../components/Falt'
import { FotoBild } from '../components/FotoBild'
import { Fototidslinje } from '../components/Fototidslinje'
import { HandelseKnappar } from '../components/HandelseKnappar'
import { Knapp, TaBortKnapp } from '../components/Knapp'
import { PlaceraVaxtArk } from '../components/ritning/PlaceraVaxtArk'
import { Tidslinje } from '../components/Tidslinje'
import { SaknasVy, VyHuvud } from '../components/VyHuvud'
import { useData } from '../data/DataProvider'
import type { PlatsFalt } from '../data/repo'
import { VADERSTRECK } from '../data/types'
import { antalVaxter, platsEtikett, SOLLAGEN, solEtikett, vaderstreckEtikett } from '../lib/etiketter'
import { formTillPolygon } from '../lib/form'
import { formatArea, formatMeter } from '../lib/format'
import { area, omkrets } from '../lib/geometri'
import { fototidslinje, handelserForPlats, senasteFotoPerVaxt } from '../lib/handelser'

/**
 * Platskortet. Samma idé som växtkortet: fototidslinje först ("samma rabatt,
 * april vs juli"), sedan händelser, sedan uppgifter.
 */
export function PlatsView() {
  const { id } = useParams()
  const { platser, vaxter, tradgardar, handelser, laddad } = useData()
  const uid = useDataRot()
  const navigera = useNavigate()

  const [visaSol, setVisaSol] = useState(false)
  const [visaLage, setVisaLage] = useState(false)
  const [redigerar, setRedigerar] = useState<'namn' | 'jord' | 'anteckning'>()
  const [utkast, setUtkast] = useState('')
  const [laggTill, setLaggTill] = useState(false)

  if (!laddad) return null
  const plats = platser.find((p) => p.id === id)
  if (!plats) return <SaknasVy text="Platsen finns inte längre." tillbakaTill="/ritning" />

  const tradgard = tradgardar.find((t) => t.id === plats.tradgardId)
  const har = vaxter.filter((v) => v.platsId === plats.id)
  const mina = handelserForPlats(handelser, vaxter, plats.id)
  const foton = fototidslinje(handelser.filter((h) => h.platsId === plats.id))
  const fotoAvVaxt = senasteFotoPerVaxt(handelser)

  function spara(falt: Partial<PlatsFalt>) {
    void (async () => {
      const repo = await import('../data/repo')
      repo.uppdateraPlats(uid, plats!.id, falt)
    })()
  }

  function oppna(falt: 'namn' | 'jord' | 'anteckning') {
    setUtkast(plats![falt] ?? '')
    setRedigerar(falt)
  }

  function tillampa(text: string) {
    const falt = redigerar
    if (!falt) return
    const rensat = text.trim()
    if (falt === 'namn') {
      if (rensat) spara({ namn: rensat })
    } else {
      spara({ [falt]: rensat || undefined })
    }
    setRedigerar(undefined)
  }

  return (
    <div className="tona-upp mx-auto w-full max-w-2xl px-5 py-5 md:px-8 md:py-8">
      <VyHuvud
        titel={plats.namn}
        underrubrik={`${platsEtikett(plats)}${tradgard ? ` · ${tradgard.namn}` : ''}`}
        tillbakaTill="/ritning"
        hoger={
          <button
            type="button"
            onClick={() => oppna('namn')}
            className="min-h-11 shrink-0 px-2 text-sm text-dis hover:text-ljus"
          >
            Ändra
          </button>
        }
      />

      {plats.status === 'planerad' && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-dashed border-linje px-4 py-3">
          <p className="flex-1 text-sm text-dis">Planerad — inte anlagd än.</p>
          <Knapp
            variant="primar"
            onClick={() => {
              void (async () => {
                const repo = await import('../data/repo')
                repo.markeraPlatsAnlagd(uid, plats)
              })()
            }}
          >
            Anlagd
          </Knapp>
        </div>
      )}

      <Fototidslinje
        foton={foton}
        alt={plats.namn}
        tomText={`Ingen bild på ${plats.namn} än. Fota hela platsen då och då — det är så man ser en säsong.`}
      />

      <div className="mt-5">
        <HandelseKnappar
          platsId={plats.id}
          handelser={handelser.filter((h) => h.platsId === plats.id)}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
            Växter här
          </span>
          <span className="mono shrink-0 text-xs text-dis-svag">{antalVaxter(har.length)}</span>
        </h2>
        {har.length === 0 ? (
          <p className="text-sm text-dis">Inga växter här än.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {har.map((v) => (
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
        )}
        <Knapp className="mt-3" onClick={() => setLaggTill(true)}>
          Lägg till växt här
        </Knapp>
      </section>

      <dl className="mt-8 divide-y divide-linje/60 border-y border-linje/60">
        {plats.geometri && (
          <>
            <Uppgift etikett="Area" mono>
              {formatArea(area(formTillPolygon(plats.geometri.punkter, plats.geometri.runda)))}
            </Uppgift>
            <Uppgift etikett="Omkrets" mono>
              {formatMeter(omkrets(formTillPolygon(plats.geometri.punkter, plats.geometri.runda)))}
            </Uppgift>
          </>
        )}
        {plats.sol && (
          <Uppgift etikett="Sol">
            <button type="button" onClick={() => setVisaSol(true)}>
              {solEtikett(plats.sol)}
            </button>
          </Uppgift>
        )}
        {plats.jord && (
          <Uppgift etikett="Jord">
            <button type="button" onClick={() => oppna('jord')}>
              {plats.jord}
            </button>
          </Uppgift>
        )}
        {!plats.geometri && (plats.vetterMot || plats.vaderstreck) && (
          <Uppgift etikett="Läge">
            <button type="button" onClick={() => setVisaLage(true)}>
              {[
                plats.vetterMot
                  ? `Vetter mot ${tradgardar.find((t) => t.id === plats.vetterMot)?.namn ?? '–'}`
                  : undefined,
                plats.vaderstreck ? vaderstreckEtikett(plats.vaderstreck) : undefined,
              ]
                .filter(Boolean)
                .join(' · ')}
            </button>
          </Uppgift>
        )}
        {plats.anteckning && (
          <Uppgift etikett="Anteckning">
            <button type="button" onClick={() => oppna('anteckning')} className="text-left">
              {plats.anteckning}
            </button>
          </Uppgift>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {!plats.sol && <Chip onClick={() => setVisaSol(true)}>+ Sol</Chip>}
        {!plats.jord && <Chip onClick={() => oppna('jord')}>+ Jord</Chip>}
        {/* Läge erbjuds bara där det betyder något: platser utan form. */}
        {!plats.geometri && !plats.vetterMot && !plats.vaderstreck && (
          <Chip onClick={() => setVisaLage(true)}>+ Läge</Chip>
        )}
        {!plats.anteckning && <Chip onClick={() => oppna('anteckning')}>+ Anteckning</Chip>}
      </div>

      <section className="mt-9">
        <h2 className="mb-1 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
          Historik
        </h2>
        <Tidslinje handelser={mina} vaxter={vaxter} platser={platser} visaMal bilder="sma" />
      </section>

      <div className="mt-10 border-t border-linje pt-5">
        <TaBortKnapp
          onBekraftad={() => {
            void (async () => {
              const repo = await import('../data/repo')
              repo.taBortPlats(
                uid,
                plats.id,
                har,
                handelser.filter((h) => h.platsId === plats.id),
              )
              navigera('/ritning')
            })()
          }}
        >
          Ta bort platsen
        </TaBortKnapp>
        <p className="mt-2 text-xs text-dis-svag">
          Växterna här blir kvar — de hamnar under "Utan plats".
        </p>
      </div>

      <Ark
        oppen={redigerar !== undefined}
        onOppenChange={(o) => !o && setRedigerar(undefined)}
        titel={
          redigerar === 'namn' ? 'Namn' : redigerar === 'jord' ? 'Jord' : 'Anteckning'
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            tillampa(utkast)
          }}
          className="flex flex-col gap-4"
        >
          {redigerar === 'anteckning' ? (
            <textarea
              rows={4}
              autoFocus
              value={utkast}
              onChange={(e) => setUtkast(e.target.value)}
              aria-label="Anteckning"
              className={inmatningsStil}
            />
          ) : (
            <input
              type="text"
              autoFocus
              value={utkast}
              onChange={(e) => setUtkast(e.target.value)}
              placeholder={redigerar === 'jord' ? 'Lerjord, mullrik' : 'Rabatten vid staketet'}
              aria-label={redigerar === 'jord' ? 'Jord' : 'Namn'}
              className={inmatningsStil}
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

      <Ark oppen={visaSol} onOppenChange={setVisaSol} titel="Sol">
        <div className="flex flex-wrap gap-2">
          {SOLLAGEN.map(({ varde, etikett }) => (
            <Chip
              key={varde}
              vald={plats.sol === varde}
              onClick={() => {
                spara({ sol: plats.sol === varde ? undefined : varde })
                setVisaSol(false)
              }}
            >
              {etikett}
            </Chip>
          ))}
        </div>
      </Ark>

      {/* Läge: så får en fönsterbräda ett väderstreck utan att ha koordinater. */}
      <Ark
        oppen={visaLage}
        onOppenChange={setVisaLage}
        titel="Läge"
        beskrivning="Vad fönstret vetter mot avgör ljuset."
      >
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="mb-2 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
              Vetter mot
            </h3>
            <div className="flex flex-wrap gap-2">
              {tradgardar
                .filter((t) => t.id !== plats.tradgardId)
                .map((t) => (
                  <Chip
                    key={t.id}
                    vald={plats.vetterMot === t.id}
                    onClick={() =>
                      spara({ vetterMot: plats.vetterMot === t.id ? undefined : t.id })
                    }
                  >
                    {t.namn}
                  </Chip>
                ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
              Väderstreck
            </h3>
            <div className="flex flex-wrap gap-2">
              {VADERSTRECK.map((v) => (
                <Chip
                  key={v}
                  vald={plats.vaderstreck === v}
                  onClick={() => spara({ vaderstreck: plats.vaderstreck === v ? undefined : v })}
                >
                  {v}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Ark>

      {laggTill && (
        <PlaceraVaxtArk plats={plats} oppen onOppenChange={(o) => !o && setLaggTill(false)} />
      )}
    </div>
  )
}
