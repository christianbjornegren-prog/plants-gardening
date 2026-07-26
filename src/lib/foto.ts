import { komprimeraBild } from './bild'
import { sparaFoto } from './photoStore'

/**
 * Hela vägen från vald/tagen bild till en fotoRef: komprimera till max 1600 px
 * och lägg i photoStore. Kastar vidare — fotofel är aldrig tysta (se
 * docs/DESIGNLOGG.md), varje anropare visar felet.
 */
export async function taEmotFoto(uid: string, fil: Blob): Promise<string> {
  const komprimerad = await komprimeraBild(fil)
  return sparaFoto(uid, komprimerad)
}

/** Attribut som öppnar kameran direkt i mobilen i stället för filväljaren. */
export const KAMERA_ATTRIBUT = {
  type: 'file',
  accept: 'image/*',
  capture: 'environment',
} as const

export const BIBLIOTEK_ATTRIBUT = {
  type: 'file',
  accept: 'image/*',
} as const
