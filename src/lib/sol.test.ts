import { describe, expect, it } from 'vitest'
import {
  soldygn,
  solposition,
  stockholmsMinuter,
  stockholmsTid,
  tidszonOffsetMin,
} from './sol'

/**
 * Två oberoende facit, båda hämtade 2026-07-27 för Stockholm 59,3293°N
 * 18,0686°E:
 *
 * 1. api.sunrise-sunset.org (UTC, sekundprecision). Deras upp-/nedgångar
 *    avviker ~3 min från kanonisk NOAA (daglängd 18:44 mot NOAA:s 18:37 vid
 *    sommarsolståndet — kontrollräknat för hand: cos H0 = (cos 90,833° −
 *    sin φ sin δ)/(cos φ cos δ) ger 18:37). Därför 4,5 min tolerans där.
 *    Solmiddagen är dock oberoende av refraktionsmodell — 0,5 min tolerans.
 * 2. timeanddate.com: solnedgång 22:08 den 21 juni, daglängd 18 h 37 min,
 *    kortaste dagen 6 h 04 min. Vår modell ska träffa dessa inom 2 min.
 */
const STHLM = { lat: 59.3293, lon: 18.0686 } as const
const SIGTUNA = { lat: 59.62, lon: 17.72 } as const

const FACIT = [
  // [år, månad, dag, uppgång UTC, nedgång UTC, middag UTC]
  [2026, 6, 21, '01:27:29', '20:11:35', '10:49:32'],
  [2026, 12, 21, '07:40:11', '13:51:20', '10:45:45'],
  [2026, 3, 20, '04:46:58', '17:03:24', '10:55:11'],
  [2026, 9, 23, '04:32:39', '16:47:33', '10:40:06'],
] as const

function utcMin(klocka: string): number {
  const [h, m, s] = klocka.split(':').map(Number)
  return h! * 60 + m! + s! / 60
}

function minuterAv(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60
}

describe('soldygn mot facit', () => {
  for (const [ar, man, dag, upp, ned, middag] of FACIT) {
    it(`${ar}-${man}-${dag} i Stockholm: middag ±0,5 min, upp/ned ±4,5 min`, () => {
      const dygn = soldygn(ar, man, dag, STHLM.lat, STHLM.lon)
      expect(dygn.typ).toBe('normal')
      if (dygn.typ !== 'normal') return
      expect(Math.abs(minuterAv(dygn.uppgang) - utcMin(upp))).toBeLessThan(4.5)
      expect(Math.abs(minuterAv(dygn.nedgang) - utcMin(ned))).toBeLessThan(4.5)
      expect(Math.abs(minuterAv(dygn.middag) - utcMin(middag))).toBeLessThan(0.5)
    })
  }

  it('timeanddate-ankarna: solnedgång 22:08, daglängder 18:37 och 6:04', () => {
    const sommar = soldygn(2026, 6, 21, STHLM.lat, STHLM.lon)
    const vinter = soldygn(2026, 12, 21, STHLM.lat, STHLM.lon)
    if (sommar.typ !== 'normal' || vinter.typ !== 'normal') throw new Error('väntade normala dygn')

    expect(Math.abs(stockholmsMinuter(sommar.nedgang) - (22 * 60 + 8))).toBeLessThan(2)

    const sommarLangd = (sommar.nedgang.getTime() - sommar.uppgang.getTime()) / 60_000
    expect(Math.abs(sommarLangd - (18 * 60 + 37))).toBeLessThan(2)

    const vinterLangd = (vinter.nedgang.getTime() - vinter.uppgang.getTime()) / 60_000
    expect(Math.abs(vinterLangd - (6 * 60 + 4))).toBeLessThan(2)
  })

  it('midnattssol i Kiruna vid sommarsolståndet, polarnatt i december', () => {
    expect(soldygn(2026, 6, 21, 67.86, 20.22).typ).toBe('midnattssol')
    expect(soldygn(2026, 12, 21, 67.86, 20.22).typ).toBe('polarnatt')
  })
})

