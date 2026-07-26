/**
 * Genererar PWA-ikoner (PNG) från en inline-SVG via Playwright/Chromium.
 * Körs manuellt vid behov: node scripts/generate-icons.mjs
 */
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const publicDir = path.join(rot, 'public')

/** Adresskylten som ikon: mörk panel, "11" i display-stil, ett litet blad. */
function ikonSvg(marginal) {
  // marginal = andel av ytan som lämnas runt skylten (maskable behöver ~20 %)
  const m = Math.round(512 * marginal)
  const s = 512 - m * 2
  return `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="#232823"/>
    <rect x="${m}" y="${m}" width="${s}" height="${s}" rx="${Math.round(s * 0.12)}"
      fill="#232823" stroke="#F7F5F0" stroke-opacity="0.28" stroke-width="${Math.max(6, Math.round(s * 0.02))}"/>
    <text x="256" y="${256 + s * 0.16}" text-anchor="middle"
      font-family="Georgia, 'Times New Roman', serif" font-weight="600"
      font-size="${Math.round(s * 0.52)}" fill="#F7F5F0">11</text>
    <path d="M ${256 - s * 0.02} ${256 - s * 0.30}
             q ${s * 0.10} ${-s * 0.16} ${s * 0.24} ${-s * 0.10}
             q ${-s * 0.02} ${s * 0.16} ${-s * 0.24} ${s * 0.10} Z"
      fill="#8FA96F"/>
  </svg>`
}

async function main() {
  await mkdir(publicDir, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } })

  const varianter = [
    { fil: 'ikon-512.png', marginal: 0.06, storlek: 512 },
    { fil: 'ikon-192.png', marginal: 0.06, storlek: 192 },
    { fil: 'ikon-180.png', marginal: 0.06, storlek: 180 },
    { fil: 'ikon-maskable-512.png', marginal: 0.18, storlek: 512 },
  ]

  for (const { fil, marginal, storlek } of varianter) {
    await page.setContent(
      `<body style="margin:0"><div id="ikon" style="width:512px;height:512px">${ikonSvg(marginal)}</div></body>`,
    )
    const buffert = await page.locator('#ikon').screenshot()
    if (storlek === 512) {
      const { writeFile } = await import('node:fs/promises')
      await writeFile(path.join(publicDir, fil), buffert)
    } else {
      // Skala ner via canvas i sidan
      const dataUrl = await page.evaluate(
        async ([b64, mal]) => {
          const img = new Image()
          img.src = 'data:image/png;base64,' + b64
          await img.decode()
          const canvas = document.createElement('canvas')
          canvas.width = mal
          canvas.height = mal
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, mal, mal)
          return canvas.toDataURL('image/png')
        },
        [buffert.toString('base64'), storlek],
      )
      const { writeFile } = await import('node:fs/promises')
      await writeFile(
        path.join(publicDir, fil),
        Buffer.from(dataUrl.split(',')[1], 'base64'),
      )
    }
    console.log('skrev', fil)
  }

  await browser.close()
}

await main()
