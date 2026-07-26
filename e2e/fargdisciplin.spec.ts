import { expect, test, type Page } from '@playwright/test'
import { angeMatt, nyVaxt, oppnaFlerDetaljer, oppnaRitlage, ritaPlats } from './hjalp'

/**
 * Färgdisciplinen: exakt EN röd åtgärd per skärm. Skalets "Ny växt" är appens
 * röda; en vy får bara en egen när skalet inte syns (ritläget). Destruktivt
 * är aldrig rött före bekräftelsesteget.
 *
 * Ark och sheets testas inte här — de täcker skalet med ett overlay, och då
 * är arkets primärknapp den enda som går att trycka på.
 */

async function antalRoda(page: Page): Promise<number> {
  return page.evaluate(() =>
    [...document.querySelectorAll('button, a')].filter((el) => {
      const cls = typeof el.className === 'string' ? el.className : ''
      if (!cls.includes('bg-fermob')) return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }).length,
  )
}

test('varje vy visar exakt en röd åtgärd', async ({ page }) => {
  await page.goto('/')
  // Tomläget: skalets + är den enda röda.
  expect(await antalRoda(page)).toBe(1)

  await nyVaxt(page, 'Hortensian')
  // Växtkortet.
  expect(await antalRoda(page)).toBe(1)

  for (const flik of ['Hem', 'Växter', 'Logg', 'Ritningen']) {
    await page.getByRole('link', { name: flik }).first().click()
    await page.waitForTimeout(300)
    expect(await antalRoda(page), `${flik} ska ha exakt en röd åtgärd`).toBe(1)
  }
})

test('destruktivt är aldrig rött före bekräftelsesteget', async ({ page }) => {
  await page.goto('/')
  await nyVaxt(page, 'Misstaget')
  await oppnaFlerDetaljer(page)

  const taBort = page.getByRole('button', { name: 'Ta bort växten' })
  await expect(taBort).toBeVisible()
  expect(await taBort.evaluate((el) => el.className)).not.toContain('fermob')

  // Först i bekräftelsesteget får rött förekomma.
  await taBort.click()
  const armerad = page.getByRole('button', { name: 'Tryck igen för att ta bort' })
  expect(await armerad.evaluate((el) => el.className)).toContain('fermob')
})

test.describe('ritläget', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'ritläget är desktop-först')

  test('Rita ny plats är skärmens enda röda, även med en plats markerad', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    expect(await antalRoda(page)).toBe(1)

    await ritaPlats(page, [
      [0.2, 0.25],
      [0.6, 0.25],
      [0.6, 0.7],
      [0.2, 0.7],
    ])
    // Panelen öppen med alla verktyg synliga — fortfarande en röd.
    expect(await antalRoda(page)).toBe(1)
  })
})
