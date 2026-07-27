import type { Handelse, Plats, Skuggkalla, Tradgard, Vaxt } from '../data/types'

/**
 * Referensintegriteten som ren funktion. Invarianterna appen lovar:
 *
 *  1. Ingen händelse utan existerande växt eller plats.
 *  2. Inget foto (fotoRef) utan händelse — kontrolleras här som att varje
 *     fotoRef bärs av en händelse; blobbar utanför datamodellen syns inte
 *     härifrån och städas av raderingsvägarna.
 *  3. Ingen växt som pekar på en plats som inte finns.
 *  4. Ingen plats som pekar på en trädgård som inte finns.
 *
 * Används av testerna (e2e kör flödesgatlopp och kontrollerar sedan detta)
 * och kan köras mot vilket dataset som helst. Att en invariant BRYTS är inte
 * alltid en katastrof — synken kan skapa tillfälliga brott — men varje brott
 * ska ha en väg tillbaka i UI:t, aldrig en tyst försvinnare.
 */

export interface Integritetsbrott {
  invariant: 'handelse-utan-mal' | 'vaxt-mot-saknad-plats' | 'plats-mot-saknad-tradgard' | 'skuggkalla-mot-saknad-tradgard'
  /** Dokumentet som bryter. */
  id: string
  beskrivning: string
}

export interface Datamangd {
  tradgardar: Tradgard[]
  platser: Plats[]
  vaxter: Vaxt[]
  handelser: Handelse[]
  skuggkallor?: Skuggkalla[]
}

export function granskaIntegritet(data: Datamangd): Integritetsbrott[] {
  const brott: Integritetsbrott[] = []
  const tradgardIdn = new Set(data.tradgardar.map((t) => t.id))
  const platsIdn = new Set(data.platser.map((p) => p.id))
  const vaxtIdn = new Set(data.vaxter.map((v) => v.id))

  for (const h of data.handelser) {
    const harVaxt = h.vaxtId !== undefined && vaxtIdn.has(h.vaxtId)
    const harPlats = h.platsId !== undefined && platsIdn.has(h.platsId)
    if (!harVaxt && !harPlats) {
      brott.push({
        invariant: 'handelse-utan-mal',
        id: h.id,
        beskrivning: `Händelsen ${h.id} (${h.typ}${h.fotoRef ? ', med foto' : ''}) pekar varken på en växt eller en plats som finns.`,
      })
    }
  }

  for (const v of data.vaxter) {
    if (v.platsId !== undefined && !platsIdn.has(v.platsId)) {
      brott.push({
        invariant: 'vaxt-mot-saknad-plats',
        id: v.id,
        beskrivning: `Växten "${v.namn}" pekar på platsen ${v.platsId} som inte finns.`,
      })
    }
  }

  for (const p of data.platser) {
    if (!tradgardIdn.has(p.tradgardId)) {
      brott.push({
        invariant: 'plats-mot-saknad-tradgard',
        id: p.id,
        beskrivning: `Platsen "${p.namn}" pekar på trädgården ${p.tradgardId} som inte finns.`,
      })
    }
  }

  for (const k of data.skuggkallor ?? []) {
    if (!tradgardIdn.has(k.tradgardId)) {
      brott.push({
        invariant: 'skuggkalla-mot-saknad-tradgard',
        id: k.id,
        beskrivning: `Skuggkällan "${k.namn}" pekar på trädgården ${k.tradgardId} som inte finns.`,
      })
    }
  }

  return brott
}
