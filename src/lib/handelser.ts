import type { Handelse, HandelseTyp, Vaxt } from '../data/types'

/** Urval och sammanställningar över händelser. Ren logik, inga sidoeffekter. */

/** Allt som loggats direkt på växten. Nyaste först (som listorna kommer in). */
export function handelserForVaxt(handelser: Handelse[], vaxtId: string): Handelse[] {
  return handelser.filter((h) => h.vaxtId === vaxtId)
}

/**
 * Platsens egna händelser plus det som loggats på växterna som står där NU.
 * Flyttar en växt därifrån följer dess historik med växten, inte platsen.
 */
export function handelserForPlats(
  handelser: Handelse[],
  vaxter: Vaxt[],
  platsId: string,
): Handelse[] {
  const harNu = new Set(vaxter.filter((v) => v.platsId === platsId).map((v) => v.id))
  return handelser.filter(
    (h) => h.platsId === platsId || (h.vaxtId !== undefined && harNu.has(h.vaxtId)),
  )
}

/**
 * Fototidslinjen — ÄLDST FÖRST. Hela poängen är att se april före september.
 * Foton utan datum sorteras in på sitt gissade datum men behåller flaggan.
 */
export function fototidslinje(handelser: Handelse[]): Handelse[] {
  return handelser
    .filter((h) => h.fotoRef !== undefined)
    .sort((a, b) => a.datum.localeCompare(b.datum))
}

/** Senaste händelsen av en viss typ, eller undefined. Listan antas nyast först. */
export function senasteAvTyp(handelser: Handelse[], typ: HandelseTyp): Handelse | undefined {
  return handelser.find((h) => h.typ === typ)
}

/** Senaste händelsen som har ett foto — hjältebilden på Hem. */
export function senastaFotot(handelser: Handelse[]): Handelse | undefined {
  return handelser.find((h) => h.fotoRef !== undefined)
}

/**
 * Senaste fotot per växt. Används både av växtlistan och av växtprickarna på
 * ritningen — miniatyren ska vara den senaste bilden, inte den första.
 */
export function senasteFotoPerVaxt(handelser: Handelse[]): Map<string, string> {
  const senaste = new Map<string, { datum: string; fotoRef: string }>()
  for (const h of handelser) {
    if (!h.fotoRef || !h.vaxtId) continue
    const nuvarande = senaste.get(h.vaxtId)
    if (!nuvarande || h.datum > nuvarande.datum) {
      senaste.set(h.vaxtId, { datum: h.datum, fotoRef: h.fotoRef })
    }
  }
  return new Map([...senaste].map(([id, v]) => [id, v.fotoRef]))
}

const DYGN_MS = 24 * 60 * 60 * 1000

export function handelserSedan(handelser: Handelse[], dagar: number, nu = new Date()): Handelse[] {
  const grans = new Date(nu.getTime() - dagar * DYGN_MS).toISOString()
  return handelser.filter((h) => h.datum >= grans)
}

export interface OfotograferadVaxt {
  vaxt: Vaxt
  /** Dagar sedan senaste foto, eller undefined om växten aldrig fotats. */
  dagarSedan?: number
}

/**
 * Växter som inte fotats på länge — sorterade med den mest försummade först.
 * Aldrig fotade kommer först av alla; en växt utan bild är den som saknas mest.
 * Planerade växter räknas inte, de finns ju inte än.
 */
export function ofotograferade(
  vaxter: Vaxt[],
  handelser: Handelse[],
  minstDagar = 30,
  nu = new Date(),
): OfotograferadVaxt[] {
  const senasteFoto = new Map<string, string>()
  for (const h of handelser) {
    if (!h.fotoRef || !h.vaxtId) continue
    const nuvarande = senasteFoto.get(h.vaxtId)
    if (!nuvarande || h.datum > nuvarande) senasteFoto.set(h.vaxtId, h.datum)
  }

  return vaxter
    .filter((v) => v.status === 'finns')
    .map((vaxt) => {
      const datum = senasteFoto.get(vaxt.id)
      if (!datum) return { vaxt }
      return {
        vaxt,
        dagarSedan: Math.floor((nu.getTime() - new Date(datum).getTime()) / DYGN_MS),
      }
    })
    .filter((rad) => rad.dagarSedan === undefined || rad.dagarSedan >= minstDagar)
    .sort((a, b) => {
      if (a.dagarSedan === undefined) return b.dagarSedan === undefined ? 0 : -1
      if (b.dagarSedan === undefined) return 1
      return b.dagarSedan - a.dagarSedan
    })
}
