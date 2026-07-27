import { useState } from 'react'
import type { Plats, Skuggkalla, Tradgard } from '../../data/types'
import { formatMeter, tolkaMeter } from '../../lib/format'
import { Falt, inmatningsStil } from '../Falt'
import { Knapp, TaBortKnapp } from '../Knapp'
import { Kompass } from './Kompass'

/**
 * Underlaget för solberäkningen: norrvinkel, läge, höjder och skuggkällor.
 * Ligger bakom "Justera underlaget" — det fylls i en gång och justeras
 * sällan, så det ska inte äta plats i grundläget.
 */
export function Underlag({
  tradgard,
  platser,
  skuggkallor,
  uid,
  ritarKalla,
  onRitaKalla,
}: {
  tradgard: Tradgard
  platser: Plats[]
  skuggkallor: Skuggkalla[]
  uid: string
  ritarKalla: boolean
  onRitaKalla: () => void
}) {
  const medForm = platser.filter((p) => p.geometri)

  function sparaInstallning(falt: { norrVinkel?: number; latitud?: number; longitud?: number }) {
    void (async () => {
      const repo = await import('../../data/repo')
      repo.sparaSolinstallning(uid, tradgard.id, falt)
    })()
  }

  return (
    <div className="flex flex-col gap-7 rounded-2xl border border-linje bg-panel p-4">
      <section className="flex flex-col items-center gap-2">
        <h3 className="self-start text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
          Norr
        </h3>
        <p className="self-start text-xs text-dis">
          Vrid tills nålen pekar åt det håll norr ligger, sett från ritningen. Är norr fel
          blir varje skugga fel.
        </p>
        <Kompass
          vinkel={tradgard.norrVinkel ?? 0}
          onVinkel={(grader) => sparaInstallning({ norrVinkel: grader })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">Läge</h3>
        <div className="flex gap-3">
          <Falt etikett="Latitud">
            <LitetTalFalt
              varde={tradgard.latitud ?? 59.62}
              min={-90}
              max={90}
              onSparad={(v) => sparaInstallning({ latitud: v })}
            />
          </Falt>
          <Falt etikett="Longitud">
            <LitetTalFalt
              varde={tradgard.longitud ?? 17.72}
              min={-180}
              max={180}
              onSparad={(v) => sparaInstallning({ longitud: v })}
            />
          </Falt>
        </div>
      </section>

      {medForm.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="mb-1 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
            Höjder
          </h3>
          <p className="mb-1 text-xs text-dis">
            Bara det som har höjd kastar skugga. Boden, staketet, häcken — meter över marken.
          </p>
          {medForm.map((plats) => (
            <div key={plats.id} className="flex min-h-11 items-center justify-between gap-3">
              <span className="truncate text-sm text-tusch">{plats.namn}</span>
              <HojdFalt
                etikett={`Höjd för ${plats.namn}`}
                varde={plats.hojdM}
                onSparad={(hojd) => {
                  void (async () => {
                    const repo = await import('../../data/repo')
                    repo.sparaPlatsHojd(uid, plats.id, hojd)
                  })()
                }}
              />
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-1">
        <h3 className="mb-1 text-xs font-medium tracking-[0.08em] text-dis-svag uppercase">
          Skuggkällor utanför tomten
        </h3>
        <p className="mb-1 text-xs text-dis">
          De största skuggkastarna står ofta utanför tomtgränsen — radhuset, grannens hus,
          skogsbrynet. Utan dem blir kartan för solig.
        </p>
        {skuggkallor.map((kalla) => (
          <div key={kalla.id} className="flex min-h-11 items-center justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-sm text-tusch">{kalla.namn}</span>
            <HojdFalt
              etikett={`Höjd för ${kalla.namn}`}
              varde={kalla.hojdM}
              onSparad={(hojd) => {
                if (hojd === undefined) return
                void (async () => {
                  const repo = await import('../../data/repo')
                  repo.uppdateraSkuggkalla(uid, kalla.id, { hojdM: hojd })
                })()
              }}
            />
            <TaBortKnapp
              onBekraftad={() => {
                void (async () => {
                  const repo = await import('../../data/repo')
                  repo.taBortSkuggkalla(uid, kalla.id)
                })()
              }}
            >
              Ta bort
            </TaBortKnapp>
          </div>
        ))}
        <div className="mt-1">
          <Knapp onClick={onRitaKalla} aria-pressed={ritarKalla}>
            {ritarKalla ? 'Avbryt ritandet' : 'Rita skuggkälla'}
          </Knapp>
          {ritarKalla && (
            <p className="mt-2 text-xs text-dis">Dra en rektangel över ritningen ovanför.</p>
          )}
        </div>
      </section>
    </div>
  )
}

/** Talfält som sparar på blur — mono, decimalkomma tillåtet. */
function LitetTalFalt({
  varde,
  min,
  max,
  onSparad,
}: {
  varde: number
  min: number
  max: number
  onSparad: (varde: number) => void
}) {
  const [text, setText] = useState(String(varde).replace('.', ','))
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const tal = Number(text.replace(',', '.'))
        if (Number.isFinite(tal) && tal >= min && tal <= max) onSparad(tal)
        else setText(String(varde).replace('.', ','))
      }}
      className={`${inmatningsStil} mono`}
    />
  )
}

function HojdFalt({
  etikett,
  varde,
  onSparad,
}: {
  etikett: string
  varde: number | undefined
  onSparad: (varde: number | undefined) => void
}) {
  const [text, setText] = useState(varde === undefined ? '' : formatMeter(varde).replace(' m', ''))
  return (
    <span className="flex items-center gap-1.5">
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() === '') {
            onSparad(undefined)
            return
          }
          const tal = tolkaMeter(text, 0.1, 60)
          if (tal !== undefined) onSparad(tal)
        }}
        placeholder="—"
        aria-label={etikett}
        className={`${inmatningsStil} mono w-20 text-right`}
      />
      <span className="mono text-xs text-dis-svag">m</span>
    </span>
  )
}
