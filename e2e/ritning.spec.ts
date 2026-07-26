import { expect, test } from '@playwright/test'
import {
  angeMatt,
  gaTill,
  gorBild,
  lamnaRitlage,
  nyVaxt,
  oppnaFlerDetaljer,
  oppnaRitlage,
  ritaPlats,
  tryckIRitningen,
  tryckIYta,
} from './hjalp'

const RUTA: [number, number][] = [
  [0.2, 0.3],
  [0.7, 0.3],
  [0.7, 0.75],
  [0.2, 0.75],
]

test('varje trädgård har sin egen ritning — Inomhus har ingen', async ({ page }) => {
  await angeMatt(page, 'Baksidan', '16', '11')
  await lamnaRitlage(page)

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
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten vid staketet')

    await expect(page.getByRole('textbox', { name: 'Namn' })).toHaveValue('Rabatten vid staketet')
    await expect(page.locator('[data-plats-id]')).toHaveCount(1)

    await page.getByRole('link', { name: 'Tillbaka till ritningen' }).click()
    await expect(page.locator('[data-plats-id]')).toHaveCount(1)
  })

  test('en plats kan markeras som planerad och ritas då streckad', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Nya rabatten')

    await oppnaFlerDetaljer(page)
    await page.getByRole('button', { name: 'Planerad' }).click()
    await expect(page.locator('[data-plats-id]').first()).toHaveAttribute('stroke-dasharray', '7 5')
  })

  test('kuben: en växt utan position kan sättas ut från ritläget', async ({ page }) => {
    await page.goto('/')
    await nyVaxt(page, 'Hortensian')
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')

    await expect(page.getByRole('button', { name: 'Hortensian' })).toBeVisible()
    await page.getByRole('button', { name: 'Hortensian' }).click()
    await expect(page.getByRole('button', { name: 'Hortensian' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await tryckIYta(page, 'ritredigering', 0.45, 0.5)
    await expect(page.locator('[data-vaxt-id]')).toHaveCount(1)
  })

  test('platsen kan tas bort — växterna där blir hemlösa, inte raderade', async ({ page }) => {
    await page.goto('/')
    await nyVaxt(page, 'Hortensian')
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')
    await page.getByRole('button', { name: 'Hortensian' }).click()
    await tryckIYta(page, 'ritredigering', 0.45, 0.5)
    await expect(page.locator('[data-vaxt-id]')).toHaveCount(1)

    await tryckIYta(page, 'ritredigering', 0.3, 0.35)
    await oppnaFlerDetaljer(page)
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
  await oppnaRitlage(page)
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
  await oppnaRitlage(page)
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
  await oppnaRitlage(page)
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

test.describe('ritläget — kurvor, ångra och klar', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'ritläget är desktop-först')

  test('ett hörn kan rundas — så blir en rabatt D-formad', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')

    const form = page.locator('[data-plats-id]').first()
    // Spetsig form ritas med raka linjer.
    expect(await form.getAttribute('d')).not.toContain('C')

    await page.getByRole('button', { name: 'Runda alla' }).click()
    await expect.poll(async () => (await form.getAttribute('d')) ?? '').toContain('C')

    // …och tillbaka igen.
    await page.getByRole('button', { name: 'Gör alla spetsiga' }).click()
    await expect.poll(async () => ((await form.getAttribute('d')) ?? '').includes('C')).toBe(false)
  })

  test('ångra tar tillbaka en borttagen plats', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')
    await expect(page.locator('[data-plats-id]')).toHaveCount(1)

    await oppnaFlerDetaljer(page)
    await page.getByRole('button', { name: 'Ta bort platsen' }).click()
    await page.getByRole('button', { name: 'Tryck igen för att ta bort' }).click()
    await expect(page.locator('[data-plats-id]')).toHaveCount(0)

    await expect(page.getByRole('button', { name: 'Ångra', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Ångra', exact: true }).click()
    await expect(page.locator('[data-plats-id]')).toHaveCount(1)
  })

  test('ångra är avstängd innan något gjorts', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await expect(page.getByRole('button', { name: 'Ångra' })).toBeDisabled()
  })

  test('ritläget är tydligt märkt och har en Klar-knapp', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await expect(page.getByText('Ritläge')).toBeVisible()

    await page.getByRole('button', { name: 'Klar' }).click()
    await expect(page).toHaveURL(/\/ritning$/)
    await expect(page.getByText('Ritläge')).toHaveCount(0)
  })

  test('ritläget får inte tvinga fram sidscroll', async ({ page }) => {
    // Scrollar sidan hoppar ritytan under handen medan man ritar.
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')
    const overskott = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    )
    expect(overskott).toBeLessThanOrEqual(1)
  })
})

test('platsens ark listar växterna som står där', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await nyVaxt(page, 'Pionen')
  await angeMatt(page, 'Baksidan', '16', '11')
  await oppnaRitlage(page)
  await ritaPlats(page, RUTA, 'Rabatten')
  await page.getByRole('button', { name: 'Pionen' }).click()
  await tryckIYta(page, 'ritredigering', 0.45, 0.5)
  await expect(page.locator('[data-vaxt-id]')).toHaveCount(1)

  await page.getByRole('button', { name: 'Klar' }).click()
  await tryckIRitningen(page, 0.35, 0.4)
  await expect(page.getByRole('heading', { name: 'Växter här' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pionen' })).toBeVisible()
})

test('en ny ritning kan läggas till bredvid nuläget', async ({ page }) => {
  await angeMatt(page, 'Baksidan', '16', '11')
  await lamnaRitlage(page)

  await page.getByRole('button', { name: '+ Ny ritning' }).click()
  await page.getByRole('textbox', { name: 'Namn' }).fill('Baksidan kommande')
  await page.getByRole('button', { name: 'Skapa ritningen' }).click()

  await expect(page.getByRole('button', { name: 'Baksidan kommande' })).toBeVisible()
  // Måtten ärvs från den man stod på, så man slipper mäta om.
  await expect(page.getByTestId('tomtgrans')).toBeVisible()
})

test.describe('platstyper', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'ritläget är desktop-först')

  test('häck erbjuds inte, och egen typ går att skriva in', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '16', '11')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Bakom boden')

    await expect(page.getByRole('button', { name: 'Häck', exact: true })).toHaveCount(0)
    // …men de nya materialen finns.
    for (const typ of ['Stenparti', 'Grus', 'Vatten']) {
      await expect(page.getByRole('button', { name: typ, exact: true })).toBeVisible()
    }

    await page.getByRole('button', { name: 'Egen…' }).click()
    await page.getByRole('textbox', { name: 'Egen typ' }).fill('Kompost')
    await page.getByRole('textbox', { name: 'Egen typ' }).blur()

    // Chipen visar det egna namnet.
    await expect(page.getByRole('button', { name: 'Kompost' })).toBeVisible()

    // …och namnet följer med till platsens ark i läsläget.
    await page.getByRole('button', { name: 'Klar' }).click()
    await tryckIRitningen(page, 0.35, 0.4)
    await expect(page.getByText('Kompost', { exact: true })).toBeVisible()
  })
})

