import { expect, test, type Page } from '@playwright/test'

async function skapaKartaMedMatt(page: Page) {
  await page.goto('/')
  await page.getByLabel('Bredd (m)').fill('18')
  await page.getByLabel('Djup (m)').fill('12')
  await page.getByRole('button', { name: 'Skapa kartan' }).click()
  await expect(page.getByTestId('tomtgrans')).toBeVisible()
}

/** Ritar en polygon i redigeringsläget via relativa koordinater i kartytan. */
async function ritaObjekt(page: Page, relPunkter: [number, number][]) {
  await page.getByRole('button', { name: 'Rita nytt objekt' }).click()
  // Mät ytan EFTER att ritläget startat — panelen stängs och layouten ändras,
  // och viewBoxen passas om av ResizeObserver strax efteråt.
  await expect(page.getByRole('button', { name: 'Avbryt' })).toBeVisible()
  await page.waitForTimeout(250)
  const box = await page.getByTestId('kartredigering').boundingBox()
  if (!box) throw new Error('kartytan saknar boundingBox')
  for (const [rx, ry] of relPunkter) {
    await page.mouse.click(box.x + rx * box.width, box.y + ry * box.height)
  }
  const sista = relPunkter[relPunkter.length - 1]!
  await page.mouse.dblclick(box.x + sista[0] * box.width, box.y + sista[1] * box.height)
  // Panelen öppnas när objektet skapats — invänta den innan vi går vidare.
  await expect(page.getByLabel('Namn')).toBeVisible()
}

