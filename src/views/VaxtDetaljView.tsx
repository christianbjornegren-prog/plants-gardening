import { useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useUid } from '../auth/AuthProvider'
import { FotoBild } from '../components/FotoBild'
import { Knapp, LankKnapp, TaBortKnapp } from '../components/Knapp'
import { SnabbLogg } from '../components/SnabbLogg'
import { Tidslinje } from '../components/Tidslinje'
import { SaknasVy, VyHuvud } from '../components/VyHuvud'
import { useData, ytaNamn } from '../data/DataProvider'
import { formatDatum } from '../lib/format'
import { loggForVaxt } from '../lib/logg'

export function VaxtDetaljView() {
  const { id } = useParams()
  const { vaxter, ytor, logg, laddad } = useData()
  const uid = useUid()
  const navigate = useNavigate()
  const filInput = useRef<HTMLInputElement>(null)
  const [sparasFoto, setSparasFoto] = useState(false)
  const [valtFoto, setValtFoto] = useState(0)

  if (!laddad) return null
  const hittad = vaxter.find((v) => v.id === id)
  if (!hittad) return <SaknasVy text="Växten finns inte längre." tillbakaTill="/vaxter" />
  const vaxt = hittad
  const vaxtLogg = loggForVaxt(logg, vaxt.id)

  const visatFoto = vaxt.photoRefs[valtFoto] ?? vaxt.photoRefs[0]

  function valjFil(e: ChangeEvent<HTMLInputElement>) {
    const fil = e.target.files?.[0]
    e.target.value = ''
    if (!fil) return
    setSparasFoto(true)
    void (async () => {
      try {
        const { komprimeraBild } = await import('../lib/bild')
        const { sparaFoto } = await import('../lib/photoStore')
        const { laggTillVaxtFoto } = await import('../data/repo')
        const blob = await komprimeraBild(fil)
        const fotoRef = await sparaFoto(uid, blob)
        laggTillVaxtFoto(uid, vaxt, fotoRef)
      } finally {
        setSparasFoto(false)
      }
    })()
  }

  function taBort() {
    void (async () => {
      const { taBortVaxt } = await import('../data/repo')
      taBortVaxt(
        uid,
        vaxt,
        vaxtLogg.map((post) => post.id),
      )
      navigate('/vaxter', { replace: true })
    })()
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-5 md:p-8">
      <VyHuvud
        titel={vaxt.name}
        tillbakaTill="/vaxter"
        hoger={<LankKnapp to={`/vaxter/${vaxt.id}/andra`}>Ändra</LankKnapp>}
      />

      <FotoBild
        fotoRef={visatFoto}
        alt={visatFoto ? `Foto på ${vaxt.name}` : ''}
        className="aspect-[4/3] w-full overflow-hidden rounded-lg"
      />

      <div className="mt-3 flex items-center gap-2">
        {vaxt.photoRefs.length > 1 && (
          <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {vaxt.photoRefs.map((fotoRef, index) => (
              <li key={fotoRef} className="shrink-0">
                <button
                  type="button"
                  aria-label={`Visa foto ${index + 1}`}
                  onClick={() => setValtFoto(index)}
                  className={`block overflow-hidden rounded-md ${
                    index === valtFoto ? 'ring-2 ring-fermob' : ''
                  }`}
                >
                  <FotoBild fotoRef={fotoRef} alt="" className="size-14" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={filInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={valjFil}
          aria-label="Välj foto"
        />
        <Knapp
          onClick={() => filInput.current?.click()}
          disabled={sparasFoto}
          className="ml-auto shrink-0"
        >
          {sparasFoto ? 'Sparar …' : 'Lägg till foto'}
        </Knapp>
      </div>

      <dl className="mt-6 flex flex-col gap-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="text-panel/55">Står i:</dt>
          <dd>
            <Link to={`/ytor/${vaxt.areaId}`} className="text-orm underline underline-offset-2">
              {ytaNamn(ytor, vaxt.areaId)}
            </Link>
          </dd>
        </div>
      </dl>

      {vaxt.note && <p className="mt-4 whitespace-pre-wrap text-panel/85">{vaxt.note}</p>}

      <div className="mt-6">
        <SnabbLogg plantId={vaxt.id} />
      </div>

      <section className="mt-8">
        <h2 className="mb-1 font-display text-lg font-semibold">Logg</h2>
        <Tidslinje poster={vaxtLogg} tom="Inget loggat än." />
      </section>

      {vaxt.moveHistory.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 font-display text-lg font-semibold">Flytthistorik</h2>
          <ul className="flex flex-col gap-1 text-sm text-panel/70">
            {vaxt.moveHistory
              .slice()
              .reverse()
              .map((flytt, index) => (
                <li key={`${flytt.date}-${index}`}>
                  Från {ytaNamn(ytor, flytt.fromAreaId)} till {ytaNamn(ytor, flytt.toAreaId)} ·{' '}
                  {formatDatum(new Date(flytt.date))}
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="mt-12 border-t border-panel/10 pt-6">
        <TaBortKnapp onBekraftad={taBort}>Ta bort växten</TaBortKnapp>
      </section>
    </div>
  )
}
