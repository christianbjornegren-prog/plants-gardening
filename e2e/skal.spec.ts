import { expect, test } from '@playwright/test'

test('startvyn visar adresskylten', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('adresskylt')).toBeVisible()
})

test('navigeringen fungerar mellan alla vyer', async ({ page }) => {
  await page.goto('/')
  for (const [lank, rubrik] of [
    ['Växter', 'Växter'],
    ['Ytor', 'Ytor'],
    ['Logg', 'Logg'],
  ] as const) {
    await page.getByRole('link', { name: lank }).first().click()
    await expect(page.getByRole('heading', { name: rubrik })).toBeVisible()
  }
  await page.getByRole('link', { name: 'Karta' }).first().click()
  await expect(page.getByTestId('adresskylt')).toBeVisible()
})

test('sidan har svensk titel och inga konsolfel', async ({ page }) => {
  const konsolfel: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') konsolfel.push(m.text())
  })
  await page.goto('/')
  await expect(page).toHaveTitle('Ripvägen 11')
  await expect(page.getByTestId('adresskylt')).toBeVisible()
  expect(konsolfel).toEqual([])
})