test('tomtens mått skapar kartan med tomtgräns och adresskylt', async ({ page }) => {
  await skapaKartaMedMatt(page)
  await expect(page.getByTestId('adresskylt')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Redigera' })).toBeVisible()
})

test('rita ett objekt, döp och typa det, och se det efter omladdning', async ({ page }) => {
  await skapaKartaMedMatt(page)
  await page.goto('/karta/redigera')
  await ritaObjekt(page, [
    [0.2, 0.25],
    [0.45, 0.25],
    [0.45, 0.55],
    [0.2, 0.55],
  ])

  // Panelen öppnas för det nya objektet
  await expect(page.getByLabel('Namn')).toHaveValue('Rabatt 1')
  await page.getByLabel('Namn').fill('Rabatten vid staketet')
  await page.getByLabel('Namn').blur()
  await page.getByLabel('Typ').selectOption('gräsmatta')
  await expect(page.getByLabel('Objektets bredd i meter')).toBeVisible()

  await page.reload()
  await expect(page.locator('polygon[data-objekt-id]')).toHaveCount(1)
})

test('objekt kan kopplas till ny yta och växten får en prick på kartan', async ({ page }) => {
  await skapaKartaMedMatt(page)
  await page.goto('/karta/redigera')
  await ritaObjekt(page, [
    [0.2, 0.25],
    [0.5, 0.25],
    [0.5, 0.6],
    [0.2, 0.6],
  ])
  await page.getByRole('button', { name: 'Skapa yta från objektet' }).click()
  await expect(page.getByText('0 växter visas på kartan här.')).toBeVisible()

  await page.goto('/vaxter/ny')
  await page.getByLabel('Namn').fill('Hortensia')
  await page.getByLabel('Yta').selectOption({ label: 'Rabatt 1' })
  await page.getByRole('button', { name: 'Spara' }).click()
  await expect(page.getByRole('heading', { name: 'Hortensia' })).toBeVisible()

  await page.goto('/')
  await expect(page.locator('[data-vaxt-id]')).toHaveCount(1)
})

test('tryck på objekt visar infokort', async ({ page }) => {
  await skapaKartaMedMatt(page)
  await page.goto('/karta/redigera')
  await ritaObjekt(page, [
    [0.25, 0.3],
    [0.5, 0.3],
    [0.5, 0.55],
    [0.25, 0.55],
  ])
  await page.goto('/')
  await page.locator('polygon[data-objekt-id]').click()
  await expect(page.getByTestId('infokort')).toBeVisible()
  await expect(page.getByTestId('infokort').getByText('Rabatt 1')).toBeVisible()
  await page.getByRole('button', { name: 'Stäng' }).click()
  await expect(page.getByTestId('infokort')).toHaveCount(0)
})

test('vattna växt direkt från kartan: prick → Vattnat', async ({ page }) => {
  await skapaKartaMedMatt(page)
  await page.goto('/karta/redigera')
  await ritaObjekt(page, [
    [0.2, 0.25],
    [0.5, 0.25],
    [0.5, 0.6],
    [0.2, 0.6],
  ])
  await page.getByRole('button', { name: 'Skapa yta från objektet' }).click()
  await expect(page.getByText('0 växter visas på kartan här.')).toBeVisible()
  await page.goto('/vaxter/ny')
  await page.getByLabel('Namn').fill('Lavendel')
  await page.getByLabel('Yta').selectOption({ label: 'Rabatt 1' })
  await page.getByRole('button', { name: 'Spara' }).click()
  await expect(page.getByRole('heading', { name: 'Lavendel' })).toBeVisible()

  await page.goto('/')
  await page.locator('[data-vaxt-id]').click()
  await expect(page.getByTestId('infokort').getByText('Lavendel')).toBeVisible()
  await page.getByRole('button', { name: 'Vattnat' }).click()
  await expect(page.getByRole('status')).toHaveText('Vattnat — antecknat.')

  // SPA-navigering (ingen omladdning) så att skrivningen hinner persisteras
  await page.getByRole('link', { name: 'Logg' }).first().click()
  await expect(page.getByText('Vattnat', { exact: true })).toBeVisible()
})

test('dra växtprick till annan yta flyttar växten med historik', async ({ page }) => {
  await skapaKartaMedMatt(page)
  await page.goto('/karta/redigera')
  await ritaObjekt(page, [
    [0.1, 0.2],
    [0.35, 0.2],
    [0.35, 0.5],
    [0.1, 0.5],
  ])
  await page.getByRole('button', { name: 'Skapa yta från objektet' }).click()
  await expect(page.getByText('0 växter visas på kartan här.')).toBeVisible()
  await ritaObjekt(page, [
    [0.55, 0.2],
    [0.85, 0.2],
    [0.85, 0.5],
    [0.55, 0.5],
  ])
  await page.getByRole('button', { name: 'Skapa yta från objektet' }).click()
  await expect(page.getByText('0 växter visas på kartan här.')).toBeVisible()

  await page.goto('/vaxter/ny')
  await page.getByLabel('Namn').fill('Rosmarin')
  await page.getByLabel('Yta').selectOption({ label: 'Rabatt 1' })
  await page.getByRole('button', { name: 'Spara' }).click()
  await expect(page.getByRole('heading', { name: 'Rosmarin' })).toBeVisible()

  await page.goto('/')
  const prick = page.locator('[data-vaxt-id]')
  await expect(prick).toHaveCount(1)
  const prickBox = await prick.boundingBox()
  const malPolygon = page.locator('polygon[data-objekt-id]').nth(1)
  const malBox = await malPolygon.boundingBox()
  if (!prickBox || !malBox) throw new Error('saknar boundingBox')

  const synligCirkel = prick.locator('circle').nth(1)
  const cxFore = await synligCirkel.getAttribute('cx')

  await page.mouse.move(prickBox.x + prickBox.width / 2, prickBox.y + prickBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(malBox.x + malBox.width / 2, malBox.y + malBox.height / 2, { steps: 8 })
  await page.mouse.up()

  // Vänta tills lyssnaren gett pricken dess nya läge innan vi lämnar kartan
  await expect(synligCirkel).not.toHaveAttribute('cx', cxFore ?? '')

  await page.getByRole('link', { name: 'Växter' }).first().click()
  await page.getByText('Rosmarin').click()
  await expect(page.getByRole('link', { name: 'Rabatt 2' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Flytthistorik' })).toBeVisible()
  await expect(page.getByText('Från Rabatt 1 till Rabatt 2 · i dag')).toBeVisible()
})

test('kartan respekterar reducerad rörelse', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await skapaKartaMedMatt(page)
  await expect(page.getByTestId('tomtgrans')).toBeVisible()
  await ctx.close()
})
