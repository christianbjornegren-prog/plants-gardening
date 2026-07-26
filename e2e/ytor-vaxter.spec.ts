import { expect, test, type Page } from '@playwright/test'

/** 1×1 röd PNG — räcker för komprimerings- och visningsflödet. */
const TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

async function skapaYta(page: Page, namn: string) {
  await page.goto('/ytor')
  await page
    .getByRole('link', { name: /Ny yta|Lägg till den första/ })
    .first()
    .click()
  await page.getByLabel('Namn').fill(namn)
  await page.getByRole('button', { name: 'Spara' }).click()
  await expect(page.getByRole('heading', { name: namn })).toBeVisible()
}

async function skapaVaxt(page: Page, namn: string, ytaNamn: string) {
  await page.goto('/vaxter')
  await page
    .getByRole('link', { name: /Ny växt|Lägg till den första/ })
    .first()
    .click()
  await page.getByLabel('Namn').fill(namn)
  await page.getByLabel('Yta').selectOption({ label: ytaNamn })
  await page.getByRole('button', { name: 'Spara' }).click()
  await expect(page.getByRole('heading', { name: namn })).toBeVisible()
}

test('skapa yta med solläge och jordmån', async ({ page }) => {
  await page.goto('/ytor')
  await page.getByRole('link', { name: 'Lägg till den första' }).click()
  await page.getByLabel('Namn').fill('Rabatten vid staketet')
  await page.getByRole('button', { name: 'Sol', exact: true }).click()
  await page.getByLabel('Jordmån').fill('Lerig')
  await page.getByRole('button', { name: 'Spara' }).click()

  await expect(page.getByRole('heading', { name: 'Rabatten vid staketet' })).toBeVisible()
  await expect(page.getByText('Sol · Lerig')).toBeVisible()

  await page.getByRole('link', { name: 'Tillbaka' }).click()
  await expect(page.getByText('Rabatten vid staketet')).toBeVisible()
  await expect(page.getByText('Sol · Lerig · 0 växter')).toBeVisible()
})

test('data finns kvar efter omladdning (offline-cache)', async ({ page }) => {
  await skapaYta(page, 'Pallkragen')
  await page.reload()
  await page.goto('/ytor')
  await expect(page.getByText('Pallkragen')).toBeVisible()
})

test('skapa växt i en yta och se den i listor', async ({ page }) => {
  await skapaYta(page, 'Altanen')
  await skapaVaxt(page, 'Hortensia', 'Altanen')

  await expect(page.getByText('Står i:')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Altanen' })).toBeVisible()

  await page.goto('/vaxter')
  await expect(page.getByText('Hortensia')).toBeVisible()
  await expect(page.getByText('Altanen')).toBeVisible()

  await page.goto('/ytor')
  await page.getByText('Altanen').click()
  await expect(page.getByRole('heading', { name: 'Växter här' })).toBeVisible()
  await expect(page.getByText('Hortensia')).toBeVisible()
})

test('ändra växtens namn och anteckning', async ({ page }) => {
  await skapaYta(page, 'Köksfönstret')
  await skapaVaxt(page, 'Basilika', 'Köksfönstret')

  await page.getByRole('link', { name: 'Ändra' }).click()
  await page.getByLabel('Namn').fill('Citronbasilika')
  await page.getByLabel('Anteckning').fill('Köpt på torget i juni.')
  await page.getByRole('button', { name: 'Spara' }).click()

  await expect(page.getByRole('heading', { name: 'Citronbasilika' })).toBeVisible()
  await expect(page.getByText('Köpt på torget i juni.')).toBeVisible()
})

test('flytt till annan yta hamnar i flytthistoriken', async ({ page }) => {
  await skapaYta(page, 'Rabatten')
  await skapaYta(page, 'Uterummet')
  await skapaVaxt(page, 'Rosmarin', 'Rabatten')

  await page.getByRole('link', { name: 'Ändra' }).click()
  await page.getByLabel('Yta').selectOption({ label: 'Uterummet' })
  await page.getByRole('button', { name: 'Spara' }).click()

  await expect(page.getByRole('link', { name: 'Uterummet' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Flytthistorik' })).toBeVisible()
  await expect(page.getByText('Från Rabatten till Uterummet · i dag')).toBeVisible()
})

test('lägg till foto på växt', async ({ page }) => {
  await skapaYta(page, 'Fönsterbrädan')
  await skapaVaxt(page, 'Pelargon', 'Fönsterbrädan')

  await page.getByLabel('Välj foto').setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: TEST_PNG,
  })
  await expect(page.locator('img[src^="blob:"]').first()).toBeVisible()
})

test('ta bort växt', async ({ page }) => {
  await skapaYta(page, 'Trappan')
  await skapaVaxt(page, 'Funkia', 'Trappan')

  await page.getByRole('button', { name: 'Ta bort växten' }).click()
  await page.getByRole('button', { name: 'Tryck igen för att ta bort' }).click()

  await expect(page).toHaveURL(/\/vaxter$/)
  await expect(page.getByText('Här bor inga växter än.')).toBeVisible()
})

test('yta med växter kan inte tas bort — tom yta kan', async ({ page }) => {
  await skapaYta(page, 'Bersån')
  await skapaVaxt(page, 'Lavendel', 'Bersån')

  await page.goto('/ytor')
  await page.getByText('Bersån').click()
  await expect(
    page.getByText('Ytan har växter — flytta eller ta bort dem innan ytan kan tas bort.'),
  ).toBeVisible()

  await page.getByText('Lavendel').click()
  await page.getByRole('button', { name: 'Ta bort växten' }).click()
  await page.getByRole('button', { name: 'Tryck igen för att ta bort' }).click()
  await expect(page).toHaveURL(/\/vaxter$/)

  await page.goto('/ytor')
  await page.getByText('Bersån').click()
  await page.getByRole('button', { name: 'Ta bort ytan' }).click()
  await page.getByRole('button', { name: 'Tryck igen för att ta bort' }).click()
  await expect(page).toHaveURL(/\/ytor$/)
  await expect(page.getByText('Inga ytor än', { exact: false })).toBeVisible()
})

test('växtformuläret kräver en yta först', async ({ page }) => {
  await page.goto('/vaxter/ny')
  await expect(page.getByText('En växt behöver en plats att bo på', { exact: false })).toBeVisible()
  await page.getByRole('link', { name: 'Skapa en yta' }).click()
  await expect(page.getByRole('heading', { name: 'Ny yta' })).toBeVisible()
})
