import { describe, expect, it } from 'vitest'
import { formatDatum, formatMeter } from './format'

describe('formatMeter', () => {
  it('formaterar med decimalkomma och m', () => {
    expect(formatMeter(4.2)).toBe('4,2 m')
  })

  it('utelämnar onödiga decimaler', () => {
    expect(formatMeter(3)).toBe('3 m')
  })

  it('avrundar till en decimal (snap 0,1 m)', () => {
    expect(formatMeter(2.649999)).toBe('2,6 m')
  })
})

describe('formatDatum', () => {
  const idag = new Date(2026, 6, 26) // 26 juli 2026

  it('säger "i dag" om samma dag', () => {
    expect(formatDatum(new Date(2026, 6, 26, 14, 30), idag)).toBe('i dag')
  })

  it('säger "i går" om gårdagen', () => {
    expect(formatDatum(new Date(2026, 6, 25, 8, 0), idag)).toBe('i går')
  })

  it('visar dag och månad inom samma år', () => {
    expect(formatDatum(new Date(2026, 4, 14), idag)).toBe('14 maj')
  })

  it('visar år för andra år', () => {
    expect(formatDatum(new Date(2025, 4, 14), idag)).toBe('14 maj 2025')
  })

  it('hanterar årsskifte för "i går"', () => {
    const nyarsdag = new Date(2026, 0, 1)
    expect(formatDatum(new Date(2025, 11, 31), nyarsdag)).toBe('i går')
  })
})
