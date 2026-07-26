/** Skärmdumpar för Fas 2-granskning: snabblogg + tidslinjer. */
import { chromium } from '@playwright/test'

const ut = process.argv[2] ?? '.'
const bas = 'http://localhost:5273'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
})
const page = await ctx.newPage()

await page.goto(bas + '/ytor/ny')
await page.getByLabel('Namn').fill('Rabatten vid staketet')
await page.getByRole('button', { name: 'Halvskugga' }).click()
await page.getByRole('button', { name: 'Spara' }).click()
await page.getByRole('heading', { name: 'Rabatten vid staketet' }).waitFor()

await page.goto(bas + '/vaxter/ny')
await page.getByLabel('Namn').fill('Hortensian vid trappan')
await page.getByLabel('Yta').selectOption({ label: 'Rabatten vid staketet' })
await page.getByRole('button', { name: 'Spara' }).click()
await page.getByRole('heading', { name: 'Hortensian vid trappan' }).waitFor()

await page.getByRole('button', { name: 'Vattnat' }).click()
await page.getByRole('status').waitFor()
await page.getByRole('button', { name: 'Skriv anteckning' }).waitFor({ state: 'hidden' }).catch(() => {})

await page.screenshot({ path: `${ut}/fas2-vaxt-snabblogg.png` })

// Anteckning på ytan
await page.goto(bas + '/ytor')
await page.getByText('Rabatten vid staketet').click()
await page.getByRole('button', { name: 'Skriv anteckning' }).click()
await page.getByLabel('Anteckning').fill('Rensade ogräs, la ny täckbark.')
await page.getByRole('button', { name: 'Spara anteckning' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${ut}/fas2-yta-logg.png` })

await page.goto(bas + '/logg')
await page.waitForTimeout(400)
await page.screenshot({ path: `${ut}/fas2-logg.png` })

await browser.close()
console.log('klart')
