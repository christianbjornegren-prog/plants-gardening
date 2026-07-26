import { describe, expect, it } from 'vitest'
import type { LogEntry, Plant } from '../data/types'
import { loggForVaxt, loggForYta } from './logg'

function post(delar: Partial<LogEntry> & { id: string }): LogEntry {
  return { type: 'vattnat', date: '2026-07-01T10:00:00.000Z', ...delar }
}

function vaxt(id: string, areaId: string): Plant {
  return { id, name: id, areaId, photoRefs: [], moveHistory: [] }
}

const logg: LogEntry[] = [
  post({ id: 'a', plantId: 'hortensia' }),
  post({ id: 'b', areaId: 'rabatten' }),
  post({ id: 'c', plantId: 'lavendel' }),
  post({ id: 'd', areaId: 'pallkragen' }),
]

const vaxter = [vaxt('hortensia', 'rabatten'), vaxt('lavendel', 'pallkragen')]

describe('loggForVaxt', () => {
  it('tar bara med poster loggade på växten', () => {
    expect(loggForVaxt(logg, 'hortensia').map((p) => p.id)).toEqual(['a'])
  })
})

describe('loggForYta', () => {
  it('tar med ytans poster och poster för växter som står där nu', () => {
    expect(loggForYta(logg, vaxter, 'rabatten').map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('följer växten när den flyttar', () => {
    const flyttade = [vaxt('hortensia', 'pallkragen'), vaxt('lavendel', 'pallkragen')]
    expect(loggForYta(flyttade.length ? logg : logg, flyttade, 'rabatten').map((p) => p.id)).toEqual(
      ['b'],
    )
    expect(loggForYta(logg, flyttade, 'pallkragen').map((p) => p.id)).toEqual(['a', 'c', 'd'])
  })
})
