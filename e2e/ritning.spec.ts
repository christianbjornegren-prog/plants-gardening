import { expect, test } from '@playwright/test'
import { angeMatt, gaTill, gorBild, nyVaxt, ritaPlats, tryckIRitningen } from './hjalp'

const RUTA: [number, number][] = [
  [0.2, 0.3],
  [0.7, 0.3],
  [0.7, 0.75],
  [0.2, 0.75],
]

test('varje trädgård har sin egen ritning — Inomhus har ingen', async ({ page }) => {
  await angeMatt(page, 'Baksidan', '16', '11')

  await page.getByRole('button', { name: 'Framsidan', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Rita Framsidan/ })).toBeVisible()

  await page.getByRole('button', { name: 'Inomhus', exact: true }).click()
  await expect(page.getByText('Här finns ingen ritning')).toBeVisible()
})

test('skalstock och norrpil finns på ritningen', async ({ page }) => {
  await angeMatt(page, 'Baksidan', '16', '11')
  await expect(page.getByText('N', { exact: true })).toBeVisible()
  await expect(page.getByText(/^\d+(,\d)? m$/)).toBeVisible()
})

test.describe('ritläget', () => {
  // Ritläget är desktop-först och knappen visas bara ≥1024 px (se CLAUDE.md).
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'ritläget är desktop-först')

  test('flöde C: rita en plats, namnge den, och den finns kvar', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await page.getByRole('link', { name: 'Redigera' }).click()
    await ritaPlats(page, RUTA, 'Rabatten vid staketet')

    await expect(page.getByRole('textbox', { name: 'Namn' })).toHaveValue(
      'Rabatten vid staketet',
    )
    await expect(page.locator('[data-plats-id]')).toHaveCount(1)

    await page.getByRole('link', { name: 'Tillbaka till ritningen' }).click()
    await expect(page.locator('[data-plats-id]')).toHaveCount(1)
  })

  test('måtten går att skriva in och skalar formen', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await page.getByRole('link', { name: 'Redigera' }).click()
    await ritaPlats(page, RUTA, 'Rabatten')

    const bredd = page.getByRole('textbox', { name: 'Platsens bredd i meter' })
    await bredd.fill('4')
    await bredd.blur()
    await expect(bredd).toHaveValue('4')
  })

  test('en plats kan markeras som planerad och ritas då streckad', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await page.getByRole('link', { name: 'Redigera' }).click()
    await ritaPlats(page, RUTA, 'Nya rabatten')

    await page.getByRole('button', { name: 'Planerad' }).click()
    await expect(page.locator('[data-plats-id]').first()).toHaveAttribute(
      'stroke-dasharray',
      '7 5',
    )
  })

  test('kuben: en växt utan position kan sättas ut från ritläget', async ({ page }) => {
    await page.goto('/')
    await nyVaxt(page, 'Hortensian')
    await angeMatt(page, 'Baksidan', '16', '11')
    await page.getByRole('link', { name: 'Redigera' }).click()
    await ritaPlats(page, RUTA, 'Rabatten')

    await expect(page.getByRole('button', { name: 'Hortensian' })).toBeVisible()
    await page.getByRole('button', { name: 'Hortensian' }).click()
    await expect(page.getByText('Klicka på en plats')).toBeVisible()

    const box = (await page.locator('[data-testid="ritredigering"]').boundingBox())!
    await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.5)
    await expect(page.locator('[data-vaxt-id]')).toHaveCount(1)
  })

  test('platsen kan tas bort — växterna där blir hemlösa, inte raderade', async ({ page }) => {
    await page.goto('/')
    await nyVaxt(page, 'Hortensian')
    await angeMatt(page, 'Baksidan', '16', '11')
    await page.getByRole('link', { name: 'Redigera' }).click()
    await ritaPlats(page, RUTA, 'Rabatten')
    await page.getByRole('button', { name: 'Hortensian' }).click()
    const box = (await page.locator('[data-testid="ritredigering"]').boundingBox())!
    await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.5)
    await expect(page.locator('[data-vaxt-id]')).toHaveCount(1)

    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.35)
    await page.getByRole('button', { name: 'Ta bort platsen' }).click()
    await page.getByRole('button', { name: 'Tryck igen för att ta bort' }).click()

    // Vänta på kvittensen i ritningen — formen OCH pricken ska vara borta —
    // innan vi navigerar vidare och tittar på listan.
    await expect(page.locator('[data-plats-id]')).toHaveCount(0)
    await expect(page.locator('[data-vaxt-id]')).toHaveCount(0)

    await gaTill(page, 'Växter')
    await expect(page.locator('h2', { hasText: 'Utan plats' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Hortensian' })).toBeVisible()
  })
})

