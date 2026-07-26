import { expect, test, type Page } from '@playwright/test'

async function skapaYta(page: Page, namn: string) {
  await page.goto('/ytor/ny')
  await page.getByLabel('Namn').fill(namn)
  await page.getByRole('button', { name: 'Spara' }).click()
  await expect(page.getByRole('heading', { name: namn })).toBeVisible()
}

async function skapaVaxt(page: Page, namn: string, ytaNamn: string) {
  await page.goto('/vaxter/ny')
  await page.getByLabel('Namn').fill(namn)
  await page.getByLabel('Yta').selectOption({ label: ytaNamn })
  await page.getByRole('button', { name: 'Spara' }).click()
  await expect(page.getByRole('heading', { name: namn })).toBeVisible()
}

test('vattna en växt på tre tryck från växtfliken', async ({ page }) => {
  await skapaYta(page, 'Rabatten')
  await skapaVaxt(page, 'Hortensia', 'Rabatten')

  // De tre trycken: fliken Växter → växten → Vattnat
  await page.goto('/')
  await page.getByRole('link', { name: 'Växter' }).first().click()
  await page.getByText('Hortensia').click()
  await page.getByRole('button', { name: 'Vattnat' }).click()

  await expect(page.getByRole('status')).toHaveText('Vattnat — antecknat.')
  const loggsektion = page.locator('section', { has: page.getByRole('heading', { name: 'Logg' }) })
  await expect(loggsektion.getByText('Vattnat', { exact: true })).toBeVisible()
})

test('nyskapad växt har en planterat-post i loggen', async ({ page }) => {
  await skapaYta(page, 'Pallkragen')
  await skapaVaxt(page, 'Dill', 'Pallkragen')

  await expect(page.getByText('Planterat', { exact: true })).toBeVisible()

  await page.goto('/logg')
  await expect(page.getByText('Planterat', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Dill' })).toBeVisible()
})

test('ångra tar bort loggposten', async ({ page }) => {
  await skapaYta(page, 'Köksfönstret')
  await skapaVaxt(page, 'Basilika', 'Köksfönstret')

  await page.getByRole('button', { name: 'Gödslat' }).click()
  await expect(page.getByRole('status')).toHaveText('Gödslat — antecknat.')
  await page.getByRole('button', { name: 'Ångra' }).click()

  await expect(page.getByText('Gödslat', { exact: true })).toHaveCount(1) // bara snabbknappen
  await page.goto('/logg')
  await expect(page.getByText('Gödslat', { exact: true })).toHaveCount(0)
})

test('anteckning på en yta hamnar i ytans och globala loggen', async ({ page }) => {
  await skapaYta(page, 'Bersån')

  await page.getByRole('button', { name: 'Skriv anteckning' }).click()
  await page.getByLabel('Anteckning').fill('Rensade ogräs runt rosorna.')
  await page.getByRole('button', { name: 'Spara anteckning' }).click()

  await expect(page.getByText('Rensade ogräs runt rosorna.')).toBeVisible()

  await page.goto('/logg')
  await expect(page.getByText('Rensade ogräs runt rosorna.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Bersån' })).toBeVisible()
})

test('ytans logg visar växternas poster med länk', async ({ page }) => {
  await skapaYta(page, 'Trappan')
  await skapaVaxt(page, 'Funkia', 'Trappan')
  await page.getByRole('button', { name: 'Vattnat' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.goto('/ytor')
  await page.getByText('Trappan').click()
  const loggsektion = page.locator('section', { has: page.getByRole('heading', { name: 'Logg' }) })
  await expect(loggsektion.getByText('Vattnat', { exact: true })).toBeVisible()
  await expect(loggsektion.getByRole('link', { name: 'Funkia' }).first()).toBeVisible()
})

const TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('foto via snabbloggen blir en daterad post i fototidslinjen', async ({ page }) => {
  await skapaYta(page, 'Rabatten vid staketet')

  await page.getByLabel('Välj loggfoto').setInputFiles({
    name: 'april.png',
    mimeType: 'image/png',
    buffer: TEST_PNG,
  })
  await expect(page.getByRole('status')).toHaveText('Anteckning — antecknat.')

  const loggsektion = page.locator('section', { has: page.getByRole('heading', { name: 'Logg' }) })
  await expect(loggsektion.locator('img[src^="blob:"]')).toBeVisible()

  await page.getByRole('link', { name: 'Logg' }).first().click()
  await expect(page.locator('img[src^="blob:"]')).toBeVisible()
})

test('foto på växtdetaljen loggas också i tidslinjen', async ({ page }) => {
  await skapaYta(page, 'Pallkragen')
  await skapaVaxt(page, 'Salvia', 'Pallkragen')

  await page.getByLabel('Välj foto').setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: TEST_PNG,
  })
  const loggsektion = page.locator('section', { has: page.getByRole('heading', { name: 'Logg' }) })
  await expect(loggsektion.locator('img[src^="blob:"]')).toBeVisible()
})

test('borttagen växt försvinner ur loggen', async ({ page }) => {
  await skapaYta(page, 'Uterummet')
  await skapaVaxt(page, 'Rosmarin', 'Uterummet')
  await page.getByRole('button', { name: 'Vattnat' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.getByRole('button', { name: 'Ta bort växten' }).click()
  await page.getByRole('button', { name: 'Tryck igen för att ta bort' }).click()
  await expect(page).toHaveURL(/\/vaxter$/)

  // SPA-navigering (ingen omladdning) så att raderingarna hinner persisteras
  await page.getByRole('link', { name: 'Logg' }).first().click()
  await expect(page.getByText('Inget loggat än', { exact: false })).toBeVisible()
})
