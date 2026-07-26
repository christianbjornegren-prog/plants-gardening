import { describe, expect, it } from 'vitest'
import type { PunktM } from '../data/types'
import {
  MAX_SKUGGLANGD_M,
  iSkugga,
  kompassTillRiktning,
  skugglangd,
  skuggpolygoner,
  skuggriktning,
} from './skugga'
import { soltimmarForPolygon, soltimmarRaster } from './soltimmar'

const KVADRAT: PunktM[] = [
  [4, 4],
  [6, 4],
  [6, 6],
  [4, 6],
]

describe('skugglangd', () => {
  it('1 m högt objekt: 1 m skugga vid 45°, √3 m vid 30°, h·√3 vid 30°', () => {
    expect(skugglangd(1, 45)).toBeCloseTo(1, 6)
    expect(skugglangd(1, 30)).toBeCloseTo(Math.sqrt(3), 6)
    expect(skugglangd(2, 45)).toBeCloseTo(2, 6)
  })

  it('klipps vid maxlängden när solen står lågt', () => {
    expect(skugglangd(2, 0.1)).toBe(MAX_SKUGGLANGD_M)
    expect(skugglangd(2, 0)).toBe(MAX_SKUGGLANGD_M)
  })

  it('utan höjd ingen skugga', () => {
    expect(skugglangd(0, 45)).toBe(0)
  })
})

describe('kompassTillRiktning — y är NEDÅT i ritningen', () => {
  it('norr är uppåt när norrvinkeln är 0', () => {
    const [x, y] = kompassTillRiktning(0, 0)
    expect(x).toBeCloseTo(0, 9)
    expect(y).toBeCloseTo(-1, 9)
  })

  it('öster är åt höger, söder nedåt, väster åt vänster', () => {
    expect(kompassTillRiktning(90, 0)[0]).toBeCloseTo(1, 9)
    expect(kompassTillRiktning(180, 0)[1]).toBeCloseTo(1, 9)
    expect(kompassTillRiktning(270, 0)[0]).toBeCloseTo(-1, 9)
  })

  it('norrvinkeln vrider: med norr 90° medurs från uppåt pekar norr åt höger', () => {
    const [x, y] = kompassTillRiktning(0, 90)
    expect(x).toBeCloseTo(1, 9)
    expect(y).toBeCloseTo(0, 9)
  })

  it('sol i söder ger skugga mot norr', () => {
    const [x, y] = skuggriktning(180, 0)
    expect(x).toBeCloseTo(0, 9)
    expect(y).toBeCloseTo(-1, 9)
  })
})

describe('iSkugga', () => {
  it('punkt norr om en mur skuggas när solen står i söder — inom räckvidden', () => {
    // 2 m hög kvadrat, sol 45° i söder: skuggan når 2 m norrut från kanten y=4.
    expect(iSkugga([5, 3], KVADRAT, 2, 180, 45, 0)).toBe(true)
    expect(iSkugga([5, 2.5], KVADRAT, 2, 180, 45, 0)).toBe(true)
    expect(iSkugga([5, 1.5], KVADRAT, 2, 180, 45, 0)).toBe(false)
  })

  it('punkter åt fel håll skuggas inte', () => {
    expect(iSkugga([5, 7], KVADRAT, 2, 180, 45, 0)).toBe(false)
    expect(iSkugga([2, 5], KVADRAT, 2, 180, 45, 0)).toBe(false)
  })

  it('objektet skuggar inte sitt eget inre', () => {
    expect(iSkugga([5, 5], KVADRAT, 2, 180, 45, 0)).toBe(false)
  })

  it('lägre sol ger längre skugga', () => {
    // 30°: räckvidd 2·√3 ≈ 3,46 m — punkten 3 m ut skuggas nu.
    expect(iSkugga([5, 1.5], KVADRAT, 2, 180, 30, 0)).toBe(true)
  })

  it('norrvinkeln vrider skuggan med sig', () => {
    // Ritningen håller norr NEDÅT (180°): solens söder är då ritningens uppåt,
    // så skuggan faller nedåt — mot större y.
    expect(iSkugga([5, 7], KVADRAT, 2, 180, 45, 180)).toBe(true)
    expect(iSkugga([5, 3], KVADRAT, 2, 180, 45, 180)).toBe(false)
  })

  it('solen nere eller höjd noll: ingen skugga från objektet', () => {
    expect(iSkugga([5, 3], KVADRAT, 2, 180, 0, 0)).toBe(false)
    expect(iSkugga([5, 3], KVADRAT, 0, 180, 45, 0)).toBe(false)
  })
})

