import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Layout } from './Layout'
import { NyVaxtContext } from './NyVaxt'

function renderLayout(oppna = vi.fn()) {
  render(
    <NyVaxtContext.Provider value={{ oppna }}>
      <MemoryRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<p>Innehåll</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </NyVaxtContext.Provider>,
  )
  return oppna
}

describe('Layout', () => {
  it('visar alla fyra flikar', () => {
    renderLayout()
    for (const label of ['Hem', 'Ritningen', 'Växter', 'Logg']) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('renderar vyinnehållet', () => {
    renderLayout()
    expect(screen.getByText('Innehåll')).toBeInTheDocument()
  })

  it('+ öppnar ny växt direkt — ingen mellanmeny', async () => {
    const oppna = renderLayout()
    // En i bottenraden (mobil) och en i toppmenyn (desktop).
    const knappar = screen.getAllByRole('button', { name: 'Ny växt' })
    expect(knappar).toHaveLength(2)
    await userEvent.click(knappar[0]!)
    expect(oppna).toHaveBeenCalledTimes(1)
  })

  it('ordnar bottenraden Hem · Ritningen · + · Växter · Logg', () => {
    renderLayout()
    const bottenrad = screen.getAllByRole('navigation')[1]!
    const barn = [...bottenrad.querySelectorAll('a, button')].map(
      (n) => n.textContent || n.getAttribute('aria-label'),
    )
    expect(barn).toEqual(['Hem', 'Ritningen', 'Ny växt', 'Växter', 'Logg'])
  })
})
