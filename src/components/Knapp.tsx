import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

/**
 * Tre varianter, inte fler. `primar` bär fermob-fyllning och REN vit text —
 * den varma ljus-tonen klarar inte 4,5:1 mot #D3442E (se lib/palett.ts).
 */
type Variant = 'primar' | 'sekundar' | 'tyst'

const GRUND =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm ' +
  'transition-[background-color,opacity] duration-200 ease-[var(--ease-mjuk)] ' +
  'disabled:opacity-40 disabled:pointer-events-none'

function knappStil(variant: Variant): string {
  switch (variant) {
    case 'primar':
      return `${GRUND} bg-fermob font-medium text-white hover:bg-fermob/90`
    case 'sekundar':
      return `${GRUND} border border-linje bg-panel text-tusch hover:bg-upphojd`
    case 'tyst':
      return `${GRUND} text-dis hover:text-tusch`
  }
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
      onClick={() => (armerad ? onBekraftad() : setArmerad(true))}
      className={`${GRUND} ${
        armerad
          ? 'bg-fermob font-medium text-white'
          : 'border border-fermob-text/45 text-fermob-text hover:bg-fermob-text/10'
      }`}
    >
      {armerad ? 'Tryck igen för att ta bort' : children}
    </button>
  )
}
