import { describe, expect, it } from 'vitest'
import type { Plats, PunktM, Vaxt } from '../data/types'
import { punktIPolygon } from './geometri'
import { beraknaPrickar, platsVidPunkt } from './vaxtplacering'

const RUTA: PunktM[] = [
  [1, 1],
  [5, 1],
  [5, 4],
  [1, 4],
]

function plats(id: string, extra: Partial<Plats> = {}): Plats {
  return {
    id,
    tradgardId: 'baksidan',
    namn: id,
    typ: 'rabatt',
    status: 'finns',
    geometri: { punkter: RUTA },
    ...extra,
  }
}

function vaxt(id: string, extra: Partial<Vaxt> = {}): Vaxt {
  return { id, namn: id, status: 'finns', ...extra }
}

describe('beraknaPrickar', () => {
  it('använder sparad position när den finns', () => {
    const prickar = beraknaPrickar(
      [vaxt('v', { platsId: 'p', position: { x: 2.5, y: 3 } })],
      [plats('p')],
      'baksidan',
    )
    expect(prickar).toHaveLength(1)
    expect(prickar[0]).toMatchObject({ x: 2.5, y: 3, egenPosition: true })
  })

  it('autoplacerar inuti formen när position saknas', () => {
    const prickar = beraknaPrickar([vaxt('v', { platsId: 'p' })], [plats('p')], 'baksidan')
    expect(prickar[0]?.egenPosition).toBe(false)
    expect(punktIPolygon([prickar[0]!.x, prickar[0]!.y], RUTA)).toBe(true)
  })

  it('är deterministisk — samma indata ger samma prickar', () => {
    const vaxter = [vaxt('a', { platsId: 'p' }), vaxt('b', { platsId: 'p' })]
    expect(beraknaPrickar(vaxter, [plats('p')], 'baksidan')).toEqual(
      beraknaPrickar(vaxter, [plats('p')], 'baksidan'),
    )
  })

  it('sprider flera växter i samma form', () => {
    const vaxter = ['a', 'b', 'c'].map((id) => vaxt(id, { platsId: 'p' }))
    const prickar = beraknaPrickar(vaxter, [plats('p')], 'baksidan')
    const unika = new Set(prickar.map((p) => `${p.x},${p.y}`))
    expect(unika.size).toBe(3)
  })

  it('ritar inte hemlösa växter', () => {
    expect(beraknaPrickar([vaxt('v')], [plats('p')], 'baksidan')).toEqual([])
  })

  it('ritar inte växter på platser utan form (t.ex. köksfönstret)', () => {
    const fonster = plats('kok', { geometri: undefined })
    expect(beraknaPrickar([vaxt('v', { platsId: 'kok' })], [fonster], 'baksidan')).toEqual([])
  })

  it('ritar bara växter i den efterfrågade trädgården', () => {
    const framme = plats('p', { tradgardId: 'framsidan' })
    expect(beraknaPrickar([vaxt('v', { platsId: 'p' })], [framme], 'baksidan')).toEqual([])
    expect(beraknaPrickar([vaxt('v', { platsId: 'p' })], [framme], 'framsidan')).toHaveLength(1)
  })
})

describe('platsVidPunkt', () => {
  it('hittar platsen under punkten', () => {
    expect(platsVidPunkt([3, 2], [plats('p')], 'baksidan')?.id).toBe('p')
  })

  it('ger undefined utanför alla former', () => {
    expect(platsVidPunkt([20, 20], [plats('p')], 'baksidan')).toBeUndefined()
  })

  it('låter översta formen vinna — ett träd ovanpå en rabatt slukas inte', () => {
    const under = plats('rabatt')
    const over = plats('trad', { typ: 'träd' })
    expect(platsVidPunkt([3, 2], [under, over], 'baksidan')?.id).toBe('trad')
  })

  it('ignorerar former i andra trädgårdar', () => {
    expect(platsVidPunkt([3, 2], [plats('p', { tradgardId: 'framsidan' })], 'baksidan')).toBeUndefined()
  })
})
