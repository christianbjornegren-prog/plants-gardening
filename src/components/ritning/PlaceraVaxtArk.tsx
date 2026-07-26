import { useState } from 'react'
import { useDataRot } from '../../auth/AuthProvider'
import { useData } from '../../data/DataProvider'
import type { Plats } from '../../data/types'
import { senasteFotoPerVaxt } from '../../lib/handelser'
import { Ark } from '../Ark'
import { FotoBild } from '../FotoBild'
import { inmatningsStil } from '../Falt'
import { KameraIkon, PlusIkon, SokIkon } from '../Ikoner'
import { useNyVaxt } from '../NyVaxt'

/**
 * Kuben, från ritningens håll: lägg en växt på en plats. Växter UTAN plats
 * ligger överst — det är dem hon oftast letar efter — och längst ner går det
 * att fota en ny direkt.
 */
export function PlaceraVaxtArk({
  plats,
  oppen,
  onOppenChange,
  position,
}: {
  plats: Plats
  oppen: boolean
  onOppenChange: (oppen: boolean) => void
  /** Läge i meter om växten ska landa på en exakt punkt. */
  position?: { x: number; y: number }
}) {
  const { vaxter, handelser } = useData()
  const uid = useDataRot()
  const { oppna } = useNyVaxt()
  const [sok, setSok] = useState('')

  const fotoAvVaxt = senasteFotoPerVaxt(handelser)
  const traff = (namn: string) => namn.toLowerCase().includes(sok.trim().toLowerCase())
  const hemlosa = vaxter.filter((v) => !v.platsId && traff(v.namn))
  const ovriga = vaxter.filter((v) => v.platsId && v.platsId !== plats.id && traff(v.namn))

  function placera(vaxtId: string) {
    const vaxt = vaxter.find((v) => v.id === vaxtId)
    if (!vaxt) return
    onOppenChange(false)
    void (async () => {
      const repo = await import('../../data/repo')
      if (position) {
        repo.flyttaVaxtPaRitningen(uid, vaxt, position.x, position.y, plats.id)
      } else {
        repo.flyttaVaxt(uid, vaxt, plats.id)
      }
    })()
  }

  function Rad({ vaxtId, namn, under }: { vaxtId: string; namn: string; under?: string }) {
    return (
      <button
        type="button"
        onClick={() => placera(vaxtId)}
        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-upphojd"
      >
        <FotoBild
          fotoRef={fotoAvVaxt.get(vaxtId)}
          alt={namn}
          className="size-11 shrink-0 rounded-lg"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ljus">{namn}</span>
          {under && <span className="block truncate text-xs text-dis-svag">{under}</span>}
        </span>
      </button>
    )
  }

  return (
    <Ark
      oppen={oppen}
      onOppenChange={onOppenChange}
      titel={`Placera i ${plats.namn}`}
      beskrivning="Välj en växt du redan har, eller fota en ny."
    >
      <div className="flex flex-col gap-5">
        <div className="relative">
          <SokIkon
            width={18}
            height={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-dis-svag"
          />
          <input
            type="search"
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            placeholder="Sök bland växterna"
            aria-label="Sök bland växterna"
            className={`${inmatningsStil} pl-10`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onOppenChange(false)
              oppna({ platsId: plats.id, position })
            }}
            className="flex min-h-12 items-center gap-3 rounded-lg border border-linje px-3 text-sm text-ljus hover:bg-upphojd"
          >
            <KameraIkon width={20} height={20} className="text-lov" />
            Fota en ny växt här
          </button>
          {/* Planering: det finns inget att fota än, så kameran hoppas över. */}
          <button
            type="button"
            onClick={() => {
              onOppenChange(false)
              oppna({ platsId: plats.id, position, status: 'planerad', utanFoto: true })
            }}
            className="flex min-h-12 items-center gap-3 rounded-lg border border-dashed border-linje px-3 text-sm text-dis hover:text-ljus"
          >
            <PlusIkon width={20} height={20} />
            Planera en växt här
          </button>
        </div>

        {hemlosa.length > 0 && (
          <section>
            <h3 className="mb-1 px-2 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
              Utan plats
            </h3>
            {hemlosa.map((v) => (
              <Rad key={v.id} vaxtId={v.id} namn={v.namn} />
            ))}
          </section>
        )}

        {ovriga.length > 0 && (
          <section>
            <h3 className="mb-1 px-2 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
              Flytta hit
            </h3>
            {ovriga.map((v) => (
              <Rad key={v.id} vaxtId={v.id} namn={v.namn} under="står någon annanstans" />
            ))}
          </section>
        )}

        {hemlosa.length === 0 && ovriga.length === 0 && (
          <p className="px-2 text-sm text-dis">Inga växter att flytta hit än.</p>
        )}
      </div>
    </Ark>
  )
}
