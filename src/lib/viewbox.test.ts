import { describe, expect, it } from 'vitest'
import {
  anpassaViewBox,
  begransaViewBox,
  panoreraViewBox,
  viewBoxAttribut,
  zoomaViewBox,
} from './viewbox'

describe('anpassaViewBox', () => {
  it('rymmer hela tomten med marginal och centrerar', () => {
    const vb = anpassaViewBox(20, 10, 1000, 1000)
    expect(vb.w).toBeGreaterThanOrEqual(20 + 1.6)
    expect(vb.h).toBe(vb.w) // kvadratisk behållare
    expect(vb.x + vb.w / 2).toBeCloseTo(10)
    expect(vb.y + vb.h / 2).toBeCloseTo(5)
  })

  it('följer behållarens proportioner', () => {
    const vb = anpassaViewBox(10, 10, 800, 400)
    expect(vb.w / vb.h).toBeCloseTo(2)
  })
})

describe('zoomaViewBox', () => {
  it('behåller fokuspunkten stilla', () => {
    const vb = { x: 0, y: 0, w: 10, h: 10 }
    const zoomad = zoomaViewBox(vb, 0.5, { x: 5, y: 5 })
    expect(zoomad.w).toBe(5)
    // fokus (5,5) ska ligga kvar på samma relativa plats (mitten)
    expect(zoomad.x + zoomad.w / 2).toBeCloseTo(5)
  })
})

describe('panoreraViewBox', () => {
  it('flyttar utan att ändra storlek', () => {
    const vb = panoreraViewBox({ x: 1, y: 2, w: 5, h: 5 }, 2, -1)
    expect(vb).toEqual({ x: 3, y: 1, w: 5, h: 5 })
  })
})

describe('begransaViewBox', () => {
  it('stoppar extrem utzoomning', () => {
    const vb = begransaViewBox({ x: -500, y: -500, w: 1000, h: 1000 }, 20, 10)
    expect(vb.w).toBeLessThanOrEqual(80)
  })

  it('stoppar extrem inzoomning', () => {
    const vb = begransaViewBox({ x: 5, y: 5, w: 0.1, h: 0.1 }, 20, 10)
    expect(vb.w).toBeGreaterThanOrEqual(1.5)
  })

  it('håller centrum nära tomten', () => {
    const vb = begransaViewBox({ x: 1000, y: 1000, w: 10, h: 10 }, 20, 10)
    expect(vb.x + vb.w / 2).toBeLessThanOrEqual(30)
    expect(vb.y + vb.h / 2).toBeLessThanOrEqual(15)
  })
})

describe('viewBoxAttribut', () => {
  it('formaterar för SVG', () => {
    expect(viewBoxAttribut({ x: 0, y: 1, w: 2, h: 3 })).toBe('0 1 2 3')
  })
})
