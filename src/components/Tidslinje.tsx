import { Link } from 'react-router-dom'
import type { Handelse, HandelseTyp, Plats, Vaxt } from '../data/types'
import { handelseEtikett } from '../lib/etiketter'
import { formatDatum, formatOsakertDatum } from '../lib/format'
import { FotoBild } from './FotoBild'
import {
  DroppeIkon,
  GodselIkon,
  KameraIkon,
  PennaIkon,
  PlatsIkon,
  SaxIkon,
  VaxterIkon,
} from './Ikoner'

const IKON: Record<HandelseTyp, typeof DroppeIkon> = {
  vattnat: DroppeIkon,
  gödslat: GodselIkon,
  beskuret: SaxIkon,
  foto: KameraIkon,
  planterat: VaxterIkon,
  flyttat: PlatsIkon,
  anteckning: PennaIkon,
}

export function Tidslinje({
  handelser,
  vaxter,
  platser,
  visaMal = false,
  bilder = 'stora',
  tomText = 'Inget loggat än.',
}: {
  /** Nyaste först. */
  handelser: Handelse[]
  vaxter: Vaxt[]
  platser: Plats[]
  /** Visa vilken växt/plats posten gäller — behövs i globala loggen. */
  visaMal?: boolean
  /**
   * 'sma' på växt- och platskort: fototidslinjen ovanför visar redan samma
   * bilder stort, och att upprepa dem gör historiken oläslig.
   */
  bilder?: 'stora' | 'sma'
  tomText?: string
}) {
  if (handelser.length === 0) {
    return <p className="py-6 text-sm text-dis">{tomText}</p>
  }

  return (
    <ol className="flex flex-col" data-testid="tidslinje">
      {handelser.map((h) => {
        const Ikon = IKON[h.typ]
        const vaxt = h.vaxtId ? vaxter.find((v) => v.id === h.vaxtId) : undefined
        const plats = h.platsId ? platser.find((p) => p.id === h.platsId) : undefined
        const datum = new Date(h.datum)
        const till = platser.find((p) => p.id === h.tillPlatsId)

        return (
          <li key={h.id} className="flex gap-3 border-b border-linje/60 py-3 last:border-b-0">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-upphojd text-orm">
              <Ikon width={16} height={16} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-tusch">
                  {handelseEtikett(h.typ)}
                  {h.typ === 'flyttat' && till && <span className="text-dis"> till {till.namn}</span>}
                </span>
                <span className="mono shrink-0 text-xs text-dis-svag">
                  {h.datumOkant ? formatOsakertDatum(datum) : formatDatum(datum)}
                </span>
              </div>

              {visaMal && (vaxt || plats) && (
                <p className="mt-0.5 truncate text-xs">
                  {vaxt ? (
                    <Link to={`/vaxter/${vaxt.id}`} className="text-orm underline underline-offset-4">
                      {vaxt.namn}
                    </Link>
                  ) : (
                    plats && (
                      <Link
                        to={`/platser/${plats.id}`}
                        className="text-orm underline underline-offset-4"
                      >
                        {plats.namn}
                      </Link>
                    )
                  )}
                </p>
              )}

              {h.anteckning && <p className="mt-1 text-sm text-dis">{h.anteckning}</p>}

              {h.fotoRef && (
                <FotoBild
                  fotoRef={h.fotoRef}
                  alt={vaxt?.namn ?? plats?.namn ?? 'Foto'}
                  className={
                    bilder === 'sma'
                      ? 'mt-2 size-14 rounded-lg'
                      : 'mt-2 aspect-[4/3] w-full max-w-60 rounded-lg'
                  }
                />
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
