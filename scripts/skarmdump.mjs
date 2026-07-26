/**
 * Tar skärmdumpar för designgranskning (iterationsloopen i CLAUDE.md).
 * Användning: node scripts/skarmdump.mjs <utkatalog> [basUrl] [sidorJson]
 */
import { chromium } from '@playwright/test'

const ut = process.argv[2] ?? '.'
const bas = process.argv[3] ?? 'http://localhost:5273'
const sidor = JSON.parse(process.argv[4] ?? 'null') ?? [
  { namn: 'mobil-karta', vp: { width: 390, height: 844 }, url: '/', mobil: true },
  { namn: 'mobil-vaxter', vp: { width: 390, height: 844 }, url: '/vaxter', mobil: true },
  { namn: 'desktop-karta', vp: { width: 1280, height: 800 }, url: '/', mobil: false },
]

const browser = await chromium.launch()
for (const s of sidor) {
  const ctx = await browser.newContext({
    viewport: s.vp,
    isMobile: s.mobil,
    hasTouch: s.mobil,
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  await page.goto(bas + s.url)
  await page.waitForTimeout(s.vanta ?? 700)
  await page.screenshot({ path: `${ut}/${s.namn}.png` })
  await ctx.close()
  console.log('skrev', s.namn + '.png')
}
await browser.close()
