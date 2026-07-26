import { expect, test } from '@playwright/test'
import { gorBild, nyVaxt, vantaPaTystKvittens } from './hjalp'

test('flöde A: + → kamera → namn → Klart, och inget mer krävs', async ({ page }) => {
  await page.goto('/')
  const bild = await gorBild(page, 'hortensia')
  await nyVaxt(page, 'Hortensian', bild)

  // Landar direkt på kortet, med bilden som första punkt i fototidslinjen.
  await expect(page.getByTestId('fototidslinje')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Hortensian' }).first()).toBeVisible()
  await expect(page.getByText('Utan plats än')).toBeVisible()

  // Tidslinjen startar med FOTOT — ingen påhittad planterat-post.
  await expect(page.getByTestId('tidslinje').getByText('Planterat')).toHaveCount(0)
})

test('en växt behöver bara ett namn — foto och plats är valfria', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Citronträdet')
  await expect(page.getByRole('heading', { name: 'Citronträdet' })).toBeVisible()
  await expect(page.getByText('Utan plats än')).toBeVisible()

  await page.getByRole('link', { name: 'Växter' }).first().click()
  await expect(page.locator('h2', { hasText: 'Utan plats' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Citronträdet' })).toBeVisible()
})

test('namn är enda kravet — tomt namn stoppas', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ny växt' }).first().click()
  await page.getByRole('textbox', { name: 'Växtens namn' }).fill('   ')
  await page.getByRole('button', { name: 'Klart' }).click()
  await expect(page.getByRole('alert')).toHaveText('Ge växten ett namn.')
})

test('metadata erbjuds som chips och blir rader när de fylls i', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Pionen')

  await expect(page.getByRole('button', { name: '+ Sort' })).toBeVisible()
  await page.getByRole('button', { name: '+ Sort' }).click()
  await page.getByRole('textbox', { name: 'Sort' }).fill('Sarah Bernhardt')
  await page.getByRole('button', { name: 'Spara' }).click()

  await expect(page.getByText('Sarah Bernhardt')).toBeVisible()
  // Chippen försvinner när uppgiften är ifylld.
  await expect(page.getByRole('button', { name: '+ Sort' })).toHaveCount(0)

  // …och går att ta bort igen.
  await page.getByRole('button', { name: 'Sarah Bernhardt' }).click()
  await page.getByRole('button', { name: 'Ta bort uppgiften' }).click()
  await expect(page.getByRole('button', { name: '+ Sort' })).toBeVisible()
})

test('en växt kan få plats efteråt, utan att det loggas som en flytt', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Basilikan')

  await page.getByRole('button', { name: 'Välj plats' }).click()
  await page.getByRole('button', { name: 'Ny plats…' }).last().click()
  await page.getByRole('textbox', { name: /Namn på ny plats i Inomhus/ }).fill('Köksfönstret')
  await page.getByRole('button', { name: 'Spara' }).click()

  await expect(page.getByText('Köksfönstret · Inomhus')).toBeVisible()
  // Första platsen är ingen flytt — annars fylls loggen av brus.
  await expect(page.getByTestId('tidslinje').getByText('Flyttat')).toHaveCount(0)
})

test('data överlever omladdning (Firestore-cache)', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Ormbunken')
  await page.getByRole('link', { name: 'Växter' }).first().click()
  await expect(page.getByRole('link', { name: 'Ormbunken' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('link', { name: 'Ormbunken' })).toBeVisible()
})

test('växten går att ta bort med två tryck', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Misstaget')
  await vantaPaTystKvittens(page)
  await page.getByRole('button', { name: 'Ta bort växten' }).click()
  await page.getByRole('button', { name: 'Tryck igen för att ta bort' }).click()
  await page.waitForURL(/\/vaxter$/)
  await expect(page.getByRole('link', { name: 'Misstaget' })).toHaveCount(0)
})
