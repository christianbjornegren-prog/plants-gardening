import { describe, expect, it } from 'vitest'
import type { Handelse, HandelseTyp, Vaxt } from '../data/types'
import {
  fototidslinje,
  handelserForPlats,
  handelserForVaxt,
  handelserSedan,
  ofotograferade,
  senastaFotot,
  senasteFotoPerVaxt,
} from './handelser'

const NU = new Date('2026-07-26T12:00:00.000Z')

function h(
  id: string,
  typ: HandelseTyp,
  datum: string,
  extra: Partial<Handelse> = {},
): Handelse {
  return { id, typ, datum, ...extra }
}

function v(id: string, namn: string, extra: Partial<Vaxt> = {}): Vaxt {
  return { id, namn, status: 'finns', ...extra }
}

/** Nyaste först, som listorna kommer in från repot. */
const HANDELSER: Handelse[] = [
  h('h6', 'foto', '2026-07-20T00:00:00.000Z', { vaxtId: 'hortensia', fotoRef: 'f-juli' }),
  h('h5', 'vattnat', '2026-07-18T00:00:00.000Z', { vaxtId: 'basilika' }),
  h('h4', 'foto', '2026-06-10T00:00:00.000Z', { platsId: 'rabatten', fotoRef: 'f-plats' }),
  h('h3', 'foto', '2026-05-02T00:00:00.000Z', { vaxtId: 'hortensia', fotoRef: 'f-maj' }),
  h('h2', 'beskuret', '2026-04-11T00:00:00.000Z', { vaxtId: 'hortensia' }),
  h('h1', 'foto', '2026-04-05T00:00:00.000Z', { vaxtId: 'basilika', fotoRef: 'f-bas' }),
  h('h0', 'foto', '2026-04-01T00:00:00.000Z', { vaxtId: 'hortensia', fotoRef: 'f-april' }),
]

const VAXTER: Vaxt[] = [
  v('hortensia', 'Hortensian', { platsId: 'rabatten' }),
  v('basilika', 'Basilikan', { platsId: 'koksfonstret' }),
  v('aldrig', 'Nyköpta pionen', { platsId: 'rabatten' }),
  v('planerad', 'Magnolian', { status: 'planerad' }),
]

describe('urval', () => {
  it('handelserForVaxt tar bara växtens egna poster', () => {
    expect(handelserForVaxt(HANDELSER, 'hortensia').map((x) => x.id)).toEqual([
      'h6',
      'h3',
      'h2',
      'h0',
    ])
  })

  it('handelserForPlats tar platsens egna OCH växternas som står där nu', () => {
    const ids = handelserForPlats(HANDELSER, VAXTER, 'rabatten').map((x) => x.id)
    expect(ids).toContain('h4') // platsens egen
    expect(ids).toContain('h6') // hortensians, står där nu
    expect(ids).not.toContain('h5') // basilikan står i köksfönstret
  })

  it('handelserForPlats följer växten vid flytt — historiken bor hos växten', () => {
    const flyttad = VAXTER.map((x) =>
      x.id === 'hortensia' ? { ...x, platsId: 'koksfonstret' } : x,
    )
    const ids = handelserForPlats(HANDELSER, flyttad, 'rabatten').map((x) => x.id)
    expect(ids).toEqual(['h4'])
  })
})

describe('fototidslinje', () => {
  it('sorterar ÄLDST FÖRST — april före juli är hela poängen', () => {
    const foton = fototidslinje(handelserForVaxt(HANDELSER, 'hortensia'))
    expect(foton.map((f) => f.fotoRef)).toEqual(['f-april', 'f-maj', 'f-juli'])
  })

  it('tar bara med poster som faktiskt har en bild', () => {
    const foton = fototidslinje(handelserForVaxt(HANDELSER, 'hortensia'))
    expect(foton.every((f) => f.fotoRef)).toBe(true)
    expect(foton.map((f) => f.id)).not.toContain('h2')
  })

  it('senastaFotot ger hjältebilden till Hem', () => {
    expect(senastaFotot(HANDELSER)?.fotoRef).toBe('f-juli')
  })

  it('senasteFotoPerVaxt ger den SENASTE bilden, inte den första', () => {
    expect(senasteFotoPerVaxt(HANDELSER).get('hortensia')).toBe('f-juli')
  })
})

describe('handelserSedan', () => {
  it('tar med det som ligger inom fönstret', () => {
    expect(handelserSedan(HANDELSER, 7, NU).map((x) => x.id)).toEqual(['h6'])
    expect(handelserSedan(HANDELSER, 10, NU).map((x) => x.id)).toEqual(['h6', 'h5'])
  })

  it('ett tomt fönster ger tom lista, inte allt', () => {
    expect(handelserSedan(HANDELSER, 0, NU)).toEqual([])
  })
})

describe('ofotograferade', () => {
  const rader = ofotograferade(VAXTER, HANDELSER, 30, NU)

  it('sätter aldrig fotade först — en växt utan bild saknas mest', () => {
    expect(rader[0]?.vaxt.id).toBe('aldrig')
    expect(rader[0]?.dagarSedan).toBeUndefined()
  })

  it('räknar planerade växter som icke-existerande', () => {
    expect(rader.map((r) => r.vaxt.id)).not.toContain('planerad')
  })

  it('utesluter växter som fotats nyligen', () => {
    expect(rader.map((r) => r.vaxt.id)).not.toContain('hortensia')
  })

  it('tar med den som passerat gränsen, med rätt antal dagar', () => {
    // Fotad 5 april, "nu" är 26 juli → 112 dygn.
    expect(rader.find((r) => r.vaxt.id === 'basilika')?.dagarSedan).toBe(112)
  })

  it('sorterar mest försummad först bland de fotade', () => {
    const medDatum = ofotograferade(
      [v('a', 'A'), v('b', 'B')],
      [
        h('x', 'foto', '2026-01-01T00:00:00.000Z', { vaxtId: 'a', fotoRef: 'fa' }),
        h('y', 'foto', '2026-06-01T00:00:00.000Z', { vaxtId: 'b', fotoRef: 'fb' }),
      ],
      30,
      NU,
    )
    expect(medDatum.map((r) => r.vaxt.id)).toEqual(['a', 'b'])
  })
})
