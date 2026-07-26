import { describe, expect, it } from 'vitest'
import type { MapObject } from './types'
import { franLagratObjekt, tillLagratObjekt } from './kartkonvertering'

const objekt: MapObject = {
  id: 'abc',
  type: 'rabatt',
  name: 'Rabatten',
  points: [
    [1.2, 3.4],
    [5, 6],
    [2, 8.1],
  ],
  note: 'vid staketet',
}

describe('kartkonvertering', () => {
  it('lagrar punkter som {x,y} — Firestore stödjer inte nästlade arrayer', () => {
    const lagrat = tillLagratObjekt(objekt)
    expect(lagrat.points).toEqual([
      { x: 1.2, y: 3.4 },
      { x: 5, y: 6 },
      { x: 2, y: 8.1 },
    ])
  })

  it('utelämnar undefined-fält (Firestore tillåter inte undefined)', () => {
    const { note: _note, ...utanNote } = objekt
    expect('note' in tillLagratObjekt(utanNote)).toBe(false)
  })

  it('rundresa ger tillbaka samma objekt', () => {
    expect(franLagratObjekt(tillLagratObjekt(objekt))).toEqual(objekt)
  })

  it('tål trasig data', () => {
    expect(franLagratObjekt(null).points).toEqual([])
    expect(franLagratObjekt({ points: 'fel' }).type).toBe('annat')
  })

  it('faller tillbaka på "annat" för okända typsträngar', () => {
    expect(franLagratObjekt({ type: 'gazebo', points: [] }).type).toBe('annat')
    expect(franLagratObjekt({ type: 'rabatt', points: [] }).type).toBe('rabatt')
  })
})
