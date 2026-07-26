import { useRef, useState, type ChangeEvent } from 'react'
import { useDataRot } from '../auth/AuthProvider'
import type { Handelse, HandelseTyp } from '../data/types'
import { formatDatumKort } from '../lib/format'
import { KAMERA_ATTRIBUT, taEmotFoto } from '../lib/foto'
import { DroppeIkon, GodselIkon, KameraIkon, SaxIkon } from './Ikoner'
import { kvittera } from './Kvittens'

/**
 * Flöde B — logga en händelse med ETT tryck. Händelsen skrivs direkt med
 * dagens datum; bilden är ett erbjudande i kvittensen, aldrig ett krav.
 */

const KNAPPAR: {
  typ: Exclude<HandelseTyp, 'flyttat' | 'planterat' | 'anteckning'>
  etikett: string
  Ikon: typeof DroppeIkon
}[] = [
  { typ: 'vattnat', etikett: 'Vattnat', Ikon: DroppeIkon },
  { typ: 'gödslat', etikett: 'Gödslat', Ikon: GodselIkon },
  { typ: 'beskuret', etikett: 'Beskuret', Ikon: SaxIkon },
  { typ: 'foto', etikett: 'Foto', Ikon: KameraIkon },
]

export function HandelseKnappar({
  vaxtId,
  platsId,
  handelser,
}: {
  vaxtId?: string
  platsId?: string
  /** Händelser för målet, nyaste först — visar "senast" under varje knapp. */
  handelser: Handelse[]
}) {
  const uid = useDataRot()
  const kameraRef = useRef<HTMLInputElement>(null)
  const [fel, setFel] = useState<string>()

  function senast(typ: HandelseTyp): string | undefined {
    const post = handelser.find((h) => h.typ === typ)
    return post ? formatDatumKort(new Date(post.datum)) : undefined
  }

  function angra(id: string, fotoRef?: string) {
    void (async () => {
      const repo = await import('../data/repo')
      repo.taBortHandelse(uid, id)
      if (fotoRef) {
        const { taBortFoto } = await import('../lib/photoStore')
        await taBortFoto(fotoRef)
      }
    })()
  }

  function visaKvittens(etikett: string, id: string, erbjudBild: boolean, fotoRef?: string) {
    kvittera({
      text: `${etikett} ✓`,
      onAngra: () => angra(id, fotoRef),
      extra: erbjudBild
        ? { etikett: 'Ta en bild', onKlick: () => kameraRef.current?.click() }
        : undefined,
    })
  }

  function logga(typ: HandelseTyp, etikett: string) {
    if (typ === 'foto') {
      kameraRef.current?.click()
      return
    }
    void (async () => {
      const repo = await import('../data/repo')
      const id = repo.skapaHandelse(uid, { typ, vaxtId, platsId })
      // Bara beskärning erbjuder bild — det är då man vill se hur det blev.
      visaKvittens(etikett, id, typ === 'beskuret')
    })()
  }

  async function vidBild(e: ChangeEvent<HTMLInputElement>) {
    const fil = e.target.files?.[0]
    e.target.value = ''
    if (!fil) return
    setFel(undefined)
    try {
      const fotoRef = await taEmotFoto(uid, fil)
      const repo = await import('../data/repo')
      const id = repo.skapaHandelse(uid, { typ: 'foto', vaxtId, platsId, fotoRef })
      visaKvittens('Foto sparat', id, false, fotoRef)
    } catch {
      setFel('Fotot kunde inte sparas. Försök igen.')
    }
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2" data-testid="handelseknappar">
        {KNAPPAR.map(({ typ, etikett, Ikon }) => {
          const sist = senast(typ)
          return (
            <button
              key={typ}
              type="button"
              onClick={() => logga(typ, etikett)}
              className="flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl
                border border-linje bg-panel text-ljus transition-colors duration-200
                ease-[var(--ease-mjuk)] hover:bg-upphojd active:bg-upphojd"
            >
              <Ikon width={22} height={22} className="text-lov" />
              <span className="text-xs font-medium">{etikett}</span>
              <span className="mono text-[10px] text-dis-svag">{sist ?? '—'}</span>
            </button>
          )
        })}
      </div>
      <input
        {...KAMERA_ATTRIBUT}
        data-testid="handelse-kamera"
        ref={kameraRef}
        onChange={vidBild}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
      {fel && (
        <p role="alert" className="mt-2 text-sm text-fermob-lyft">
          {fel}
        </p>
      )}
    </div>
  )
}
