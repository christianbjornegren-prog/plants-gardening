import { expect, test } from '@playwright/test'
import {
  angeMatt,
  gaTill,
  gorBild,
  nyVaxt,
  oppnaFlerDetaljer,
  oppnaRitlage,
  ritaPlats,
  tryckIYta,
} from './hjalp'

/**
 * Regressioner från dataintegritetsgenomgången: det appen lovar att den
 * inte tappar ska den bevisligen inte tappa.
 */

const RUTA: [number, number][] = [
  [0.2, 0.25],
  [0.55, 0.25],
  [0.55, 0.7],
  [0.2, 0.7],
]

/** Väntar tills platsväljar-arket är helt stängt — annars fladdrar nästa klick. */
async function vantaPaStangtArk(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading', { name: 'Var står den?' })).toBeHidden()
}

test.describe('ångra i ritläget tappar ingenting', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'ritläget är desktop-först')

  test('ångrad platsradering återställer platsens historik och foto', async ({ page }) => {
    await page.goto('/')
    const bild = await gorBild(page, 'rabatten', '#5d7a4a')
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')
    await page.getByRole('button', { name: 'Klar' }).click()

    // Ge platsen egen historik: ett foto och ett vattnat, direkt på platskortet.
    await page.locator('[data-plats-id]').first().click()
    await page.getByRole('link', { name: 'Öppna platsen' }).click()
    await page.getByRole('button', { name: /^Foto/ }).click()
    await page.getByTestId('handelse-kamera').setInputFiles(bild)
    await expect(page.getByRole('status').first()).toContainText('Foto sparat')
    await page.getByRole('button', { name: /^Vattnat/ }).click()
    await expect(page.getByTestId('tidslinje').getByText('Vattnat')).toBeVisible()

    // Radera platsen i ritläget — och ångra direkt.
    await gaTill(page, 'Ritningen')
    await oppnaRitlage(page)
    await page.locator('[data-plats-id]').first().click()
    await oppnaFlerDetaljer(page)
    await page.getByRole('button', { name: 'Ta bort platsen' }).click()
    await page.getByRole('button', { name: 'Tryck igen för att ta bort' }).click()
    await expect(page.locator('[data-plats-id]')).toHaveCount(0)
    // Kvittenser bär egna Ångra-knappar — sikta på verktygsradens via titeln.
    await page.getByTitle('Ångra ta bort platsen').click()
    await expect(page.locator('[data-plats-id]')).toHaveCount(1)

    // "Går att ångra" ska gälla ALLT: historiken och fotot är tillbaka.
    await page.getByRole('link', { name: 'Tillbaka till ritningen' }).click()
    await page.getByTestId('tomtgrans').waitFor()
    await page.locator('[data-plats-id]').first().click()
    await page.getByRole('link', { name: 'Öppna platsen' }).click()
    await expect(page.getByTestId('tidslinje').getByText('Vattnat')).toBeVisible()
    await expect(page.getByTestId('tidslinje').getByText('Foto')).toBeVisible()
    await expect(page.getByTestId('tidslinje').getByRole('img').first()).toBeVisible()
  })

  test('en ångrad placering lämnar ingen flyttat-post i loggen', async ({ page }) => {
    await page.goto('/')
    await nyVaxt(page, 'Hortensian')

    // Första platsen är formlös (skapad i väljaren) — då får växten ingen
    // prick och kan armeras i ritläget. Första valet loggas inte som flytt.
    await page.getByRole('button', { name: 'Välj plats' }).click()
    await page.getByRole('button', { name: /Ny plats/ }).first().click()
    await page.getByRole('textbox', { name: /Namn på ny plats/ }).fill('Fönsterbrädan')
    await page.getByRole('button', { name: 'Spara' }).click()
    await vantaPaStangtArk(page)

    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA)

    // Flytten in i rabatten är en riktig flytt — den loggas, med ångra.
    await page.getByRole('button', { name: 'Hortensian' }).click()
    await tryckIYta(page, 'ritredigering', 0.35, 0.45)
    await expect(page.locator('[data-vaxt-id]')).toHaveCount(1)

    await page.getByTitle('Ångra placera Hortensian').click()
    await expect(page.locator('[data-vaxt-id]')).toHaveCount(0)
    await gaTill(page, 'Logg')
    await expect(page.getByTestId('tidslinje').getByText('Flyttat')).toHaveCount(0)
  })
})

test('två snabba tryck på Klart ger EN växt, inte två med delat foto', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ny växt' }).first().click()
  await page.getByRole('textbox', { name: 'Växtens namn' }).fill('Dubbletten')
  await page.getByRole('button', { name: 'Klart' }).dblclick()
  await expect(page.getByRole('heading', { name: 'Dubbletten' })).toBeVisible()

  await gaTill(page, 'Växter')
  await expect(page.getByText('1 växt', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Dubbletten' })).toHaveCount(1)
})

test('två snabba tryck i platsväljaren ger EN flytt i loggen', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Pionen')

  // En nyskapad plats väljs automatiskt. Första valet är ingen flytt;
  // bytet till Balkongen är flytt nummer ett.
  await page.getByRole('button', { name: 'Välj plats' }).click()
  await page.getByRole('button', { name: /Ny plats/ }).first().click()
  await page.getByRole('textbox', { name: /Namn på ny plats/ }).fill('Fönsterbrädan')
  await page.getByRole('button', { name: 'Spara' }).click()
  await vantaPaStangtArk(page)

  await page.locator('main').getByRole('button', { name: 'Fönsterbrädan' }).click()
  await page.getByRole('button', { name: /Ny plats/ }).first().click()
  await page.getByRole('textbox', { name: /Namn på ny plats/ }).fill('Balkongen')
  await page.getByRole('button', { name: 'Spara' }).click()
  await vantaPaStangtArk(page)

  // Dubbeltryck på målet: förr blev det TVÅ flyttat-poster av bytet tillbaka.
  await page.locator('main').getByRole('button', { name: 'Balkongen' }).click()
  await page
    .getByRole('button', { name: 'Fönsterbrädan', exact: true })
    .dblclick()
  await vantaPaStangtArk(page)

  await gaTill(page, 'Logg')
  await expect(page.getByTestId('tidslinje').getByText('Flyttat')).toHaveCount(2)
})
