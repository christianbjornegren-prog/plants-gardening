import useEmblaCarousel from 'embla-carousel-react'
import type { Handelse } from '../data/types'
import { formatDatumKort, formatOsakertDatum } from '../lib/format'
import { FotoBild } from './FotoBild'

/**
 * Hjärtat i appen: samma planta i april, juni och september bredvid varandra.
 * ÄLDST FÖRST — hela poängen är att läsa förändringen vänster till höger.
 * Rutnät vore fel form; förändring läses på en linje.
 */
export function Fototidslinje({
  foton,
  alt,
  tomText,
}: {
  foton: Handelse[]
  alt: string
  tomText: string
}) {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: foton.length > 2,
  })

  if (foton.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-linje px-6 text-center">
        <p className="max-w-xs text-sm/6 text-dis">{tomText}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden" ref={emblaRef} data-testid="fototidslinje">
      <div className={`flex gap-3 ${foton.length === 1 ? '' : '-mr-5'}`}>
        {foton.map((foto) => {
          const datum = new Date(foto.datum)
          return (
            <figure
              key={foto.id}
              className={`flex min-w-0 shrink-0 flex-col gap-2 ${
                foton.length === 1 ? 'w-full' : 'w-[78%] max-w-72'
              }`}
            >
              <FotoBild
                fotoRef={foto.fotoRef}
                alt={alt}
                className="aspect-[4/3] w-full rounded-xl"
              />
              <figcaption className="mono text-xs text-dis">
                {foto.datumOkant ? formatOsakertDatum(datum) : formatDatumKort(datum)}
                {foto.anteckning && (
                  <span className="ml-2 font-sans text-dis-svag">{foto.anteckning}</span>
                )}
              </figcaption>
            </figure>
          )
        })}
      </div>
    </div>
  )
}
