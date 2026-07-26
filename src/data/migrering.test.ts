import { describe, expect, it } from 'vitest'
import {
  migreraV1TillV2,
  TRADGARD_BAKSIDAN,
  TRADGARD_INOMHUS,
  type V1Data,
} from './migrering'

const NU = '2026-07-26T12:00:00.000Z'

/** Datamängd som täcker alla vägar i migreringen. */
function fixtur(): V1Data {
  return {
    karta: {
      widthM: 18,
      heightM: 11.5,
      objects: [
        { id: 'obj-rabatt', type: 'rabatt', name: 'Rabatt 1', points: [[1, 1], [4, 1], [4, 3]] },
        { id: 'obj-bod', type: 'bod', name: 'Boden', points: [[10, 1], [13, 1], [13, 4], [10, 4]] },
        { id: 'obj-udda', type: 'rymdskepp', name: '', points: [[0, 0], [1, 0], [1, 1]] },
      ],
    },
    areas: [
      {
        id: 'yta-1',
        name: 'Rabatten vid staketet',
        mapObjectId: 'obj-rabatt',
        sunExposure: 'halvskugga',
        soil: 'Lerjord',
        note: 'Torkar snabbt',
      },
      { id: 'yta-kok', name: 'Köksfönstret', sunExposure: 'sol' },
      { id: 'yta-spoke', name: 'Borttappad', mapObjectId: 'finns-inte' },
    ],
    plants: [
      {
        id: 'v-hortensia',
        name: 'Hortensian',
        areaId: 'yta-1',
        position: { x: 2, y: 2 },
        photoRefs: ['lokal:a', 'lokal:b'],
        note: 'Annabelle',
        moveHistory: [{ fromAreaId: 'yta-kok', toAreaId: 'yta-1', date: '2026-05-04T08:00:00.000Z' }],
      },
      { id: 'v-basilika', name: 'Basilikan', areaId: 'yta-kok' },
      { id: 'v-vilse', name: 'Vilsen', areaId: 'yta-som-raderats' },
    ],
    logEntries: [
      { id: 'l-1', plantId: 'v-hortensia', type: 'planterat', date: '2026-04-01T08:00:00.000Z' },
      { id: 'l-2', plantId: 'v-hortensia', type: 'vattnat', date: '2026-06-10T08:00:00.000Z' },
      {
        id: 'l-3',
        areaId: 'yta-1',
        type: 'anteckning',
        date: '2026-06-12T08:00:00.000Z',
        note: 'Full blom',
        photoRef: 'lokal:c',
      },
      { id: 'l-4', plantId: 'v-hortensia', type: 'kärnfusion', date: '2026-06-13T08:00:00.000Z' },
    ],
  }
}

