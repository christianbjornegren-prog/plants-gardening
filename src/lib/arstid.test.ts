import { describe, expect, it } from 'vitest'
import { arstidFor, arstidston } from './arstid'

describe('arstidFor', () => {
  it('kartlägger månader till årstider enligt designspecen', () => {
    expect(arstidFor(new Date(2026, 3, 15))).toBe('var') // april
    expect(arstidFor(new Date(2026, 4, 1))).toBe('var') // maj
    expect(arstidFor(new Date(2026, 5, 1))).toBe('sommar') // juni
    expect(arstidFor(new Date(2026, 7, 31))).toBe('sommar') // augusti
    expect(arstidFor(new Date(2026, 8, 1))).toBe('host') // september
    expect(arstidFor(new Date(2026, 9, 20))).toBe('host') // oktober
    expect(arstidFor(new Date(2026, 10, 1))).toBe('vinter') // november
    expect(arstidFor(new Date(2026, 1, 10))).toBe('vinter') // februari
  })
})

describe('arstidston', () => {
  it('ger ett CSS-filter för varje årstid', () => {
    expect(arstidston(new Date(2026, 6, 26))).toContain('saturate')
    expect(arstidston(new Date(2026, 0, 1))).toContain('saturate(0.6')
  })
})
