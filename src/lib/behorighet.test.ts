import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { arBehorig, TILLATNA_EPOSTER } from './behorighet'

const las = (fil: string) => readFileSync(resolve(process.cwd(), fil), 'utf8')
const REGELFILER = ['firestore.rules', 'storage.rules'] as const

describe('behörighetslistan speglas i säkerhetsreglerna', () => {
  it.each(REGELFILER)('%s innehåller exakt samma adresser', (fil) => {
    const regler = las(fil)
    const iRegler = [...regler.matchAll(/'([^']+@[^']+)'/g)].map((m) => m[1] as string).sort()
    expect(iRegler).toEqual([...TILLATNA_EPOSTER].sort())
  })

  it.each(REGELFILER)('%s kräver verifierad e-post', (fil) => {
    // Utan det kan vem som helst registrera ett lösenordskonto på en av
    // adresserna och komma in.
    expect(las(fil)).toContain('email_verified == true')
  })

  it.each(REGELFILER)('%s håller kvar isoleringen per uid', (fil) => {
    expect(las(fil)).toContain('request.auth.uid == uid')
  })

  it.each(REGELFILER)('%s stänger allt utanför users/', (fil) => {
    expect(las(fil)).toMatch(/allow read, write: if false;/)
  })
})

describe('arBehorig', () => {
  it('släpper in de två adresserna', () => {
    for (const epost of TILLATNA_EPOSTER) expect(arBehorig(epost)).toBe(true)
  })

  it('bryr sig inte om versaler eller mellanslag', () => {
    expect(arBehorig('  Christian.Bjornegren@Gmail.com ')).toBe(true)
  })

  it('nekar alla andra', () => {
    expect(arBehorig('nagon.annan@gmail.com')).toBe(false)
    expect(arBehorig('christian.bjornegren@gmail.com.evil.example')).toBe(false)
    expect(arBehorig('')).toBe(false)
    expect(arBehorig(null)).toBe(false)
    expect(arBehorig(undefined)).toBe(false)
  })

  it('nekar overifierad e-post även på en tillåten adress', () => {
    expect(arBehorig('christian.bjornegren@gmail.com', false)).toBe(false)
  })
})
