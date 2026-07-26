import { describe, expect, it } from 'vitest'
import { utanUndefined } from './rensa'

describe('utanUndefined', () => {
  it('tar bort undefined-fält', () => {
    expect(utanUndefined({ a: 1, b: undefined, c: 'x' })).toEqual({ a: 1, c: 'x' })
  })

  it('behåller null, tom sträng, 0 och false', () => {
    expect(utanUndefined({ a: null, b: '', c: 0, d: false })).toEqual({
      a: null,
      b: '',
      c: 0,
      d: false,
    })
  })

  it('behåller tomma arrayer', () => {
    expect(utanUndefined({ photoRefs: [] })).toEqual({ photoRefs: [] })
  })
})
