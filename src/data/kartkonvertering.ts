import type { GardenMap, MapObject, MapObjectType, PunktM } from './types'

/**
 * Firestore stödjer inte nästlade arrayer, så polygonpunkter lagras som
 * [{x, y}, …] i dokumentet men är tupler [x, y] i appen.
 * Se docs/DATAMODELL.md.
 */

interface LagradPunkt {
  x: number
  y: number
}

export function tillLagratObjekt(objekt: MapObject): Record<string, unknown> {
  const lagrat: Record<string, unknown> = {
    id: objekt.id,
    type: objekt.type,
    name: objekt.name,
    points: objekt.points.map(([x, y]) => ({ x, y })),
  }
  if (objekt.note !== undefined) lagrat.note = objekt.note
  return lagrat
}

export function franLagratObjekt(data: unknown): MapObject {
  const objekt = (data ?? {}) as Record<string, unknown>
  const punkter: PunktM[] = Array.isArray(objekt.points)
    ? (objekt.points as LagradPunkt[]).map((p) => [
        typeof p.x === 'number' ? p.x : 0,
        typeof p.y === 'number' ? p.y : 0,
      ])
    : []
  return {
    id: typeof objekt.id === 'string' ? objekt.id : '',
    type: (objekt.type as MapObjectType | undefined) ?? 'annat',
    name: typeof objekt.name === 'string' ? objekt.name : '',
    points: punkter,
    note: typeof objekt.note === 'string' ? objekt.note : undefined,
  }
}

export function tillLagradKarta(karta: GardenMap): Record<string, unknown> {
  return {
    widthM: karta.widthM,
    heightM: karta.heightM,
    objects: karta.objects.map(tillLagratObjekt),
  }
}
