/**
 * Sår en demoträdgård via UI:t och tar skärmdumpar för designgranskning
 * (iterationsloopen i CLAUDE.md).
 *
 * Allt sker i EN webbläsarkontext: appens data ligger i IndexedDB, som inte
 * följer med storageState mellan kontexter.
 *
 * Användning: node scripts/skarmdump.mjs <utkatalog> [basUrl]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const ut = process.argv[2] ?? 'skarmdumpar'
const bas = process.argv[3] ?? 'http://localhost:5273'
const MOBIL = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 800 }

await mkdir(ut, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 2 })
const page = await ctx.newPage()
page.on('console', (m) => m.type() === 'error' && console.log('KONSOLFEL:', m.text()))
await page.goto(bas)
await page.waitForTimeout(800)

/* --- bilder: renderas i webbläsaren och skrivs till disk som riktiga JPEG --- */
async function gorBild(namn, toner) {
  const data = await page.evaluate((t) => {
    const c = document.createElement('canvas')
    c.width = 1200
    c.height = 900
    const g = c.getContext('2d')
    const grad = g.createLinearGradient(0, 0, 1200, 900)
    grad.addColorStop(0, t[0])
    grad.addColorStop(1, t[1])
    g.fillStyle = grad
    g.fillRect(0, 0, 1200, 900)
    // Lite lövverk så bilderna inte ser ut som färgplattor.
    for (let i = 0; i < 260; i++) {
      g.beginPath()
      const x = Math.random() * 1200
      const y = Math.random() * 900
      g.ellipse(x, y, 12 + Math.random() * 46, 6 + Math.random() * 22, Math.random() * 3.14, 0, 6.3)
      g.fillStyle = `rgba(${20 + Math.random() * 60},${70 + Math.random() * 90},${30 + Math.random() * 50},0.5)`
      g.fill()
    }
    return c.toDataURL('image/jpeg', 0.9)
  }, toner)
  const fil = `${ut}/${namn}.jpg`
  await writeFile(fil, Buffer.from(data.split(',')[1], 'base64'))
  return fil
}

const bilder = {
  april: await gorBild('_bild-april', ['#5d7a4a', '#8fa96f']),
  juni: await gorBild('_bild-juni', ['#3f6b33', '#7ba05b']),
  sept: await gorBild('_bild-sept', ['#7a6a3a', '#c9a05b']),
  basilika: await gorBild('_bild-basilika', ['#4e6b44', '#9dbb7a']),
  rabatt: await gorBild('_bild-rabatt', ['#48603c', '#a8b98a']),
  pion: await gorBild('_bild-pion', ['#6b4a52', '#c98f9b']),
}

/* ------------------------------------------------ 1. mått + ritade platser */
async function angeMatt(tradgard, bredd, djup) {
  await page.getByRole('link', { name: 'Ritningen' }).first().click()
  await page.getByRole('button', { name: tradgard, exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`Rita ${tradgard}`) }).click()
  await page.getByRole('textbox', { name: 'Bredd (m)' }).fill(bredd)
  await page.getByRole('textbox', { name: 'Djup (m)' }).fill(djup)
  await page.getByRole('button', { name: 'Skapa ritningen' }).click()
  await page.waitForTimeout(500)
}

/** Ritar en polygon genom att klicka ut hörn i andelar av ritytan. */
async function ritaPlats(horn, namn, typ) {
  await page.getByRole('button', { name: 'Rita ny plats' }).click()
  const box = await page.locator('[data-testid="ritredigering"]').boundingBox()
  const punkt = ([fx, fy]) => ({ x: box.x + fx * box.width, y: box.y + fy * box.height })
  for (const h of horn) {
    const p = punkt(h)
    await page.mouse.click(p.x, p.y)
    await page.waitForTimeout(60)
  }
  const sista = punkt(horn[horn.length - 1])
  await page.mouse.dblclick(sista.x, sista.y)
  await page.waitForTimeout(350)
  await page.getByRole('button', { name: typ, exact: true }).click()
  const namnfalt = page.getByRole('textbox', { name: 'Namn' })
  await namnfalt.fill(namn)
  await namnfalt.blur()
  await page.waitForTimeout(250)
}

await angeMatt('Baksidan', '16', '11')
await page.getByRole('link', { name: 'Redigera' }).click()
await page.waitForTimeout(600)

await ritaPlats(
  [[0.12, 0.55], [0.44, 0.55], [0.44, 0.84], [0.12, 0.84]],
  'Rabatten vid staketet',
  'Rabatt',
)
await ritaPlats(
  [[0.52, 0.12], [0.88, 0.12], [0.88, 0.44], [0.52, 0.44]],
  'Altanen',
  'Altan',
)
await ritaPlats([[0.12, 0.12], [0.34, 0.12], [0.34, 0.34], [0.12, 0.34]], 'Boden', 'Bod')
await ritaPlats(
  [[0.5, 0.55], [0.88, 0.55], [0.88, 0.88], [0.5, 0.88]],
  'Gräset',
  'Gräsmatta',
)
await ritaPlats(
  [[0.14, 0.4], [0.3, 0.4], [0.3, 0.5], [0.14, 0.5]],
  'Pallkrage 1',
  'Pallkrage',
)