describe('migreraV1TillV2', () => {
  it('skapar de tre trädgårdarna och lägger tomtmåtten på Baksidan', () => {
    const v2 = migreraV1TillV2(fixtur(), NU)
    expect(v2.tradgardar.map((t) => t.namn)).toEqual(['Framsidan', 'Baksidan', 'Inomhus'])
    const baksidan = v2.tradgardar.find((t) => t.id === TRADGARD_BAKSIDAN)
    expect(baksidan).toMatchObject({ widthM: 18, heightM: 11.5 })
    // Inomhus har medvetet inga mått — då finns ingen ritning.
    expect(v2.tradgardar.find((t) => t.id === TRADGARD_INOMHUS)?.widthM).toBeUndefined()
  })

  it('gör varje kartobjekt till en plats med samma id', () => {
    const v2 = migreraV1TillV2(fixtur(), NU)
    const bod = v2.platser.find((p) => p.id === 'obj-bod')
    expect(bod).toMatchObject({ namn: 'Boden', typ: 'bod', tradgardId: TRADGARD_BAKSIDAN })
    expect(bod?.geometri?.punkter).toHaveLength(4)
  })

  it('smälter in ytan i platsen och låter ytans namn vinna', () => {
    const v2 = migreraV1TillV2(fixtur(), NU)
    const rabatt = v2.platser.find((p) => p.id === 'obj-rabatt')
    expect(rabatt).toMatchObject({
      namn: 'Rabatten vid staketet',
      typ: 'rabatt',
      sol: 'halvskugga',
      jord: 'Lerjord',
      anteckning: 'Torkar snabbt',
    })
    // Ingen dubblett: ytan blev INTE en egen plats.
    expect(v2.platser.filter((p) => p.namn === 'Rabatten vid staketet')).toHaveLength(1)
  })

  it('behåller ytor utan kartobjekt som platser utan geometri', () => {
    const v2 = migreraV1TillV2(fixtur(), NU)
    const kok = v2.platser.find((p) => p.id === 'yta-kok')
    expect(kok).toMatchObject({ namn: 'Köksfönstret', typ: 'annat', sol: 'sol' })
    expect(kok?.geometri).toBeUndefined()
  })

  it('tappar inte en yta vars mapObjectId pekar på ett raderat objekt', () => {
    const v2 = migreraV1TillV2(fixtur(), NU)
    expect(v2.platser.find((p) => p.id === 'yta-spoke')?.namn).toBe('Borttappad')
  })

  it('faller tillbaka på "annat" för okänd platstyp', () => {
    const v2 = migreraV1TillV2(fixtur(), NU)
    expect(v2.platser.find((p) => p.id === 'obj-udda')?.typ).toBe('annat')
  })

  it('kopplar växter till rätt plats och gör okända ytor till hemlöshet', () => {
    const v2 = migreraV1TillV2(fixtur(), NU)
    expect(v2.vaxter.find((v) => v.id === 'v-hortensia')).toMatchObject({
      namn: 'Hortensian',
      platsId: 'obj-rabatt',
      position: { x: 2, y: 2 },
      status: 'finns',
      anteckning: 'Annabelle',
    })
    expect(v2.vaxter.find((v) => v.id === 'v-basilika')?.platsId).toBe('yta-kok')
    // Ytan finns inte längre → hemlös, inte raderad.
    expect(v2.vaxter.find((v) => v.id === 'v-vilse')?.platsId).toBeUndefined()
  })

  it('gör photoRefs till daterade fotohändelser flaggade som osäkra', () => {
    const v2 = migreraV1TillV2(fixtur(), NU)
    const foton = v2.handelser.filter((h) => h.typ === 'foto' && h.vaxtId === 'v-hortensia')
    expect(foton).toHaveLength(2)
    for (const foto of foton) {
      // Äldsta loggposten för växten, inte "nu".
      expect(foto.datum).toBe('2026-04-01T08:00:00.000Z')
      expect(foto.datumOkant).toBe(true)
    }
    expect(foton.map((f) => f.fotoRef)).toEqual(['lokal:a', 'lokal:b'])
  })

  it('normaliserar loggpost med foto till typ foto men behåller anteckningen', () => {
    const v2 = migreraV1TillV2(fixtur(), NU)
    const post = v2.handelser.find((h) => h.id === 'l-3')
    expect(post).toMatchObject({
      typ: 'foto',
      platsId: 'obj-rabatt',
      fotoRef: 'lokal:c',
      anteckning: 'Full blom',
    })
    expect(post?.datumOkant).toBeUndefined()
  })

  it('gör moveHistory till flyttat-händelser med exakta datum', () => {
    const v2 = migreraV1TillV2(fixtur(), NU)
    const flytt = v2.handelser.find((h) => h.typ === 'flyttat')
    expect(flytt).toMatchObject({
      vaxtId: 'v-hortensia',
      datum: '2026-05-04T08:00:00.000Z',
      franPlatsId: 'yta-kok',
      tillPlatsId: 'obj-rabatt',
    })
  })

  it('faller tillbaka på anteckning för okänd händelsetyp', () => {
    const v2 = migreraV1TillV2(fixtur(), NU)
    expect(v2.handelser.find((h) => h.id === 'l-4')?.typ).toBe('anteckning')
  })

  it('sorterar händelser med nyaste först', () => {
    const datum = migreraV1TillV2(fixtur(), NU).handelser.map((h) => h.datum)
    expect([...datum].sort((a, b) => b.localeCompare(a))).toEqual(datum)
  })

  it('är idempotent: samma indata ger exakt samma utdata', () => {
    expect(migreraV1TillV2(fixtur(), NU)).toEqual(migreraV1TillV2(fixtur(), NU))
  })

  it('klarar en helt tom datamängd', () => {
    const v2 = migreraV1TillV2({ karta: null, areas: [], plants: [], logEntries: [] }, NU)
    expect(v2.tradgardar).toHaveLength(3)
    expect(v2.tradgardar.every((t) => t.widthM === undefined)).toBe(true)
    expect(v2.platser).toEqual([])
    expect(v2.vaxter).toEqual([])
    expect(v2.handelser).toEqual([])
  })
})
