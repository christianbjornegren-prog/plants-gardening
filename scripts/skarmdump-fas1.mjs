/** Skärmdumpar för Fas 1-granskning: skapar data via UI:t och fotar vyerna. */
import { chromium } from '@playwright/test'

const ut = process.argv[2] ?? '.'
const bas = 'http://localhost:5273'
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
})
const page = await ctx.newPage()

async function skapaYta(namn, sol, jord) {
  await page.goto(bas + '/ytor/ny')
  await page.getByLabel('Namn').fill(namn)
  if (sol) await page.getByRole('button', { name: sol, exact: true }).click()
  if (jord) await page.getByLabel('Jordmån').fill(jord)
  await page.getByRole('button', { name: 'Spara' }).click()
  await page.getByRole('heading', { name: namn }).waitFor()
}

async function skapaVaxt(namn, yta, anteckning) {
  await page.goto(bas + '/vaxter/ny')
  await page.getByLabel('Namn').fill(namn)
  await page.getByLabel('Yta').selectOption({ label: yta })
  if (anteckning) await page.getByLabel('Anteckning').fill(anteckning)
  await page.getByRole('button', { name: 'Spara' }).click()
  await page.getByRole('heading', { name: namn }).waitFor()
}

await skapaYta('Rabatten vid staketet', 'Halvskugga', 'Lerig, förbättrad med kompost')
await skapaYta('Pallkragen', 'Sol')
await skapaYta('Köksfönstret')
await skapaVaxt('Hortensian vid trappan', 'Rabatten vid staketet', 'Flyttad hit från uterummet i maj. Trivs bättre nu.')
await skapaVaxt('Lavendel', 'Pallkragen')
await skapaVaxt('Basilika', 'Köksfönstret')

// Foto på hortensian
await page.goto(bas + '/vaxter')
await page.getByText('Hortensian vid trappan').click()
await page.getByLabel('Välj foto').setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: PNG })
await page.locator('img[src^="blob:"]').first().waitFor()

const dumpar = [
  ['fas1-ytor', '/ytor'],
  ['fas1-yta-detalj', null], // navigeras nedan
  ['fas1-vaxter', '/vaxter'],
  ['fas1-vaxt-detalj', null],
  ['fas1-yta-form', '/ytor/ny'],
]

await page.goto(bas + '/ytor')
await page.waitForTimeout(400)
await page.screenshot({ path: `${ut}/fas1-ytor.png` })

await page.getByText('Rabatten vid staketet').click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${ut}/fas1-yta-detalj.png` })

await page.goto(bas + '/vaxter')
await page.waitForTimeout(400)
await page.screenshot({ path: `${ut}/fas1-vaxter.png` })

await page.getByText('Hortensian vid trappan').click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${ut}/fas1-vaxt-detalj.png` })

await page.goto(bas + '/ytor/ny')
await page.waitForTimeout(400)
await page.screenshot({ path: `${ut}/fas1-yta-form.png` })

await browser.close()
console.log('klart', dumpar.length)
