import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MAX_FORSLAG, normalisera, sokVaxtnamn, type VaxtNamn } from './vaxtsok'

const ALLA: VaxtNamn[] = JSON.parse(readFileSync('src/data/vaxtnamn.json', 'utf8'))

const PROV: VaxtNamn[] = [
  { sv: 'Hortensia', lat: 'Hydrangea', kat: 'buske' },
  { sv: 'Vipphortensia', lat: 'Hydrangea paniculata', kat: 'buske' },
  { sv: 'Funkia', lat: 'Hosta', kat: 'perenn' },
  { sv: 'Hosta', lat: 'Hosta', kat: 'perenn', alt: ['funkia'] },
  { sv: 'Svarta vinbär', lat: 'Ribes nigrum', kat: 'bär', alt: ['svartvinbär'] },
  { sv: 'Ölandstok', lat: 'Dasiphora fruticosa', kat: 'buske', alt: ['tok'] },
]

describe('sokVaxtnamn', () => {
  it('ger inga förslag förrän man skrivit två tecken', () => {
    expect(sokVaxtnamn(PROV, '')).toEqual([])
    expect(sokVaxtnamn(PROV, 'h')).toEqual([])
    expect(sokVaxtnamn(PROV, 'ho').length).toBeGreaterThan(0)
  })

  it('rankar exakt före början-på före mitt-i', () => {
    const namn = sokVaxtnamn(PROV, 'hortensia').map((p) => p.sv)
    expect(namn[0]).toBe('Hortensia')
    expect(namn).toContain('Vipphortensia')
  })

  it('hittar på latinskt namn', () => {
    expect(sokVaxtnamn(PROV, 'hydrangea').map((p) => p.sv)).toContain('Hortensia')
  })

  it('hittar på alternativnamn, men rankar svenska namnet först', () => {
    const namn = sokVaxtnamn(PROV, 'funkia').map((p) => p.sv)
    expect(namn[0]).toBe('Funkia')
    expect(namn).toContain('Hosta')
  })

  it('hittar början av ett senare ord', () => {
    expect(sokVaxtnamn(PROV, 'vinbär').map((p) => p.sv)).toContain('Svarta vinbär')
  })

  it('bryr sig inte om versaler eller å ä ö', () => {
    expect(sokVaxtnamn(PROV, 'ÖLANDSTOK').map((p) => p.sv)).toContain('Ölandstok')
    expect(sokVaxtnamn(PROV, 'olandstok').map((p) => p.sv)).toContain('Ölandstok')
    expect(normalisera('Ölandstok')).toBe('olandstok')
  })

  it('ger aldrig fler än åtta förslag', () => {
    expect(sokVaxtnamn(ALLA, 'a').length).toBe(0)
    expect(sokVaxtnamn(ALLA, 'ro').length).toBeLessThanOrEqual(MAX_FORSLAG)
  })
})

describe('namnlistan', () => {
  it('har mellan 500 och 800 namn', () => {
    expect(ALLA.length).toBeGreaterThanOrEqual(500)
    expect(ALLA.length).toBeLessThanOrEqual(800)
  })

  it('har svenskt namn, latinskt namn och kategori på varje post', () => {
    for (const p of ALLA) {
      expect(p.sv.length).toBeGreaterThan(1)
      expect(p.lat.length).toBeGreaterThan(1)
      expect(p.kat.length).toBeGreaterThan(1)
    }
  })

  it('innehåller inga dubbletter', () => {
    const sedda = new Set(ALLA.map((p) => normalisera(p.sv)))
    expect(sedda.size).toBe(ALLA.length)
  })

  it('innehåller växterna hon faktiskt har', () => {
    for (const namn of ['Hortensia', 'Pion', 'Pelargon', 'Rabarber', 'Monstera', 'Lavendel']) {
      expect(sokVaxtnamn(ALLA, namn)[0]?.sv).toBe(namn)
    }
  })
})
