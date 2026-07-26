import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hexTillOklch, kontrast } from './farg'
import {
  ENDAST_FYLLNAD,
  KROMTAK,
  PALETT,
  SIGNALFARGER,
  TEXT_PA_FERMOB,
  type PalettNyckel,
} from './palett'

// Läses från disk: Tailwinds vite-plugin transformerar bort innehållet vid
// ?raw-import, och jsdom ger inte import.meta.url som file:-URL.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('paletten speglar @theme', () => {
  it('varje token i PALETT finns med samma hex i index.css', () => {
    for (const [namn, hex] of Object.entries(PALETT)) {
      expect(css.toLowerCase()).toContain(`--color-${namn}: ${hex.toLowerCase()};`)
    }
  })

  it('index.css deklarerar inga färgtokens utanför PALETT', () => {
    const deklarerade = [...css.matchAll(/--color-([a-z-]+):/g)].map((m) => m[1] as string)
    expect(deklarerade.sort()).toEqual(Object.keys(PALETT).sort())
  })
})

describe('brutna färger — kromtaket', () => {
  const nycklar = Object.keys(PALETT) as PalettNyckel[]

  it.each(nycklar.filter((n) => !SIGNALFARGER.includes(n)))(
    '%s ligger under kromtaket',
    (namn) => {
      expect(hexTillOklch(PALETT[namn]).C).toBeLessThanOrEqual(KROMTAK)
    },
  )

  it('fermob är den enda som bryter taket — annars kan ingen färg signalera', () => {
    expect(hexTillOklch(PALETT.fermob).C).toBeGreaterThan(KROMTAK * 1.8)
  })

  it('ramen håller en och samma varma kulör', () => {
    const ram: PalettNyckel[] = ['botten', 'panel', 'upphojd', 'linje', 'dis-svag', 'dis', 'tusch']
    for (const n of ram) expect(Math.abs(hexTillOklch(PALETT[n]).H - 88)).toBeLessThan(8)
  })

  it('ramen är monotont mörkare från sidan ner till tuschen', () => {
    const ram: PalettNyckel[] = ['panel', 'botten', 'upphojd', 'linje', 'dis-svag', 'dis', 'tusch']
    const L = ram.map((n) => hexTillOklch(PALETT[n]).L)
    expect([...L].sort((a, b) => b - a)).toEqual(L)
  })

  it('salvia är grön men fortfarande bruten', () => {
    const { C, H } = hexTillOklch(PALETT.salvia)
    expect(C).toBeLessThanOrEqual(KROMTAK)
    expect(H).toBeGreaterThan(100)
    expect(H).toBeLessThan(160)
  })
})

describe('kontrast', () => {
  const { panel, botten, salvia, tusch, dis, orm, fermob, 'fermob-text': fermobText } = PALETT

  it('tuschen klarar AAA mot sidan, korten och salviapanelerna', () => {
    for (const bak of [botten, panel, salvia]) {
      expect(kontrast(tusch, bak)).toBeGreaterThanOrEqual(7)
    }
  })

  it('sekundärtext och den gröna textfärgen klarar AA', () => {
    for (const farg of [dis, orm]) {
      expect(kontrast(farg, botten)).toBeGreaterThanOrEqual(4.5)
      expect(kontrast(farg, panel)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('fyllnadsfärgerna klarar INTE brödtext — därför är regeln nödvändig', () => {
    for (const namn of ENDAST_FYLLNAD) {
      expect(kontrast(PALETT[namn], botten)).toBeLessThan(4.5)
    }
  })

  it('fermob-fyllning bär REN vit text — den varma ljus-tonen räcker inte', () => {
    expect(kontrast(TEXT_PA_FERMOB, fermob)).toBeGreaterThanOrEqual(4.5)
    // Kräm-tonen är knappt synligt annorlunda men mätbart sämre.
    expect(kontrast(PALETT.botten, fermob)).toBeLessThan(4.5)
  })

  it('fermob-text klarar AA som text — den finns just för det', () => {
    for (const bak of [botten, panel, salvia]) {
      expect(kontrast(fermobText, bak)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
