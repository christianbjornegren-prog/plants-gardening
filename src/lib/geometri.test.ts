import { describe, expect, it } from 'vitest'
import type { PunktM } from '../data/types'
import {
  avstand,
  begransa,
  centroid,
  flyttaPunkter,
  omkrets,
  omslutandeRektangel,
  punktIPolygon,
  skalaTillMatt,
  snappa,
  snappaPunkt,
} from './geometri'

const kvadrat: PunktM[] = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
]

describe('snappa', () => {
  it('snappar till 0,1 m', () => {
    expect(snappa(3.14)).toBeCloseTo(3.1)
    expect(snappa(3.16)).toBeCloseTo(3.2)
    expect(snappa(-0.04)).toBeCloseTo(0)
  })

  it('snappar punkter', () => {
    expect(snappaPunkt([1.23, 4.56])).toEqual([1.2, 4.6])
  })
})

describe('begransa/avstand', () => {
  it('begränsar', () => {
    expect(begransa(5, 0, 3)).toBe(3)
    expect(begransa(-1, 0, 3)).toBe(0)
    expect(begransa(2, 0, 3)).toBe(2)
  })

  it('mäter avstånd', () => {
    expect(avstand([0, 0], [3, 4])).toBe(5)
  })
})

describe('centroid', () => {
  it('hittar mitten av en kvadrat', () => {
    const [x, y] = centroid(kvadrat)
    expect(x).toBeCloseTo(2)
    expect(y).toBeCloseTo(2)
  })

  it('klarar degenererade polygoner (linje)', () => {
    const [x, y] = centroid([
      [0, 0],
      [2, 0],
    ])
    expect(x).toBeCloseTo(1)
    expect(y).toBeCloseTo(0)
  })
})

describe('punktIPolygon', () => {
  it('inne är inne, ute är ute', () => {
    expect(punktIPolygon([2, 2], kvadrat)).toBe(true)
    expect(punktIPolygon([5, 2], kvadrat)).toBe(false)
    expect(punktIPolygon([-0.1, 2], kvadrat)).toBe(false)
  })

  it('fungerar för icke-konvexa polygoner', () => {
    const lForm: PunktM[] = [
      [0, 0],
      [4, 0],
      [4, 2],
      [2, 2],
      [2, 4],
      [0, 4],
    ]
    expect(punktIPolygon([1, 3], lForm)).toBe(true)
    expect(punktIPolygon([3, 3], lForm)).toBe(false)
  })
})

describe('omkrets', () => {
  it('summerar sidorna i en sluten polygon', () => {
    expect(omkrets(kvadrat)).toBe(16)
  })

  it('är 0 för färre än två punkter', () => {
    expect(omkrets([[1, 1]])).toBe(0)
  })
})

describe('omslutandeRektangel', () => {
  it('beräknar bounding box', () => {
    expect(omslutandeRektangel(kvadrat)).toEqual({ x: 0, y: 0, bredd: 4, hojd: 4 })
  })
})

describe('flyttaPunkter', () => {
  it('flyttar alla punkter', () => {
    expect(
      flyttaPunkter(
        [
          [1, 1],
          [2, 2],
        ],
        0.5,
        -1,
      ),
    ).toEqual([
      [1.5, 0],
      [2.5, 1],
    ])
  })

  it('läcker inte flyttalsrester till sparad data', () => {
    const [forsta] = flyttaPunkter([[0.1, 0.1]], 0.2, 0.2)
    expect(forsta).toEqual([0.3, 0.3])
  })
})

describe('skalaTillMatt', () => {
  it('skalar polygonen till exakta mått, förankrad i övre vänstra hörnet', () => {
    expect(skalaTillMatt(kvadrat, 2, 8)).toEqual([
      [0, 0],
      [2, 0],
      [2, 8],
      [0, 8],
    ])
  })

  it('behåller ankarpunkten för förskjutna polygoner', () => {
    const skalad = skalaTillMatt(
      [
        [2, 3],
        [6, 3],
        [6, 5],
        [2, 5],
      ],
      2,
      1,
    )
    expect(skalad).toEqual([
      [2, 3],
      [4, 3],
      [4, 4],
      [2, 4],
    ])
  })

  it('lämnar degenererade polygoner orörda', () => {
    const linje: [number, number][] = [
      [0, 0],
      [4, 0],
    ]
    expect(skalaTillMatt(linje, 2, 2)).toEqual(linje)
  })
})
