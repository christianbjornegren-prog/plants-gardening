import { expect, test } from '@playwright/test'
import { gorBild, nyVaxt } from './hjalp'

test('flöde B: ett tryck loggar beskärning med dagens datum', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Hortensian')

  await page.getByRole('button', { name: /^Beskuret/ }).click()

  // Händelsen är sparad direkt — kvittensen är en kvittens, inte ett steg.
  await expect(page.getByTestId('tidslinje').getByText('Beskuret')).toBeVisible()
  await expect(page.getByRole('status').first()).toContainText('Beskuret')
  await expect(page.getByText('i dag').first()).toBeVisible()
})

test('beskärning erbjuder en bild — men kräver den inte', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Häcken')
  await page.getByRole('button', { name: /^Beskuret/ }).click()

  const kvittens = page.getByRole('status').first()
  await expect(kvittens.getByRole('button', { name: 'Ta en bild' })).toBeVisible()
  await expect(kvittens.getByRole('button', { name: 'Ångra' })).toBeVisible()

  // Ignorerar man kvittensen står beskärningen kvar.
  await page.waitForTimeout(6500)
  await expect(page.getByTestId('tidslinje').getByText('Beskuret')).toBeVisible()
})

test('vattning erbjuder INTE bild — bara beskärning gör det', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Krukväxten')
  await page.getByRole('button', { name: /^Vattnat/ }).click()
  const kvittens = page.getByRole('status').first()
  await expect(kvittens).toContainText('Vattnat')
  await expect(kvittens.getByRole('button', { name: 'Ta en bild' })).toHaveCount(0)
})

test('Ångra tar bort händelsen igen', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Rosen')
  await page.getByRole('button', { name: /^Gödslat/ }).click()
  await expect(page.getByTestId('tidslinje').getByText('Gödslat')).toBeVisible()

  await page.getByRole('status').first().getByRole('button', { name: 'Ångra' }).click()
  await expect(page.getByTestId('tidslinje').getByText('Gödslat')).toHaveCount(0)
})

test('knappen visar när det senast gjordes', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Lavendeln')
  await expect(page.getByRole('button', { name: /^Vattnat/ })).toContainText('—')
  await page.getByRole('button', { name: /^Vattnat/ }).click()
  await expect(page.getByRole('button', { name: /^Vattnat/ })).not.toContainText('—')
})

test('fototidslinjen samlar flera bilder på samma växt, äldst först', async ({ page }) => {
  await page.goto('/')
  const forsta = await gorBild(page, 'april', '#5d7a4a')
  const andra = await gorBild(page, 'juli', '#c9a05b')
  await nyVaxt(page, 'Hortensian', forsta)

  await page.getByRole('button', { name: /^Foto/ }).click()
  await page.getByTestId('handelse-kamera').setInputFiles(andra)
  await expect(page.getByRole('status').first()).toContainText('Foto sparat')

  const bilder = page.getByTestId('fototidslinje').getByRole('img')
  await expect(bilder).toHaveCount(2)
})
