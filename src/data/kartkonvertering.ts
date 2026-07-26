import { PLATSTYPER, type Geometri, type PlatsTyp, type PunktM } from './types'

/**
 * Firestore stödjer inte nästlade arrayer, så polygonpunkter lagras som
 * { punkter: [{x, y}, …] } i dokumentet men är tupler [x, y] i appen.
 * Se docs/DATAMODELL.md.
 */

interface LagradPunkt {
  x: number
  y: number
}

export function tillLagradGeometri(geometri: Geometri): Record<string, unknown> {
  return { punkter: geometri.punkter.map(([x, y]) => ({ x, y })) }
}

/** undefined om fältet saknas eller är obrukbart. */
export function franLagradGeometri(data: unknown): Geometri | undefined {
  if (!data || typeof data !== 'object') return undefined
  const rader = (data as { punkter?: unknown }).punkter
  if (!Array.isArray(rader)) return undefined
  const punkter: PunktM[] = (rader as LagradPunkt[]).map((p) => [
    typeof p?.x === 'number' ? p.x : 0,
    typeof p?.y === 'number' ? p.y : 0,
  ])
  return punkter.length > 0 ? { punkter } : undefined
}

/**
 * Okänd typsträng (äldre schema, handredigerat dokument) får inte krascha
 * renderingen — falla tillbaka på 'annat'.
 */
export function tolkaPlatsTyp(varde: unknown): PlatsTyp {
  return PLATSTYPER.includes(varde as PlatsTyp) ? (varde as PlatsTyp) : 'annat'
}