describe('solhöjd i zenit på 59,6°N', () => {
  it('sommarsolståndet: 90 − 59,62 + 23,44 ≈ 53,8°', () => {
    const dygn = soldygn(2026, 6, 21, SIGTUNA.lat, SIGTUNA.lon)
    if (dygn.typ !== 'normal') throw new Error('väntade normalt dygn')
    const { hojd, azimut } = solposition(dygn.middag, SIGTUNA.lat, SIGTUNA.lon)
    expect(hojd).toBeGreaterThan(53.4)
    expect(hojd).toBeLessThan(54.2)
    expect(Math.abs(azimut - 180)).toBeLessThan(1)
  })

  it('vintersolståndet: 90 − 59,62 − 23,44 ≈ 6,9° (+ refraktion)', () => {
    const dygn = soldygn(2026, 12, 21, SIGTUNA.lat, SIGTUNA.lon)
    if (dygn.typ !== 'normal') throw new Error('väntade normalt dygn')
    const { hojd } = solposition(dygn.middag, SIGTUNA.lat, SIGTUNA.lon)
    expect(hojd).toBeGreaterThan(6.6)
    expect(hojd).toBeLessThan(7.4)
  })

  it('dagjämning: middagshöjden ≈ 90 − latituden', () => {
    const dygn = soldygn(2026, 3, 20, SIGTUNA.lat, SIGTUNA.lon)
    if (dygn.typ !== 'normal') throw new Error('väntade normalt dygn')
    const { hojd } = solposition(dygn.middag, SIGTUNA.lat, SIGTUNA.lon)
    expect(Math.abs(hojd - (90 - SIGTUNA.lat))).toBeLessThan(0.6)
  })
})

describe('azimut roterar åt rätt håll', () => {
  it('öst på morgonen, syd mitt på dagen, väst på kvällen — strikt växande', () => {
    const klockslag = [6, 8, 10, 12, 14, 16, 18, 20]
    const azimuter = klockslag.map(
      (h) => solposition(stockholmsTid(2026, 6, 21, h * 60), STHLM.lat, STHLM.lon).azimut,
    )
    for (let i = 1; i < azimuter.length; i++) {
      expect(azimuter[i]!).toBeGreaterThan(azimuter[i - 1]!)
    }
    expect(azimuter[0]!).toBeLessThan(120) // morgon: östlig
    expect(azimuter[azimuter.length - 1]!).toBeGreaterThan(250) // kväll: västlig
  })

  it('vid dagjämning går solen upp nära rakt i öster och ner nära rakt i väster', () => {
    const dygn = soldygn(2026, 3, 20, STHLM.lat, STHLM.lon)
    if (dygn.typ !== 'normal') throw new Error('väntade normalt dygn')
    const upp = solposition(dygn.uppgang, STHLM.lat, STHLM.lon)
    const ned = solposition(dygn.nedgang, STHLM.lat, STHLM.lon)
    expect(Math.abs(upp.azimut - 90)).toBeLessThan(5)
    expect(Math.abs(ned.azimut - 270)).toBeLessThan(5)
  })
})

describe('Europe/Stockholm — tidszon och sommartid', () => {
  it('sommartid ger +120, vintertid +60', () => {
    expect(tidszonOffsetMin(new Date('2026-06-21T12:00:00Z'))).toBe(120)
    expect(tidszonOffsetMin(new Date('2026-12-21T12:00:00Z'))).toBe(60)
  })

  it('växlingsdagarna 2026: 29 mars respektive 25 oktober', () => {
    expect(tidszonOffsetMin(new Date('2026-03-29T00:30:00Z'))).toBe(60)
    expect(tidszonOffsetMin(new Date('2026-03-29T01:30:00Z'))).toBe(120)
    expect(tidszonOffsetMin(new Date('2026-10-25T00:30:00Z'))).toBe(120)
    expect(tidszonOffsetMin(new Date('2026-10-25T01:30:00Z'))).toBe(60)
  })

  it('väggklocka → absolut tid → väggklocka går runt', () => {
    const kl1030sommar = stockholmsTid(2026, 6, 21, 10 * 60 + 30)
    expect(kl1030sommar.toISOString()).toBe('2026-06-21T08:30:00.000Z')
    expect(stockholmsMinuter(kl1030sommar)).toBeCloseTo(10 * 60 + 30, 5)

    const kl1030vinter = stockholmsTid(2026, 12, 21, 10 * 60 + 30)
    expect(kl1030vinter.toISOString()).toBe('2026-12-21T09:30:00.000Z')
  })

  it('soluppgången 21 juni är 03:31 svensk sommartid (22:08 − 18:37)', () => {
    const dygn = soldygn(2026, 6, 21, STHLM.lat, STHLM.lon)
    if (dygn.typ !== 'normal') throw new Error('väntade normalt dygn')
    expect(Math.abs(stockholmsMinuter(dygn.uppgang) - (3 * 60 + 31))).toBeLessThan(2)
  })
})
