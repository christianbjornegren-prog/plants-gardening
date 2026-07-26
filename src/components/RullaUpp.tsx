import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * React Router behåller scrollpositionen vid sidbyte. Utan detta öppnas ett
 * växtkort mitt i historiken om man kom från en scrollad lista — fototidslinjen
 * hamnar då ovanför skärmkanten, och det är precis den man kom för.
 */
export function RullaUpp() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