test('loggens filter kapas inte — de radbryter', async ({ page }) => {
  await page.goto('/logg')
  await page.getByRole('button', { name: 'Alla slag' }).waitFor()
  const overflow = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('button')].filter((b) =>
      ['Anteckning', 'Flyttat'].includes(b.textContent?.trim() ?? ''),
    )
    return chips.map((c) => {
      const r = c.getBoundingClientRect()
      return r.right <= window.innerWidth + 1 && r.left >= -1
    })
  })
  expect(overflow.length).toBeGreaterThan(0)
  expect(overflow.every(Boolean)).toBe(true)
})

test.describe('mätverktyg och area', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'ritläget är desktop-först')

  test('area och omkrets räknas ut åt en', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '20', '20')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')

    // Area och omkrets syns utan att man behöver scrolla i panelen.
    await expect(page.getByText('Area')).toBeVisible()
    await expect(page.getByText('Omkrets')).toBeVisible()
    await expect(page.getByText(/m²/)).toBeVisible()
  })

  test('måttbandet mäter mellan två punkter', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '20', '20')
    await oppnaRitlage(page)

    await page.getByRole('button', { name: 'Mät', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Sluta mäta' })).toBeVisible()

    await tryckIYta(page, 'ritredigering', 0.3, 0.5)
    await tryckIYta(page, 'ritredigering', 0.6, 0.5)
    await expect(
      page
        .locator('text')
        .filter({ hasText: /^\d+(,\d)? m$/ })
        .first(),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Sluta mäta' }).click()
    await expect(page.getByRole('button', { name: 'Mät', exact: true })).toBeVisible()
  })
})

test('två ritningar med samma mått går att lägga över varandra', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await angeMatt(page, 'Baksidan', '16', '11')
  await oppnaRitlage(page)
  await ritaPlats(page, RUTA, 'Rabatten')
  await page.getByRole('button', { name: 'Klar' }).click()

  await page.getByRole('button', { name: '+ Ny ritning' }).click()
  await page.getByRole('textbox', { name: 'Namn' }).fill('Baksidan kommande')
  await page.getByRole('button', { name: 'Skapa ritningen' }).click()

  // Nu står vi på den nya ritningen och kan lägga den gamla under som spöke.
  // Jämförelsen är utfälld vid behov, inte en permanent rad.
  await page.getByRole('button', { name: 'Jämför med en annan ritning' }).click()
  await page.getByRole('button', { name: 'Baksidan', exact: true }).last().click()
  await expect(page.locator('g[aria-hidden] path[stroke-dasharray]').first()).toBeVisible()
})

