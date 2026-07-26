/**
 * Datalagrets felkanal.
 *
 * Skrivningar är fire-and-forget mot cachen (se docs/ARKITEKTUR.md). Det är
 * rätt mönster, men det innebar att en nekad skrivning bara hamnade i
 * konsolen: Firestore lägger på ändringen lokalt, servern nekar, och
 * ändringen rullas tillbaka. På skärmen ser det ut som att knappen "flimrar"
 * eller att ingenting händer.
 *
 * Här samlas felen så att UI:t kan säga vad som gick fel i stället.
 */

export type FelTyp = 'skrivning' | 'lasning'

export interface DataFel {
  typ: FelTyp
  /** Firestore-kod, t.ex. 'permission-denied'. */
  kod?: string
  /** Färdig svensk text att visa. */
  meddelande: string
  /** true när det bara är inloggningen som saknas — då hjälper det att logga in igen. */
  behorighet: boolean
}

type Lyssnare = (fel: DataFel) => void
const lyssnare = new Set<Lyssnare>()

export function lyssnaPaDataFel(cb: Lyssnare): () => void {
  lyssnare.add(cb)
  return () => lyssnare.delete(cb)
}

function kodFor(fel: unknown): string | undefined {
  const kod = (fel as { code?: unknown } | null)?.code
  return typeof kod === 'string' ? kod : undefined
}

export function tolkaFel(fel: unknown, typ: FelTyp): DataFel {
  const kod = kodFor(fel)
  if (kod === 'permission-denied' || kod === 'unauthenticated') {
    return {
      typ,
      kod,
      behorighet: true,
      meddelande:
        typ === 'lasning'
          ? 'Trädgården kunde inte läsas — kontot saknar behörighet. Logga in igen.'
          : 'Ändringen sparades inte — kontot saknar behörighet. Logga in igen.',
    }
  }
  if (kod === 'unavailable') {
    return {
      typ,
      kod,
      behorighet: false,
      meddelande:
        typ === 'lasning'
          ? 'Ingen kontakt med servern. Du ser det som sparats i telefonen.'
          : 'Sparat lokalt — synkas när du får kontakt igen.',
    }
  }
  return {
    typ,
    kod,
    behorighet: false,
    meddelande: typ === 'lasning' ? 'Trädgården kunde inte läsas.' : 'Ändringen sparades inte.',
  }
}

export function rapporteraDataFel(fel: unknown, typ: FelTyp): void {
  const tolkat = tolkaFel(fel, typ)
  console.error('Ripvägen 11:', tolkat.meddelande, fel)
  for (const cb of lyssnare) cb(tolkat)
}
