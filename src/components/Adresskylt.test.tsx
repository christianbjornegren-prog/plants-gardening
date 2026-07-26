import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Adresskylt } from './Adresskylt'

describe('Adresskylt', () => {
  it('visar adressen', () => {
    render(<Adresskylt />)
    expect(screen.getByText('Ripvägen 11')).toBeInTheDocument()
  })
})
