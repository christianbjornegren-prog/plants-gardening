import { expect, test } from '@playwright/test'
import { gorBild, nyVaxt } from './hjalp'

test('Hem är en dashboard: nyckeltal, senaste bilden och veckans händelser', async ({ page }) => {
  await page.goto('/')
  const bild = await gorBild(page, 'ormbunke')
  await nyVaxt(page, 'Ormbunken', bild)
  await page.getByRole('button', { name: /^Vattnat/ }).click()

  await page.getByRole('link', { name: 'Hem' }).first().click()

  // Siffrorna först — inte en helskärmsbild som ser ut som en uppladdningsruta.
  const vaxtruta = page.getByRole('link', { name: /Växter/ }).filter({ hasText: '1' })
  await expect(vaxtruta.first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fota en växt' })).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Senast i trädgården' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Ormbunken' }).first()).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Den här veckan' })).toBeVisible()
  await expect(page.getByTestId('tidslinje').getByText('Vattnat')).toBeVisible()
})

test('Hem samlar det som saknas i en enda lista med skäl', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Citronträdet')
  await page.getByRole('link', { name: 'Hem' }).first().click()

  // Växten saknar både bild och plats, men blir EN rad — inte två sektioner.
  await expect(page.getByRole('heading', { name: 'Att göra' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Citronträdet/ })).toHaveCount(1)
  await expect(page.getByText('Ingen plats vald')).toBeVisible()

  // De gamla tre rubrikerna ska vara borta.
  await expect(page.getByRole('heading', { name: 'Utan plats' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Väntar på sin första bild' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Dags att fota igen' })).toHaveCount(0)
})

test('globala loggen filtrerar på typ, och trädgårdsfiltret väntar', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Basilikan')
  await page.getByRole('button', { name: /^Vattnat/ }).click()
  await page.getByRole('button', { name: /^Gödslat/ }).click()

  await page.getByRole('link', { name: 'Logg' }).first().click()
  await expect(page.getByText('2 händelser')).toBeVisible()

  // Ingen händelse hör till en trädgård än — då filtrerar raden ingenting,
  // och ska inte synas.
  await expect(page.getByRole('button', { name: 'Allt' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Baksidan' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Vattnat' }).click()
  await expect(page.getByText('1 händelse', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Alla slag' }).click()
  await expect(page.getByText('2 händelser')).toBeVisible()
})

test('växtlistan grupperar på plats och går att söka i', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Hortensian')
  await page.getByRole('button', { name: '+ Sort' }).click()
  await page.getByRole('textbox', { name: 'Sort' }).fill('Annabelle')
  await page.getByRole('button', { name: 'Spara' }).click()
  await nyVaxt(page, 'Basilikan')

  await page.getByRole('link', { name: 'Växter' }).first().click()
  await expect(page.getByText('2 växter')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Sök' }).fill('annabelle')
  await expect(page.getByRole('link', { name: /Hortensian/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Basilikan/ })).toHaveCount(0)

  await page.getByRole('searchbox', { name: 'Sök' }).fill('finns inte')
  await expect(page.getByText('Inga växter matchar')).toBeVisible()
})

test('startanimationen respekterar prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/ritning')
  await page.getByRole('button', { name: 'Baksidan', exact: true }).click()
  await page.getByRole('button', { name: /^Rita Baksidan/ }).click()
  await page.getByRole('textbox', { name: 'Bredd (m)' }).fill('16')
  await page.getByRole('textbox', { name: 'Djup (m)' }).fill('11')
  await page.getByRole('button', { name: 'Skapa ritningen' }).click()

  // Ingen väntan: tomtgränsen ska vara framme direkt.
  await expect(page.getByTestId('tomtgrans')).toBeVisible()
  await expect(page.getByTestId('tomtgrans')).toHaveCSS('fill-opacity', '1')
})
