import type { PunktM } from '../data/types'
import { punktIPolygon } from './geometri'
import { soldygn } from './sol'
import { solposition } from './sol'
import { iSkugga } from './skugga'

/** Något som kastar skugga: en plats med höjd eller en skuggkälla utanför tomten. */
export interface Skuggare {
  punkter: PunktM[]
  hojdM: number
}

export interface SoltimmarRaster {
  rutaM: number
  kolumner: number
  rader: number
  /** Timmar obeskuggad sol per ruta, radvis: index = rad * kolumner + kolumn. */
  timmar: Float32Array
  /** Dagens teoretiska max (soluppgång → solnedgång), i timmar. */
  maxTimmar: number
}

export interface SoltimmarInstallning {
  tomtBreddM: number
  tomtHojdM: number
  ar: number
  manad: number
  dag: number
  latitud: number
  longitud: number
  norrVinkel: number
  skuggare: Skuggare[]
  /** Rutstorlek i meter. 0,5 m är snabbt nog för en radhustomt. */
  rutaM?: number
  /** Samplingssteg i minuter. */
  stegMin?: number
}

/**
 * Soltimmar för ett valt datum: dygnet samplas i tiominuterssteg från
 * soluppgång till solnedgång, tomten rastreras och varje ruta räknar hur
 * länge den är obeskuggad. Ren funktion — mätt till ~15 ms för 16×11 m med
 * fem skuggare (se soltimmar.test.ts), så ingen worker behövs.
 */
export function soltimmarRaster(inst: SoltimmarInstallning): SoltimmarRaster {
  const rutaM = inst.rutaM ?? 0.5
  const stegMin = inst.stegMin ?? 10
  const kolumner = Math.max(1, Math.round(inst.tomtBreddM / rutaM))
  const rader = Math.max(1, Math.round(inst.tomtHojdM / rutaM))
  const timmar = new Float32Array(kolumner * rader)

  const dygn = soldygn(inst.ar, inst.manad, inst.dag, inst.latitud, inst.longitud)
  if (dygn.typ === 'polarnatt') {
    return { rutaM, kolumner, rader, timmar, maxTimmar: 0 }
  }
  const start =
    dygn.typ === 'normal'
      ? dygn.uppgang.getTime()
      : dygn.middag.getTime() - 12 * 3_600_000
  const slut =
    dygn.typ === 'normal' ? dygn.nedgang.getTime() : dygn.middag.getTime() + 12 * 3_600_000

  const steg = stegMin * 60_000
  const stegTimmar = stegMin / 60
  let maxTimmar = 0

  // Skuggare utan höjd eller yta kan aldrig skugga — bort innan loopen.
  const aktiva = inst.skuggare.filter((s) => s.hojdM > 0 && s.punkter.length >= 3)

  // Mittpunkten av varje steg ger jämnare kanter än stegets början.
  for (let t = start + steg / 2; t < slut; t += steg) {
    const sol = solposition(new Date(t), inst.latitud, inst.longitud)
    if (sol.hojd <= 0) continue
    maxTimmar += stegTimmar

    for (let rad = 0; rad < rader; rad++) {
      for (let kolumn = 0; kolumn < kolumner; kolumn++) {
        const punkt: PunktM = [(kolumn + 0.5) * rutaM, (rad + 0.5) * rutaM]
        let skuggad = false
        for (const s of aktiva) {
          if (iSkugga(punkt, s.punkter, s.hojdM, sol.azimut, sol.hojd, inst.norrVinkel)) {
            skuggad = true
            break
          }
        }
        if (!skuggad) timmar[rad * kolumner + kolumn]! += stegTimmar
      }
    }
  }
  return { rutaM, kolumner, rader, timmar, maxTimmar }
}

/**
 * Medelvärdet av soltimmarna över rutorna vars mittpunkt ligger i polygonen.
 * undefined när ingen ruta träffar (pytteliten form) — då säger vi hellre
 * inget än fel.
 */
export function soltimmarForPolygon(
  raster: SoltimmarRaster,
  polygon: PunktM[],
): number | undefined {
  if (polygon.length < 3) return undefined
  let summa = 0
  let antal = 0
  for (let rad = 0; rad < raster.rader; rad++) {
    for (let kolumn = 0; kolumn < raster.kolumner; kolumn++) {
      const punkt: PunktM = [(kolumn + 0.5) * raster.rutaM, (rad + 0.5) * raster.rutaM]
      if (!punktIPolygon(punkt, polygon)) continue
      summa += raster.timmar[rad * raster.kolumner + kolumn]!
      antal++
    }
  }
  return antal === 0 ? undefined : summa / antal
}
