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

  it('bark-rampen håller en och samma kulör', () => {
    const bark: PalettNyckel[] = ['botten', 'panel', 'upphojd', 'linje', 'dis-svag', 'dis']
    const kulorer = bark.map((n) => hexTillOklch(PALETT[n]).H)
    for (const H of kulorer) expect(Math.abs(H - 100)).toBeLessThan(6)
  })

  it('bark-rampen är monotont ljusare', () => {
    const bark: PalettNyckel[] = ['botten', 'panel', 'upphojd', 'linje', 'dis-svag', 'dis', 'ljus']
    const L = bark.map((n) => hexTillOklch(PALETT[n]).L)
    expect([...L].sort((a, b) => a - b)).toEqual(L)
  })
})

describe('kontrast', () => {
  const { panel, botten, ljus, dis, tra, lov, fermob, 'fermob-lyft': fermobLyft } = PALETT

  it('primärtext klarar AAA mot både botten och panel', () => {
    expect(kontrast(ljus, botten)).toBeGreaterThanOrEqual(7)
    expect(kontrast(ljus, panel)).toBeGreaterThanOrEqual(7)
  })

  it('sekundärtext, trä och löv klarar AA som brödtext mot panel', () => {
    for (const farg of [dis, tra, lov]) {
      expect(kontrast(farg, panel)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('fyllnadsfärgerna klarar INTE brödtext — därför är regeln nödvändig', () => {
    for (const namn of ENDAST_FYLLNAD) {
      expect(kontrast(PALETT[namn], panel)).toBeLessThan(4.5)
    }
  })

  it('fermob-fyllning bär REN vit text — den varma ljus-tonen räcker inte', () => {
    expect(kontrast(TEXT_PA_FERMOB, fermob)).toBeGreaterThanOrEqual(4.5)
    // Skillnaden är knappt synlig men mätbar, och det är därför regeln finns.
    expect(kontrast(ljus, fermob)).toBeLessThan(4.5)
  })

  it('fermob-lyft klarar AA som text — den finns just för det', () => {
    expect(kontrast(fermobLyft, panel)).toBeGreaterThanOrEqual(4.5)
    expect(kontrast(fermobLyft, botten)).toBeGreaterThanOrEqual(4.5)
  })
})
