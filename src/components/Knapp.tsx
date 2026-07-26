import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primar' | 'sekundar'

function knappStil(variant: Variant): string {
  const grund =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-opacity disabled:opacity-50'
  return variant === 'primar'
    ? `${grund} bg-fermob font-medium text-ljus`
    : `${grund} border border-panel/25 text-panel`
}

export function Knapp({
  variant = 'sekundar',
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} {...rest} className={`${knappStil(variant)} ${className}`} />
}

export function LankKnapp({
  variant = 'sekundar',
  className = '',
  ...rest
}: LinkProps & { variant?: Variant }) {
  return <Link {...rest} className={`${knappStil(variant)} ${className}`} />
}

/** Tvåstegsknapp för borttagning: första trycket armerar, andra bekräftar. */
export function TaBortKnapp({
  onBekraftad,
  children = 'Ta bort',
  avarmeraEfterMs = 4000,
}: {
  onBekraftad: () => void
  children?: ReactNode
  avarmeraEfterMs?: number
}) {
  const [armerad, setArmerad] = useState(false)

  useEffect(() => {
    if (!armerad) return
    const timer = setTimeout(() => setArmerad(false), avarmeraEfterMs)
    return () => clearTimeout(timer)
  }, [armerad, avarmeraEfterMs])

  return (
    <button
      type="button"
      onClick={() => {
        if (armerad) onBekraftad()
        else setArmerad(true)
      }}
      className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm transition-colors ${
        armerad ? 'bg-fermob font-medium text-ljus' : 'border border-fermob/40 text-fermob'
      }`}
    >
      {armerad ? 'Tryck igen för att ta bort' : children}
    </button>
  )
}
