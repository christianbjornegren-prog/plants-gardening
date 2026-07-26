import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Knapp, LankKnapp, TaBortKnapp } from './Knapp'

/**
 * Färgdisciplinen: soffröd är signalfärg och tillhör rollen `primar` — ingen
 * annan. En destruktiv åtgärd får bli röd först i bekräftelsesteget.
 */
describe('knapproller och signalfärgen', () => {
  it('bara primar bär signalfärgen', () => {
    render(
      <>
        <Knapp variant="primar">Röd</Knapp>
        <Knapp variant="sekundar">Kantad</Knapp>
        <Knapp variant="diskret">Text</Knapp>
        <Knapp variant="destruktiv">Ta bort</Knapp>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Röd' }).className).toContain('fermob')
    for (const namn of ['Kantad', 'Text', 'Ta bort']) {
      expect(screen.getByRole('button', { name: namn }).className).not.toContain('fermob')
    }
  })

  it('länkknappar följer samma roller', () => {
    render(
      <MemoryRouter>
        <LankKnapp to="/x" variant="primar">
          Röd länk
        </LankKnapp>
        <LankKnapp to="/y">Neutral länk</LankKnapp>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Röd länk' }).className).toContain('fermob')
    expect(screen.getByRole('link', { name: 'Neutral länk' }).className).not.toContain('fermob')
  })

  it('destruktiv roll är diskret text, inte en lysande yta', () => {
    render(<Knapp variant="destruktiv">Ta bort platsen</Knapp>)
    const knapp = screen.getByRole('button', { name: 'Ta bort platsen' })
    expect(knapp.className).toContain('underline')
    expect(knapp.className).not.toContain('bg-')
  })

  it('TaBortKnapp är utan signalfärg tills den armerats', async () => {
    const anvandare = userEvent.setup()
    render(<TaBortKnapp onBekraftad={vi.fn()}>Ta bort växten</TaBortKnapp>)

    const fore = screen.getByRole('button', { name: 'Ta bort växten' })
    expect(fore.className).not.toContain('fermob')

    await anvandare.click(fore)
    // Bekräftelsesteget: nu — och först nu — får rött förekomma.
    const armerad = screen.getByRole('button', { name: 'Tryck igen för att ta bort' })
    expect(armerad.className).toContain('fermob')
  })
})
