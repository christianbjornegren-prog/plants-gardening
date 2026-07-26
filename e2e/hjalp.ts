import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Page } from '@playwright/test'

/** Delade steg för e2e. Allt går genom UI:t — inga genvägar in i datalagret. */

let bildKatalog: string | undefined

/**
 * Riktiga JPEG-filer, renderade i webbläsaren. Fotovägen komprimerar med
 * createImageBitmap och kräver en giltig bild — en fejkad buffer duger inte.
 */
export async function gorBild(page: Page, namn: string, ton = '#5d7a4a'): Promise<string> {
  bildKatalog ??= await mkdtemp(join(tmpdir(), 'ripvagen-'))
  const data = await page.evaluate((t) => {
    const c = document.createElement('canvas')
    c.width = 640
    c.height = 480
    const g = c.getContext('2d')!
    g.fillStyle = t
    g.fillRect(0, 0, 640, 480)
    g.fillStyle = 'rgba(255,255,255,0.25)'
    g.fillRect(40, 40, 200, 140)
    return c.toDataURL('image/jpeg', 0.85)
  }, ton)
  const fil = join(bildKatalog, `${namn}.jpg`)
  await writeFile(fil, Buffer.from(data.split(',')[1]!, 'base64'))
  return fil
}

/**
 * Kvittensen ligger kvar i sex sekunder och kan täcka innehåll längst ner.
 * Vänta ut den innan man rör vid sidfoten — precis som en människa gör.
 */
export async function vantaPaTystKvittens(page: Page): Promise<void> {
  await page.getByRole('status').first().waitFor({ state: 'detached', timeout: 9000 })
}

/** Flöde A: + → kamera → namn → Klart. Landar på växtkortet. */
export async function nyVaxt(page: Page, namn: string, bild?: string): Promise<void> {
  await page.getByRole('button', { name: 'Ny växt' }).first().click()
  if (bild) {
    await page.getByTestId('ny-vaxt-kamera').setInputFiles(bild)
    await page.getByRole('img', { name: 'Den nya växten' }).waitFor()
  }
  await page.getByRole('textbox', { name: 'Växtens namn' }).fill(namn)
  await page.getByRole('button', { name: 'Klart' }).click()
  await page.waitForURL(/\/vaxter\/[^/]+$/)
  await page.getByRole('heading', { name: namn }).waitFor()
}

/**
 * Navigera som en människa gör — via appens egna länkar.
 *
 * En `page.goto` direkt efter en skrivning kan riva sidan innan Firestore
 * hunnit persistera till IndexedDB; i lokalt läge finns ingen server som
 * ackar, så skrivningen är helt enkelt borta. SPA-navigering river inte
 * sidan och undviker hela klassen. Se docs/ARKITEKTUR.md.
 */
export async function gaTill(
  page: Page,
  flik: 'Hem' | 'Ritningen' | 'Växter' | 'Logg',
): Promise<void> {
  await page.getByRole('link', { name: flik }).first().click()
}

/** Sätter trädgårdens mått, vilket skapar dess ritning. */
export async function angeMatt(page: Page, tradgard: string, bredd: string, djup: string) {
  // Finns skalet redan? Gå via länken; annars är detta testets första steg.
  if (await page.getByRole('link', { name: 'Ritningen' }).count()) {
    await gaTill(page, 'Ritningen')
  } else {
    await page.goto('/ritning')
  }
  await page.getByRole('button', { name: tradgard, exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`^Rita ${tradgard}`) }).click()
  await page.getByRole('textbox', { name: 'Bredd (m)' }).fill(bredd)
  await page.getByRole('textbox', { name: 'Djup (m)' }).fill(djup)
  await page.getByRole('button', { name: 'Skapa ritningen' }).click()
  await page.getByTestId('tomtgrans').waitFor()
}

/** Ritar en polygon i ritläget. Hörnen anges som andelar av ritytan. */
export async function ritaPlats(
  page: Page,
  horn: [number, number][],
  namn: string,
  typ = 'Rabatt',
) {
  await page.getByRole('button', { name: 'Rita ny plats' }).click()
  const box = (await page.locator('[data-testid="ritredigering"]').boundingBox())!
  const punkt = ([fx, fy]: [number, number]) => ({
    x: box.x + fx * box.width,
    y: box.y + fy * box.height,
  })
  for (const h of horn) {
    const p = punkt(h)
    await page.mouse.click(p.x, p.y)
  }
  const sista = punkt(horn[horn.length - 1]!)
  await page.mouse.dblclick(sista.x, sista.y)
  await page.getByRole('button', { name: typ, exact: true }).waitFor()
  await page.getByRole('button', { name: typ, exact: true }).click()
  const namnfalt = page.getByRole('textbox', { name: 'Namn' })
  await namnfalt.fill(namn)
  await namnfalt.blur()
}

/** Tryck i ritningen på en andel av ytan. */
export async function tryckIRitningen(page: Page, fx: number, fy: number) {
  const box = (await page.locator('[data-testid="ritning"]').boundingBox())!
  await page.mouse.click(box.x + fx * box.width, box.y + fy * box.height)
}
