import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaBortKnapp } from './Knapp'

describe('TaBortKnapp', () => {
  it('kräver två tryck innan borttagningen bekräftas', async () => {
    const anvandare = userEvent.setup()
    const bekraftad = vi.fn()
    render(<TaBortKnapp onBekraftad={bekraftad}>Ta bort växten</TaBortKnapp>)

    const knapp = screen.getByRole('button', { name: 'Ta bort växten' })
    await anvandare.click(knapp)
    expect(bekraftad).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Tryck igen för att ta bort' })).toBeInTheDocument()

    await anvandare.click(screen.getByRole('button', { name: 'Tryck igen för att ta bort' }))
    expect(bekraftad).toHaveBeenCalledTimes(1)
  })

  it('avarmerar efter en stund utan andra trycket', async () => {
    const anvandare = userEvent.setup()
    const bekraftad = vi.fn()
    render(<TaBortKnapp onBekraftad={bekraftad} avarmeraEfterMs={40} />)

    await anvandare.click(screen.getByRole('button', { name: 'Ta bort' }))
    expect(screen.getByRole('button', { name: 'Tryck igen för att ta bort' })).toBeInTheDocument()

    expect(await screen.findByRole('button', { name: 'Ta bort' })).toBeInTheDocument()
    expect(bekraftad).not.toHaveBeenCalled()
  })
})