/* ------------------------------------------------------------ 2. växterna */
async function nyVaxt(namn, bild) {
  await page.getByRole('button', { name: 'Ny växt' }).first().click()
  if (bild) await page.getByTestId('ny-vaxt-kamera').setInputFiles(bild)
  await page.waitForTimeout(450)
  await page.getByRole('textbox', { name: 'Växtens namn' }).fill(namn)
  await page.getByRole('button', { name: 'Klart' }).click()
  await page.waitForURL(/\/vaxter\/[^/]+$/)
  await page.waitForTimeout(350)
}

async function valjPlats(plats) {
  await page.getByRole('button', { name: /^(Välj plats|Rabatten|Altanen|Boden|Gräset|Pallkrage)/ })
    .first()
    .click()
  await page.getByRole('button', { name: plats, exact: true }).click()
  await page.waitForTimeout(350)
}

await nyVaxt('Hortensian vid boden', bilder.april)
await valjPlats('Rabatten vid staketet')
// Fler bilder på samma planta = fototidslinjen.
for (const bild of [bilder.juni, bilder.sept]) {
  await page.getByRole('button', { name: /^Foto/ }).click()
  await page.getByTestId('handelse-kamera').setInputFiles(bild)
  await page.waitForTimeout(500)
}
await page.getByRole('button', { name: /^Beskuret/ }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: '+ Sort' }).click()
await page.getByRole('textbox', { name: 'Sort' }).fill('Annabelle')
await page.getByRole('button', { name: 'Spara' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: '+ Planterades' }).click()
await page.getByRole('textbox', { name: 'Planterades' }).fill('maj 2023')
await page.getByRole('button', { name: 'Spara' }).click()
await page.waitForTimeout(300)

await nyVaxt('Basilikan', bilder.basilika)
await valjPlats('Pallkrage 1')
await page.getByRole('button', { name: /^Vattnat/ }).click()
await page.waitForTimeout(400)

await nyVaxt('Pionen', bilder.pion)
await valjPlats('Rabatten vid staketet')

await nyVaxt('Ormbunken', bilder.rabatt)
await valjPlats('Gräset')

await nyVaxt('Citronträdet', null)

// En planerad växt (streckad på ritningen, egen sektion på Hem).
await page.goto(bas + '/ritning')
await page.waitForTimeout(2200)
{
  // Klicka i formen (etiketten har pointer-events: none och blockeras av polygonen).
  const box = await page.locator('[data-testid="ritning"]').boundingBox()
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.62)
}
await page.waitForTimeout(700)
await page.getByRole('button', { name: 'Lägg till växt här' }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: 'Planera en växt här' }).click()
await page.waitForTimeout(500)
await page.getByRole('textbox', { name: 'Växtens namn' }).fill('Magnolian')
await page.getByRole('button', { name: 'Klart' }).click()
await page.waitForTimeout(700)

// En plats inomhus, med väderstreck.
await page.goto(bas + '/vaxter')
await page.waitForTimeout(600)
await page.getByText('Citronträdet').first().click()
await page.waitForTimeout(600)
await page.getByRole('button', { name: 'Välj plats' }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Ny plats…' }).last().click()
await page.getByRole('textbox', { name: /Namn på ny plats i Inomhus/ }).fill('Köksfönstret')
await page.getByRole('button', { name: 'Spara' }).click()
await page.waitForTimeout(600)

/* ---------------------------------------------------------- 3. skärmdumpar */
async function skott(namn, url, vp, vanta = 900) {
  await page.setViewportSize(vp)
  await page.goto(bas + url)
  await page.waitForTimeout(vanta)
  await page.screenshot({ path: `${ut}/${namn}.png` })
  console.log('skrev', namn + '.png')
}

const vaxtUrl = await page.evaluate(() => location.pathname)
await skott('mobil-hem', '/', MOBIL)
await page.screenshot({ path: `${ut}/mobil-hem-hel.png`, fullPage: true })
await skott('mobil-vaxter', '/vaxter', MOBIL)
await skott('mobil-ritning', '/ritning', MOBIL, 2800)
await skott('mobil-logg', '/logg', MOBIL)

await page.setViewportSize(MOBIL)
await page.goto(bas + '/vaxter')
await page.waitForTimeout(700)
await page.getByText('Hortensian vid boden').first().click()
await page.waitForTimeout(900)
await page.screenshot({ path: `${ut}/mobil-vaxtkort.png` })
console.log('skrev mobil-vaxtkort.png')

await skott('desktop-hem', '/', DESKTOP)
await skott('desktop-ritning', '/ritning', DESKTOP, 2800)
await skott('desktop-rita', '/ritning/rita?tradgard=baksidan', DESKTOP, 1200)

console.log('sista växtens url:', vaxtUrl)
await browser.close()
