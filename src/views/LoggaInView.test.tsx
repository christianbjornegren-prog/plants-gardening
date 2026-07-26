import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoggaInView } from './LoggaInView'

/**
 * Inloggningen är den enda sidan en främling kan nå. Den får inte avslöja
 * adressen — varken i texten eller i fliktiteln.
 */
describe('LoggaInView', () => {
  it('nämner aldrig adressen', () => {
    render(<LoggaInView />)
    expect(document.body.textContent).not.toMatch(/Ripvägen/i)
    expect(document.body.textContent).not.toMatch(/\b11\b/)
  })

  it('skalets serverade titel är neutral', () => {
    // index.html är vad en främling får innan React ens kört.
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    expect(html).toContain('<title>Trädgårdsjournal</title>')
    expect(html).not.toMatch(/Ripvägen/)
  })

  it('erbjuder Google och inga lösenordsfält', () => {
    render(<LoggaInView />)
    expect(screen.getByRole('button', { name: /Logga in med Google/ })).toBeInTheDocument()
    expect(document.querySelectorAll('input[type=password]')).toHaveLength(0)
  })
})