test('kuben: en plats på ritningen kan ta emot en befintlig växt', async ({ page }) => {
  // Formen ritas på desktopbredd, men PLACERINGEN ska funka i mobilen också.
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const bild = await gorBild(page, 'pion')
  await nyVaxt(page, 'Pionen', bild)
  await angeMatt(page, 'Baksidan', '16', '11')
  await page.getByRole('link', { name: 'Redigera' }).click()
  await ritaPlats(page, RUTA, 'Rabatten')
  await page.getByRole('link', { name: 'Tillbaka till ritningen' }).click()

  await tryckIRitningen(page, 0.45, 0.5)
  await page.getByRole('button', { name: 'Lägg till växt här' }).click()
  await page.getByRole('button', { name: /Pionen/ }).click()

  await expect(page.locator('[data-vaxt-id]')).toHaveCount(1)
  await gaTill(page, 'Växter')
  await expect(page.getByRole('link', { name: /Rabatten/ })).toBeVisible()
})

test('kuben: växtkortet kan skicka en växt till ritningen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await nyVaxt(page, 'Hortensian')
  await angeMatt(page, 'Baksidan', '16', '11')
  await page.getByRole('link', { name: 'Redigera' }).click()
  await ritaPlats(page, RUTA, 'Rabatten')

  // Ge växten platsen, gå sedan till kortet och placera den på ritningen.
  await gaTill(page, 'Växter')
  await page.getByRole('link', { name: 'Hortensian' }).click()
  await page.getByRole('button', { name: 'Välj plats' }).click()
  await page.getByRole('button', { name: 'Rabatten', exact: true }).click()
  await page.getByRole('button', { name: 'Placera på ritningen' }).click()

  await expect(page.getByText('Tryck där')).toBeVisible()
  await tryckIRitningen(page, 0.45, 0.5)
  await expect(page.getByText('Tryck där')).toHaveCount(0)
  await expect(page.locator('[data-vaxt-id]')).toHaveCount(1)
})

test('planerad växt ritas streckad och listas under Planerat', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await angeMatt(page, 'Baksidan', '16', '11')
  await page.getByRole('link', { name: 'Redigera' }).click()
  await ritaPlats(page, RUTA, 'Rabatten')
  await page.getByRole('link', { name: 'Tillbaka till ritningen' }).click()

  await tryckIRitningen(page, 0.45, 0.5)
  await page.getByRole('button', { name: 'Lägg till växt här' }).click()
  await page.getByRole('button', { name: 'Planera en växt här' }).click()
  await page.getByRole('textbox', { name: 'Växtens namn' }).fill('Magnolian')
  await page.getByRole('button', { name: 'Klart' }).click()
  await page.waitForURL(/\/vaxter\//)

  await expect(page.getByText('Planerad — inte planterad än')).toBeVisible()
  await gaTill(page, 'Hem')
  await expect(page.getByText('Planerat')).toBeVisible()
  await expect(page.getByRole('link', { name: /Magnolian/ })).toBeVisible()

  // Ett tryck gör den verklig och skriver en planterat-post.
  await page.getByRole('link', { name: /Magnolian/ }).click()
  await page.getByRole('button', { name: 'Planterad', exact: true }).click()
  await expect(page.getByTestId('tidslinje').getByText('Planterat')).toBeVisible()
})
