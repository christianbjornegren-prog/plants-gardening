import { describe, expect, it } from 'vitest'
import type { Area, GardenMap, Plant } from '../data/types'
import { punktIPolygon } from './geometri'
import { beraknaPrickar } from './vaxtplacering'

function vaxt(id: string, areaId: string, position?: { x: number; y: number }): Plant {
  return { id, name: id, areaId, position, photoRefs: [], moveHistory: [] }
}

const karta: GardenMap = {
  widthM: 20,
  heightM: 10,
  objects: [
    {
      id: 'obj-rabatt',
      type: 'rabatt',
      name: 'Rabatten',
      points: [
        [2, 2],
        [8, 2],
        [8, 6],
        [2, 6],
      ],
    },
  ],
}

const ytor: Area[] = [
  { id: 'yta-rabatt', name: 'Rabatten', mapObjectId: 'obj-rabatt' },
  { id: 'yta-inne', name: 'Köksfönstret' },
]

describe('beraknaPrickar', () => {
  it('använder sparad position när den finns', () => {
    const prickar = beraknaPrickar([vaxt('a', 'yta-rabatt', { x: 3, y: 3 })], ytor, karta)
    expect(prickar).toHaveLength(1)
    expect(prickar[0]).toMatchObject({ x: 3, y: 3, egenPosition: true })
  })

  it('autoplacerar växter i kopplade objekt, inuti polygonen', () => {
    const vaxter = [1, 2, 3, 4, 5].map((n) => vaxt(`v${n}`, 'yta-rabatt'))
    const prickar = beraknaPrickar(vaxter, ytor, karta)
    expect(prickar).toHaveLength(5)
    for (const prick of prickar) {
      expect(punktIPolygon([prick.x, prick.y], karta.objects[0]!.points)).toBe(true)
      expect(prick.egenPosition).toBe(false)
    }
    // deterministiskt: samma indata ger samma lägen
    expect(beraknaPrickar(vaxter, ytor, karta)).toEqual(prickar)
  })

  it('utelämnar växter i ytor utan kartkoppling', () => {
    expect(beraknaPrickar([vaxt('inne', 'yta-inne')], ytor, karta)).toHaveLength(0)
  })

  it('sprider autoplacerade prickar så de inte hamnar på varandra', () => {
    const prickar = beraknaPrickar([vaxt('v1', 'yta-rabatt'), vaxt('v2', 'yta-rabatt')], ytor, karta)
    const [a, b] = prickar
    expect(Math.hypot(a!.x - b!.x, a!.y - b!.y)).toBeGreaterThan(0.3)
  })
})
