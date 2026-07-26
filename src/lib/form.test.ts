import { describe, expect, it } from 'vitest'
import type { PunktM } from '../data/types'
import { allaRunda, arRund, formTillPath, formTillPolygon, vaxlaRunt } from './form'
import { omslutandeRektangel, punktIPolygon } from './geometri'

const RUTA: PunktM[] = [
  [0, 0],
  [4, 0],
  [4, 3],
  [0, 3],
]

describe('runda hörn som data', () => {
  it('vaxlaRunt slår på och av, och håller listan sorterad', () => {
    expect(vaxlaRunt(undefined, 2)).toEqual([2])
    expect(vaxlaRunt([2], 0)).toEqual([0, 2])
    expect(vaxlaRunt([0, 2], 2)).toEqual([0])
  })

  it('arRund läser listan', () => {
    expect(arRund([1, 2], 1)).toBe(true)
    expect(arRund([1, 2], 0)).toBe(false)
    expect(arRund(undefined, 0)).toBe(false)
  })

  it('allaRunda ger alla index', () => {
    expect(allaRunda(4)).toEqual([0, 1, 2, 3])
  })
})

describe('formTillPath', () => {
  it('helt spetsig form blir raka linjer — inga onödiga bezierkurvor', () => {
    const d = formTillPath(RUTA)
    expect(d).toBe('M 0 0 L 4 0 L 4 3 L 0 3 L 0 0 Z')
    expect(d).not.toContain('C')
  })

  it('runda hörn ger bezierkurvor', () => {
    expect(formTillPath(RUTA, [1, 2])).toContain('C')
  })

  it('sluten form avslutas med Z, öppen gör det inte', () => {
    expect(formTillPath(RUTA, [], true)).toMatch(/Z$/)
    expect(formTillPath(RUTA, [], false)).not.toMatch(/Z$/)
  })

  it('klarar degenererade former utan att krascha', () => {
    expect(formTillPath([])).toBe('')
    expect(formTillPath([[1, 2]])).toBe('M 1 2')
  })
})

describe('formTillPolygon', () => {
  it('spetsig form ger tillbaka exakt hörnen', () => {
    expect(formTillPolygon(RUTA)).toEqual(RUTA)
  })

  it('rundad form ger fler punkter att träffa på', () => {
    expect(formTillPolygon(RUTA, allaRunda(4)).length).toBeGreaterThan(RUTA.length * 5)
  })

  it('kurvan går fortfarande genom hörnen', () => {
    const polygon = formTillPolygon(RUTA, allaRunda(4))
    for (const horn of RUTA) {
      expect(polygon.some((p) => Math.hypot(p[0] - horn[0], p[1] - horn[1]) < 1e-9)).toBe(true)
    }
  })

  it('en D-form buktar ut åt höger men behåller den raka vänsterkanten', () => {
    // Två spetsiga hörn till vänster, två runda till höger.
    const d: PunktM[] = [
      [0, 0],
      [3, 0],
      [3, 4],
      [0, 4],
    ]
    const polygon = formTillPolygon(d, [1, 2])
    const rekt = omslutandeRektangel(polygon)
    // Buktar ut förbi x = 3 …
    expect(rekt.x + rekt.bredd).toBeGreaterThan(3)
    // … men vänsterkanten står kvar på 0.
    expect(rekt.x).toBeCloseTo(0, 6)
  })

  it('punkt i utbuktningen räknas som inne i formen', () => {
    const polygon = formTillPolygon(RUTA, [1, 2])
    // Mitten ska alltid vara inne, oavsett rundning.
    expect(punktIPolygon([2, 1.5], polygon)).toBe(true)
  })

  it('punkt långt utanför är fortfarande utanför', () => {
    const polygon = formTillPolygon(RUTA, allaRunda(4))
    expect(punktIPolygon([20, 20], polygon)).toBe(false)
  })
})
