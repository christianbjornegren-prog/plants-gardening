import { expect, test } from '@playwright/test'
import { angeMatt, gaTill, oppnaRitlage, ritaPlats } from './hjalp'

/**
 * Solen: skuggor och soltimmar ur ritningens verkliga mått.
 * Tiden i testerna sätts alltid via reglaget — klockan på väggen får inte
 * avgöra om ett test ser sol eller natt.
 */

const RUTA: [number, number][] = [
  [0.2, 0.25],
  [0.55, 0.25],
  [0.55, 0.7],
  [0.2, 0.7],
]

test('utan ritning bjuder Solen in i stället för att spärra', async ({ page }) => {
  await page.goto('/solen')
  await expect(page.getByRole('heading', { name: 'Solen behöver en ritning' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Öppna ritningen' })).toBeVisible()
})

test('öppnar med skuggläget, reglagen och en enda lugn norr-uppmaning', async ({ page }) => {
  await angeMatt(page, 'Baksidan', '16', '11')
  await gaTill(page, 'Solen')

  await expect(page.getByTestId('solyta')).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Tid på dygnet' })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Dag på året' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Spela dygnet' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Skuggor nu' })).toBeVisible()

  // Norr saknas: EN banner med en direkt väg — ingen wizard.
  await expect(page.getByText(/Skuggorna gissar att norr är uppåt/)).toBeVisible()

  // Mitt på dagen är solen uppe: indikatorn syns och natten är borta.
  await page.getByRole('slider', { name: 'Tid på dygnet' }).fill('720')
  await expect(page.getByText('12:00')).toBeVisible()
  await expect(page.getByTestId('solindikator')).toBeVisible()
  await expect(page.getByText('Solen är nere')).toHaveCount(0)

  // Mitt i natten: hela ritningen i skugga, sagt med ord.
  await page.getByRole('slider', { name: 'Tid på dygnet' }).fill('120')
  await expect(page.getByText('Solen är nere')).toBeVisible()
})

test('norrvinkeln anges via kompassen och uppmaningen försvinner', async ({ page }) => {
  await angeMatt(page, 'Baksidan', '16', '11')
  await gaTill(page, 'Solen')

  await page.getByRole('button', { name: 'Ange norr' }).click()
  const kompass = page.getByRole('slider', { name: 'Norrvinkel' })
  await expect(kompass).toBeVisible()
  await kompass.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByText(/Skuggorna gissar att norr är uppåt/)).toHaveCount(0)
})

test.describe('med en ritad plats', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'formen ritas i desktop-ritläget')

  test('en plats med höjd kastar skugga, och platsen visar sina soltimmar', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Boden', 'Bod')
    await gaTill(page, 'Solen')
    await page.getByRole('slider', { name: 'Tid på dygnet' }).fill('720')

    // Utan höjd: ingen skugga att räkna med. Sätt höjden i underlaget.
    await page.getByRole('button', { name: 'Justera underlaget' }).click()
    await page.getByRole('textbox', { name: 'Höjd för Boden' }).fill('2,5')
    await page.getByRole('textbox', { name: 'Höjd för Boden' }).blur()

    // Soltimmar för platsen: tryck på den i ritningen.
    await page.locator('[data-plats-id]').first().click()
    await expect(page.getByText(/h sol i dag/)).toBeVisible()
    await expect(page.getByText(/15 apr/)).toBeVisible()
    await expect(page.getByText(/15 jun/)).toBeVisible()
    await expect(page.getByText(/15 sep/)).toBeVisible()

    // Växeln: soltimmar hela dagen med dagens max i teckenförklaringen.
    await page.getByRole('button', { name: 'Soltimmar i dag' }).click()
    await expect(page.getByText(/dagens max/)).toBeVisible()
  })

  test('en skuggkälla utanför tomten ritas, namnges och listas', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await gaTill(page, 'Solen')
    await page.getByRole('slider', { name: 'Tid på dygnet' }).fill('720')

    await page.getByRole('button', { name: 'Justera underlaget' }).click()
    await page.getByRole('button', { name: 'Rita skuggkälla' }).click()

    // Dra en rektangel i ritytan.
    const yta = page.getByTestId('solyta')
    const box = (await yta.boundingBox())!
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.32, { steps: 5 })
    await page.mouse.up()

    await page.getByRole('textbox', { name: 'Vad skuggar?' }).fill('Grannens hus')
    await page.getByRole('textbox', { name: 'Höjd (m)' }).fill('6')
    await page.getByRole('button', { name: 'Spara skuggkällan' }).click()

    // Källan listas i underlaget och står med namn i ritningen.
    await expect(page.getByRole('textbox', { name: 'Höjd för Grannens hus' })).toBeVisible()
    await expect(page.getByTestId('solyta').getByText('GRANNENS HUS')).toBeVisible()
  })
})

test('degraderar snyggt: utan höjder visas soltimmar för fri yta', async ({ page }) => {
  await angeMatt(page, 'Baksidan', '16', '11')
  await gaTill(page, 'Solen')
  await page.getByRole('button', { name: 'Soltimmar i dag' }).click()
  // Inga skuggare alls — kartan visar hela dagens sol, inget felmeddelande.
  await expect(page.getByText(/dagens max/)).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
