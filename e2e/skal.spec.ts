import { expect, test } from '@playwright/test'

test('skalet: adresskylt, fyra flikar och svensk titel', async ({ page }) => {
  const fel: string[] = []
  page.on('console', (m) => m.type() === 'error' && fel.push(m.text()))
  page.on('pageerror', (e) => fel.push(e.message))

  await page.goto('/')
  await expect(page).toHaveTitle(/Ripvägen 11/)
  await expect(page.getByTestId('adresskylt').first()).toBeVisible()

  // Tomt tillstånd bjuder in, det spärrar inte (se CLAUDE.md).
  await expect(page.getByText('Trädgården är tom än')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fota första växten' })).toBeVisible()

  for (const [flik, url] of [
    ['Ritningen', '/ritning'],
    ['Växter', '/vaxter'],
    ['Logg', '/logg'],
    ['Hem', '/'],
  ] as const) {
    await page.getByRole('link', { name: flik }).first().click()
    await expect(page).toHaveURL(new RegExp(`${url.replace('/', '\\/')}$`))
  }

  expect(fel).toEqual([])
})

test('ordet "yta" finns inte kvar i gränssnittet', async ({ page }) => {
  for (const url of ['/', '/ritning', '/vaxter', '/logg']) {
    await page.goto(url)
    await page.waitForTimeout(400)
    const text = await page.locator('body').innerText()
    expect(text.toLowerCase()).not.toContain('yta')
    expect(text.toLowerCase()).not.toContain('ytor')
  }
})

test('ritningen erbjuds men tvingas inte fram vid start', async ({ page }) => {
  await page.goto('/ritning')
  // Tre trädgårdar sås tyst — ingen setup-skärm blockerar vägen in.
  for (const namn of ['Framsidan', 'Baksidan', 'Inomhus']) {
    await expect(page.getByRole('button', { name: namn, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: /^Rita / })).toBeVisible()
})
