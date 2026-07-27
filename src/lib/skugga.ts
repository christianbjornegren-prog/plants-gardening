import type { PunktM } from '../data/types'
import { punktIPolygon } from './geometri'

/**
 * Skuggprojektion på markplanet. Ett objekt är ett prisma: en polygon i
 * ritningens meterplan med en höjd. Skuggan är området mellan basen och
 * basen förskjuten längs skuggriktningen — per kant blir det en fyrhörning,
 * plus den projicerade polygonen längst ut.
 *
 * Ritningens koordinater: x åt höger, y NEDÅT (SVG). `norrVinkel` är hur
 * många grader MEDURS norr ligger från ritningens uppåt: 0 = uppåt är norr.
 */

const RAD = Math.PI / 180

/**
 * Skuggor längre än så här klipps — nära soluppgången går tan(höjden) mot
 * noll och skuggan mot oändligheten, men bortom 200 m spelar den ingen roll
 * på en radhustomt.
 */
export const MAX_SKUGGLANGD_M = 200

/** Skuggans längd på plan mark för ett objekt med given höjd. */
export function skugglangd(hojdM: number, solhojdGrader: number): number {
  if (hojdM <= 0) return 0
  if (solhojdGrader <= 0) return MAX_SKUGGLANGD_M
  const langd = hojdM / Math.tan(solhojdGrader * RAD)
  return Math.min(langd, MAX_SKUGGLANGD_M)
}

/**
 * Kompassriktning (grader från norr, medurs) → enhetsvektor i ritningens
 * plan, med hänsyn till norrvinkeln.
 */
export function kompassTillRiktning(kompassGrader: number, norrVinkel: number): PunktM {
  const skarmvinkel = (kompassGrader + norrVinkel) * RAD
  return [Math.sin(skarmvinkel), -Math.cos(skarmvinkel)]
}

/** Riktningen skuggan pekar: rakt bort från solen. */
export function skuggriktning(solazimut: number, norrVinkel: number): PunktM {
  return kompassTillRiktning(solazimut + 180, norrVinkel)
}

/**
 * Skuggans delytor för ett prisma: den projicerade polygonen plus en
 * fyrhörning per kant. Ritas tillsammans (samma fyllnad, gruppopacitet) blir
 * de en sammanhängande skugga utan att en polygonunion behöver räknas ut.
 * Tom lista när solen är nere eller objektet saknar höjd.
 */
export function skuggpolygoner(
  punkter: PunktM[],
  hojdM: number,
  solazimut: number,
  solhojd: number,
  norrVinkel: number,
): PunktM[][] {
  if (solhojd <= 0 || hojdM <= 0 || punkter.length < 3) return []
  const langd = skugglangd(hojdM, solhojd)
  const [dx, dy] = skuggriktning(solazimut, norrVinkel)
  const flyttad = punkter.map(([x, y]): PunktM => [x + dx * langd, y + dy * langd])

  const ytor: PunktM[][] = [flyttad]
  for (let i = 0; i < punkter.length; i++) {
    const j = (i + 1) % punkter.length
    ytor.push([punkter[i]!, punkter[j]!, flyttad[j]!, flyttad[i]!])
  }
  return ytor
}

/** Skär segmenten a1–a2 och b1–b2 varandra (inklusive ändpunkter)? */
function segmentSkar(a1: PunktM, a2: PunktM, b1: PunktM, b2: PunktM): boolean {
  const d1x = a2[0] - a1[0]
  const d1y = a2[1] - a1[1]
  const d2x = b2[0] - b1[0]
  const d2y = b2[1] - b1[1]
  const namnare = d1x * d2y - d1y * d2x
  const ex = b1[0] - a1[0]
  const ey = b1[1] - a1[1]
  if (Math.abs(namnare) < 1e-12) {
    // Parallella: räcker att avgöra kolinjär överlappning grovt — behandlas
    // som träff bara om b1 eller b2 ligger på a-segmentet.
    if (Math.abs(ex * d1y - ey * d1x) > 1e-9) return false
    const t1 = (ex * d1x + ey * d1y) / (d1x * d1x + d1y * d1y || 1)
    const fx = b2[0] - a1[0]
    const fy = b2[1] - a1[1]
    const t2 = (fx * d1x + fy * d1y) / (d1x * d1x + d1y * d1y || 1)
    return Math.max(Math.min(t1, t2), 0) <= Math.min(Math.max(t1, t2), 1)
  }
  const t = (ex * d2y - ey * d2x) / namnare
  const u = (ex * d1y - ey * d1x) / namnare
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

/**
 * Ligger punkten i skuggan av prismat? Sant om strålen från punkten MOT
 * solen träffar polygonen inom skuggans räckvidd. Punkter inne i basen
 * räknas inte som skuggade av sitt eget objekt — en rabatts egen höjd ska
 * inte nolla rabattens soltimmar.
 */
export function iSkugga(
  punkt: PunktM,
  punkter: PunktM[],
  hojdM: number,
  solazimut: number,
  solhojd: number,
  norrVinkel: number,
): boolean {
  if (solhojd <= 0 || hojdM <= 0 || punkter.length < 3) return false
  if (punktIPolygon(punkt, punkter)) return false

  const langd = skugglangd(hojdM, solhojd)
  const motSolen = kompassTillRiktning(solazimut, norrVinkel)
  const slut: PunktM = [punkt[0] + motSolen[0] * langd, punkt[1] + motSolen[1] * langd]

  for (let i = 0; i < punkter.length; i++) {
    const j = (i + 1) % punkter.length
    if (segmentSkar(punkt, slut, punkter[i]!, punkter[j]!)) return true
  }
  return false
}