describe('skuggpolygoner', () => {
  it('projektionen ligger skugglängden bort, plus en fyrhörning per kant', () => {
    const ytor = skuggpolygoner(KVADRAT, 2, 180, 45, 0)
    // 1 projektion + 4 kantfyrhörningar.
    expect(ytor).toHaveLength(5)
    const projektion = ytor[0]!
    expect(projektion[0]![0]).toBeCloseTo(4, 6)
    expect(projektion[0]![1]).toBeCloseTo(2, 6) // [4,4] flyttad 2 m norrut
  })

  it('tomt när solen är nere eller höjden saknas', () => {
    expect(skuggpolygoner(KVADRAT, 2, 180, -3, 0)).toHaveLength(0)
    expect(skuggpolygoner(KVADRAT, 0, 180, 45, 0)).toHaveLength(0)
  })
})

describe('soltimmar', () => {
  it('fri yta får hela dagen, ytan intill en hög mur betydligt mindre', () => {
    const start = performance.now()
    const raster = soltimmarRaster({
      tomtBreddM: 16,
      tomtHojdM: 11,
      ar: 2026,
      manad: 6,
      dag: 21,
      latitud: 59.62,
      longitud: 17.72,
      norrVinkel: 0,
      // Hög mur tvärs över södra delen: [2,8]–[14,8], 0,4 m tjock, 6 m hög.
      skuggare: [
        {
          punkter: [
            [2, 8],
            [14, 8],
            [14, 8.4],
            [2, 8.4],
          ],
          hojdM: 6,
        },
      ],
    })
    const tidMs = performance.now() - start

    expect(raster.maxTimmar).toBeGreaterThan(17.5)
    expect(raster.maxTimmar).toBeLessThan(19.5)

    const fri = soltimmarForPolygon(raster, [
      [0.5, 0.5],
      [3, 0.5],
      [3, 2],
      [0.5, 2],
    ])!
    // Precis norr om muren: skuggad större delen av dagen.
    const skuggad = soltimmarForPolygon(raster, [
      [7, 7],
      [9, 7],
      [9, 7.9],
      [7, 7.9],
    ])!
    expect(fri).toBeGreaterThan(raster.maxTimmar * 0.85)
    expect(skuggad).toBeLessThan(fri * 0.65)

    // "Omedelbart": hela dagens raster på en radhustomt ska gå på under 150 ms.
    expect(tidMs).toBeLessThan(150)
  })

  it('utan skuggare får varje ruta dagens alla timmar', () => {
    const raster = soltimmarRaster({
      tomtBreddM: 4,
      tomtHojdM: 4,
      ar: 2026,
      manad: 9,
      dag: 23,
      latitud: 59.62,
      longitud: 17.72,
      norrVinkel: 0,
      skuggare: [],
    })
    for (const varde of raster.timmar) {
      expect(varde).toBeCloseTo(raster.maxTimmar, 5)
    }
  })

  it('polygon utanför rastret ger undefined, inte noll', () => {
    const raster = soltimmarRaster({
      tomtBreddM: 4,
      tomtHojdM: 4,
      ar: 2026,
      manad: 6,
      dag: 21,
      latitud: 59.62,
      longitud: 17.72,
      norrVinkel: 0,
      skuggare: [],
    })
    expect(
      soltimmarForPolygon(raster, [
        [10, 10],
        [11, 10],
        [11, 11],
      ]),
    ).toBeUndefined()
  })
})