test.describe('namngivning av nya former', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'ritläget är desktop-först')

  test('namnen krockar inte efter en borttagning', async ({ page }) => {
    // Regression: namnet räknade förut hur många former som fanns, så numret
    // återanvändes efter en radering och två former hette "Rabatt 2".
    await angeMatt(page, 'Baksidan', '20', '20')
    await oppnaRitlage(page)

    await ritaPlats(
      page,
      [
        [0.1, 0.1],
        [0.3, 0.1],
        [0.3, 0.3],
        [0.1, 0.3],
      ],
      '',
    )
    await ritaPlats(
      page,
      [
        [0.4, 0.1],
        [0.6, 0.1],
        [0.6, 0.3],
        [0.4, 0.3],
      ],
      '',
    )

    await tryckIYta(page, 'ritredigering', 0.2, 0.2)
    await oppnaFlerDetaljer(page)
    await page.getByRole('button', { name: 'Ta bort platsen' }).click()
    await page.getByRole('button', { name: 'Tryck igen för att ta bort' }).click()
    await expect(page.locator('[data-plats-id]')).toHaveCount(1)

    await ritaPlats(
      page,
      [
        [0.7, 0.1],
        [0.9, 0.1],
        [0.9, 0.3],
        [0.7, 0.3],
      ],
      '',
    )

    const namn = await page.evaluate(() =>
      [...document.querySelectorAll('svg text')].map((n) => n.textContent ?? ''),
    )
    expect(namn).toHaveLength(2)
    expect(new Set(namn).size).toBe(2)
  })
})

test.describe('ett hörn betyder en sak', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'ritläget är desktop-först')

  test('hörnknappar syns först när ett hörn är markerat', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '20', '20')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')

    // Inga permanenta knappar som skräpar ner formen.
    await expect(page.getByTestId('hornknappar')).toHaveCount(0)

    const horn = page.locator('[data-horn-index="0"]')
    await horn.click()
    const knappar = page.getByTestId('hornknappar')
    await expect(knappar).toBeVisible()
    await expect(knappar.getByRole('button', { name: 'Runda' })).toBeVisible()
    await expect(knappar.getByRole('button', { name: 'Ta bort' })).toBeVisible()

    // Klick igen avmarkerar.
    await horn.click()
    await expect(page.getByTestId('hornknappar')).toHaveCount(0)
  })

  test('Runda växlar hörnet fram och tillbaka', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '20', '20')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')

    const form = page.locator('[data-plats-id]').first()
    const knappar = page.getByTestId('hornknappar')
    await page.locator('[data-horn-index="0"]').click()
    await knappar.getByRole('button', { name: 'Runda' }).click()
    await expect.poll(async () => ((await form.getAttribute('d')) ?? '').includes('C')).toBe(true)

    await expect(knappar.getByRole('button', { name: 'Gör spetsig' })).toBeVisible()
    await knappar.getByRole('button', { name: 'Gör spetsig' }).click()
    await expect.poll(async () => ((await form.getAttribute('d')) ?? '').includes('C')).toBe(false)
  })

  test('Ta bort tar bort hörnet, men aldrig under tre', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '20', '20')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')

    await expect(page.locator('[data-horn-index]')).toHaveCount(4)
    const knappar = page.getByTestId('hornknappar')
    await page.locator('[data-horn-index="0"]').click()
    await knappar.getByRole('button', { name: 'Ta bort' }).click()
    await expect(page.locator('[data-horn-index]')).toHaveCount(3)

    // Kvar är en triangel — då ska knappen vara avstängd.
    await page.locator('[data-horn-index="0"]').click()
    await expect(knappar.getByRole('button', { name: 'Ta bort' })).toBeDisabled()
  })

  test('klick på en kant lägger till ett hörn', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '20', '20')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')

    await expect(page.locator('[data-horn-index]')).toHaveCount(4)
    await page.locator('[data-kant-index="0"]').click({ force: true })
    await expect(page.locator('[data-horn-index]')).toHaveCount(5)
    // Det nya hörnet blir markerat direkt, så man kan runda det på en gång.
    await expect(page.getByTestId('hornknappar')).toBeVisible()
  })

  test('kanterna är inte klickbara förrän formen är markerad', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '20', '20')
    await oppnaRitlage(page)
    await ritaPlats(page, RUTA, 'Rabatten')
    // Avmarkera genom att klicka utanför formen. Uppe till höger — nere i
    // mitten ligger kvittenserna, och de tar klicket.
    await tryckIYta(page, 'ritredigering', 0.9, 0.08)
    await expect(page.locator('[data-kant-index]')).toHaveCount(0)
    await expect(page.locator('[data-horn-index]')).toHaveCount(0)
  })
})

test.describe('ritläget är tyst', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'ritläget är desktop-först')

  test('ingen instruktionsrad, och bara en röd knapp', async ({ page }) => {
    await angeMatt(page, 'Baksidan', '20', '20')
    await oppnaRitlage(page)
    await page.getByRole('button', { name: 'Rita ny plats' }).waitFor()

    // Den fyra satser långa instruktionsraden är borta.
    await expect(page.getByText(/klicka ett hörn för att runda/)).toHaveCount(0)

    const roda = await page.evaluate(
      () =>
        [...(document.querySelector('main')?.querySelectorAll('button') ?? [])].filter((b) =>
          b.className.includes('bg-fermob'),
        ).length,
    )
    expect(roda).toBe(1)
    await expect(page.getByRole('button', { name: 'Rita ny plats' })).toBeVisible()
  })
})
