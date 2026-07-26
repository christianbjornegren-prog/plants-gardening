import { describe, expect, it } from 'vitest'
import { PLATSTYPER, ALLA_PLATSTYPER } from '../data/types'
import { platsEtikett, platstypEtikett } from './etiketter'

describe('platstyper', () => {
  it('erbjuder inte häck längre', () => {
    expect(PLATSTYPER).not.toContain('häck')
  })

  it('men häck är fortfarande giltig data så gamla former behåller sin stil', () => {
    expect(ALLA_PLATSTYPER).toContain('häck')
    expect(platstypEtikett('häck')).toBe('Häck')
  })

  it('erbjuder annat som uppsamling', () => {
    expect(PLATSTYPER).toContain('annat')
  })
})

describe('platsEtikett', () => {
  it('visar standardtypen när inget eget namn finns', () => {
    expect(platsEtikett({ typ: 'rabatt' })).toBe('Rabatt')
  })

  it('låter eget namn vinna', () => {
    expect(platsEtikett({ typ: 'annat', egenTyp: 'Stenparti' })).toBe('Stenparti')
  })

  it('faller tillbaka när det egna namnet bara är blanktecken', () => {
    expect(platsEtikett({ typ: 'annat', egenTyp: '   ' })).toBe('Annat')
  })
})
