import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Layout } from './Layout'

function renderLayout() {
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<p>Innehåll</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  it('visar alla fyra menyposter', () => {
    renderLayout()
    // Varje post finns två gånger: desktopmeny + mobilmeny
    for (const label of ['Karta', 'Växter', 'Ytor', 'Logg']) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('renderar vyinnehållet', () => {
    renderLayout()
    expect(screen.getByText('Innehåll')).toBeInTheDocument()
  })
})
