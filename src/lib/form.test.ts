import { describe, expect, it } from 'vitest'
import type { PunktM } from '../data/types'
import {
  allaRunda,
  arRund,
  formTillPath,
  formTillPolygon,
  laggTillPunkt,
  segmentMitter,
  taBortPunkt,
  vaxlaRunt,
} from './form'
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

describe('tangenten begränsas så kurvan inte slår öglor', () => {
  /**
   * Triangeln som gav den synliga krumeluren: två långa sidor och en mycket
   * kort. Tangenten räknas på avståndet mellan grannarna, så det korta
   * segmentet fick förr en tangent längre än sig självt.
   */
  const OJAMN: PunktM[] = [
    [0, 0],
    [10, 1],
    [9.6, 1.2],
    [1, 8],
  ]

  it('kontrollpunkterna hamnar inte utanför sitt eget segment', () => {
    const d = formTillPath(OJAMN, allaRunda(4))
    const tal = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))
    // Inga vilda värden långt utanför formen — det är så en ögla ser ut.
    for (const v of tal) expect(Math.abs(v)).toBeLessThan(20)
  })

  it('kurvan korsar inte sig själv', () => {
    const polygon = formTillPolygon(OJAMN, allaRunda(4), true, 16)
    expect(harSjalvkorsning(polygon)).toBe(false)
  })

  it('en jämn form är fortfarande mjuk', () => {
    expect(formTillPath(RUTA, allaRunda(4))).toContain('C')
  })
})

/** Enkel O(n²)-koll: korsar två icke-grannsegment varandra? */
function harSjalvkorsning(p: PunktM[]): boolean {
  const n = p.length
  const korsar = (a: PunktM, b: PunktM, c: PunktM, d: PunktM) => {
    const t = (q: PunktM, r: PunktM, s: PunktM) =>
      Math.sign((r[0] - q[0]) * (s[1] - q[1]) - (r[1] - q[1]) * (s[0] - q[0]))
    return t(a, b, c) !== t(a, b, d) && t(c, d, a) !== t(c, d, b)
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue
      if (korsar(p[i]!, p[(i + 1) % n]!, p[j]!, p[(j + 1) % n]!)) return true
    }
  }
  return false
}

describe('lägga till och ta bort hörn i efterhand', () => {
  it('nytt hörn hamnar mitt på segmentet', () => {
    const { punkter } = laggTillPunkt(RUTA, undefined, 0)
    expect(punkter).toHaveLength(5)
    expect(punkter[1]).toEqual([2, 0])
  })

  it('rundningen följer med när index förskjuts', () => {
    // Hörn 3 är runt. Lägger vi till efter hörn 0 blir det gamla 3:an en 4:a.
    const { runda } = laggTillPunkt(RUTA, [3], 0)
    expect(runda).toEqual([4])
  })

  it('ett nytt hörn på en mjuk kant blir också mjukt', () => {
    const { runda } = laggTillPunkt(RUTA, [1], 1)
    expect(runda).toEqual([1, 2])
  })

  it('ett nytt hörn på en spetsig kant blir spetsigt', () => {
    const { runda } = laggTillPunkt(RUTA, [3], 1)
    expect(runda).not.toContain(2)
  })

  it('borttaget hörn drar med sig sin rundning och flyttar resten', () => {
    const { punkter, runda } = taBortPunkt(RUTA, [1, 3], 1)
    expect(punkter).toHaveLength(3)
    expect(runda).toEqual([2])
  })

  it('en form kan inte krympas under tre hörn', () => {
    const triangel: PunktM[] = [[0, 0], [2, 0], [1, 2]]
    expect(taBortPunkt(triangel, undefined, 0).punkter).toEqual(triangel)
  })

  it('segmentMitter ger en plupp per kant', () => {
    expect(segmentMitter(RUTA)).toHaveLength(4)
    expect(segmentMitter(RUTA, false)).toHaveLength(3)
  })

  it('formen ser likadan ut direkt efter att ett hörn lagts till', () => {
    // Mittpunkten ligger på linjen, så en spetsig form ändrar inte utseende.
    const fore = formTillPolygon(RUTA)
    const { punkter, runda } = laggTillPunkt(RUTA, undefined, 0)
    const efter = formTillPolygon(punkter, runda)
    expect(omslutandeRektangel(efter)).toEqual(omslutandeRektangel(fore))
  })
})
