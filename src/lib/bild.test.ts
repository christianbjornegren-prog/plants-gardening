import { describe, expect, it } from 'vitest'
import { beraknaMalstorlek } from './bild'

describe('beraknaMalstorlek', () => {
  it('lämnar små bilder orörda', () => {
    expect(beraknaMalstorlek(800, 600)).toEqual({ bredd: 800, hojd: 600 })
  })

  it('skalar ner liggande bilder till max 1600 px på längsta sidan', () => {
    expect(beraknaMalstorlek(4000, 3000)).toEqual({ bredd: 1600, hojd: 1200 })
  })

  it('skalar ner stående bilder', () => {
    expect(beraknaMalstorlek(3000, 4000)).toEqual({ bredd: 1200, hojd: 1600 })
  })

  it('hanterar exakt gränsen', () => {
    expect(beraknaMalstorlek(1600, 900)).toEqual({ bredd: 1600, hojd: 900 })
  })

  it('respekterar annan maxstorlek', () => {
    expect(beraknaMalstorlek(1000, 500, 100)).toEqual({ bredd: 100, hojd: 50 })
  })

  it('blir aldrig 0 px', () => {
    expect(beraknaMalstorlek(10000, 1, 100).hojd).toBe(1)
  })
})
