import { describe, expect, it } from 'vitest'
import type { Handelse, Plats, Tradgard, Vaxt } from '../data/types'
import { granskaIntegritet } from './integritet'

const TRADGARD: Tradgard = { id: 't1', namn: 'Baksidan', ordning: 1 }
const PLATS: Plats = { id: 'p1', tradgardId: 't1', namn: 'Rabatten', typ: 'rabatt', status: 'finns' }
const VAXT: Vaxt = { id: 'v1', namn: 'Hortensian', platsId: 'p1', status: 'finns' }
const HANDELSE: Handelse = { id: 'h1', typ: 'vattnat', datum: '2026-07-01T10:00:00Z', vaxtId: 'v1' }

const HELT = { tradgardar: [TRADGARD], platser: [PLATS], vaxter: [VAXT], handelser: [HANDELSE] }

describe('granskaIntegritet', () => {
  it('ett helt dataset har inga brott', () => {
    expect(granskaIntegritet(HELT)).toEqual([])
  })

  it('händelse utan existerande växt eller plats fångas', () => {
    const brott = granskaIntegritet({
      ...HELT,
      handelser: [{ ...HANDELSE, vaxtId: 'saknas', platsId: undefined }],
    })
    expect(brott).toHaveLength(1)
    expect(brott[0]!.invariant).toBe('handelse-utan-mal')
  })

  it('händelse räddas av att ETT av målen finns', () => {
    // Växten borta men platsen kvar — händelsen har fortfarande ett hem.
    expect(
      granskaIntegritet({
        ...HELT,
        handelser: [{ ...HANDELSE, vaxtId: 'saknas', platsId: 'p1' }],
      }),
    ).toEqual([])
  })

  it('växt mot saknad plats fångas', () => {
    const brott = granskaIntegritet({ ...HELT, vaxter: [{ ...VAXT, platsId: 'spöke' }] })
    expect(brott).toHaveLength(1)
    expect(brott[0]!.invariant).toBe('vaxt-mot-saknad-plats')
  })

  it('hemlös växt är helt i sin ordning', () => {
    expect(granskaIntegritet({ ...HELT, vaxter: [{ ...VAXT, platsId: undefined }] })).toEqual([])
  })

  it('plats mot saknad trädgård fångas', () => {
    const brott = granskaIntegritet({ ...HELT, platser: [{ ...PLATS, tradgardId: 'borta' }] })
    // Platsens brott — händelsen h1 pekar fortfarande på v1 som finns.
    expect(brott).toHaveLength(1)
    expect(brott[0]!.invariant).toBe('plats-mot-saknad-tradgard')
  })

  it('skuggkälla mot saknad trädgård fångas', () => {
    const brott = granskaIntegritet({
      ...HELT,
      skuggkallor: [{ id: 's1', tradgardId: 'borta', namn: 'Grannhuset', punkter: [], hojdM: 6 }],
    })
    expect(brott).toHaveLength(1)
    expect(brott[0]!.invariant).toBe('skuggkalla-mot-saknad-tradgard')
  })
})
