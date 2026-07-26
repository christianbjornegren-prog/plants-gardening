import { describe, expect, it } from 'vitest'
import { nyttPlatsNamn } from './ritstil'

/**
 * Regression: namnet räknade förut hur många former som fanns, så numret
 * återanvändes så fort man tagit bort en. Rita–radera–rita gav flera former
 * som alla hette "Rabatt 2".
 */
describe('nyttPlatsNamn', () => {
  it('börjar på 1 i en tom trädgård', () => {
    expect(nyttPlatsNamn([], 'Rabatt')).toBe('Rabatt 1')
  })

  it('tar nästa lediga nummer', () => {
    expect(nyttPlatsNamn(['Rabatt 1'], 'Rabatt')).toBe('Rabatt 2')
  })

  it('krockar INTE efter en borttagning', () => {
    // "Rabatt 1" är borttagen; 2 är upptaget och får inte återanvändas.
    expect(nyttPlatsNamn(['Rabatt 2'], 'Rabatt')).toBe('Rabatt 1')
    expect(nyttPlatsNamn(['Rabatt 2', 'Rabatt 1'], 'Rabatt')).toBe('Rabatt 3')
  })

  it('bryr sig inte om versaler eller mellanslag', () => {
    expect(nyttPlatsNamn(['  rabatt 1 ', 'RABATT 2'], 'Rabatt')).toBe('Rabatt 3')
  })

  it('räknar per typ, inte över alla former', () => {
    expect(nyttPlatsNamn(['Rabatt 1', 'Gräsmatta 1'], 'Gräsmatta')).toBe('Gräsmatta 2')
  })

  it('hoppar över egna namn utan att fastna', () => {
    expect(nyttPlatsNamn(['Rabatten vid staketet', 'Rabatt 1'], 'Rabatt')).toBe('Rabatt 2')
  })
})
