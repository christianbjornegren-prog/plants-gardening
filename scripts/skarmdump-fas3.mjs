/** Fas 3-granskning: bygger en demo-trädgård via UI:t och fotar kartan. */
import { chromium } from '@playwright/test'

const ut = process.argv[2] ?? '.'
const bas = 'http://localhost:5273'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('[fel]', e.message))

async function ritaObjekt(relPunkter, { namn, typ, skapaYta } = {}) {
  await page.getByRole('button', { name: 'Rita nytt objekt' }).click()
  await page.getByRole('button', { name: 'Avbryt' }).waitFor()
  await page.waitForTimeout(300)
  const box = await page.getByTestId('kartredigering').boundingBox()
  for (const [rx, ry] of relPunkter) {
    await page.mouse.click(box.x + rx * box.width, box.y + ry * box.height)
  }
  const sista = relPunkter[relPunkter.length - 1]
  await page.mouse.dblclick(box.x + sista[0] * box.width, box.y + sista[1] * box.height)
  await page.getByLabel('Typ').waitFor()
  if (typ) await page.getByLabel('Typ').selectOption(typ)
  if (namn) {
    await page.getByLabel('Namn').fill(namn)
    await page.getByLabel('Namn').blur()
    await page.waitForTimeout(150)
  }
  if (skapaYta) {
    await page.getByRole('button', { name: 'Skapa yta från objektet' }).click()
    await page.getByText('växter visas på kartan här.').waitFor()
  }
}

async function skapaVaxt(namn, yta) {
  await page.goto(bas + '/vaxter/ny')
  await page.getByLabel('Namn').fill(namn)
  await page.getByLabel('Yta').selectOption({ label: yta })
  await page.getByRole('button', { name: 'Spara' }).click()
  await page.getByRole('heading', { name: namn }).waitFor()
}

// Tomt + objekt
await page.goto(bas + '/')
await page.getByLabel('Bredd (m)').fill('19')
await page.getByLabel('Djup (m)').fill('12')
await page.getByRole('button', { name: 'Skapa kartan' }).click()
await page.getByTestId('tomtgrans').waitFor()
await page.goto(bas + '/karta/redigera')

await ritaObjekt([[0.06, 0.1], [0.94, 0.1], [0.94, 0.9], [0.06, 0.9]], { namn: 'Gräsmattan', typ: 'gräsmatta' })
await ritaObjekt([[0.06, 0.55], [0.3, 0.55], [0.3, 0.9], [0.06, 0.9]], { namn: 'Altanen', typ: 'altan' })
await ritaObjekt([[0.78, 0.1], [0.94, 0.1], [0.94, 0.32], [0.78, 0.32]], { namn: 'Boden', typ: 'bod' })
await ritaObjekt([[0.36, 0.1], [0.72, 0.1], [0.72, 0.24], [0.36, 0.24]], { namn: 'Rabatten vid staketet', typ: 'rabatt', skapaYta: true })
await ritaObjekt([[0.62, 0.62], [0.88, 0.62], [0.88, 0.88], [0.62, 0.88]], { namn: 'Pallkragen', typ: 'pallkrage', skapaYta: true })

// Växter
await skapaVaxt('Hortensian vid trappan', 'Rabatten vid staketet')
await skapaVaxt('Lavendel', 'Rabatten vid staketet')
await skapaVaxt('Rosmarin', 'Pallkragen')
await skapaVaxt('Dill', 'Pallkragen')

// Startanimation — mitt i och färdig (desktop)
await page.goto(bas + '/')
await page.waitForTimeout(450)
await page.screenshot({ path: `${ut}/fas3-anim-mitt.png` })
await page.waitForTimeout(1600)
await page.screenshot({ path: `${ut}/fas3-desktop-karta.png` })

// Redigeringsläget med valt objekt
await page.goto(bas + '/karta/redigera')
const box = await page.getByTestId('kartredigering').boundingBox()
await page.mouse.click(box.x + 0.5 * box.width, box.y + 0.17 * box.height)
await page.waitForTimeout(400)
await page.screenshot({ path: `${ut}/fas3-redigering.png` })

// Mobil: samma lagring, mindre viewport
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(bas + '/')
await page.waitForTimeout(2000)
await page.screenshot({ path: `${ut}/fas3-mobil-karta.png` })
await page.locator('[data-vaxt-id]').last().click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${ut}/fas3-mobil-infokort.png` })

await browser.close()
console.log('klart')
