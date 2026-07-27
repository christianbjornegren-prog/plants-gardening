import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

/**
 * Fyra knapproller, definierade på ETT ställe. Regeln de bär upp:
 *
 * - `primar` är soffröd och används till EXAKT EN åtgärd per skärm — den
 *   självklara nästa handlingen. Skalets "Ny växt" är appens röda; en vy får
 *   bara en egen röd när skalet inte syns (ritläget, inloggningen, ark).
 * - `sekundar` är neutral yta med kant: lätt att hitta, lyser inte.
 * - `diskret` är ren text för det som ska finnas men inte synas.
 * - `destruktiv` är diskret text i normal färg. Rött får förekomma först i
 *   bekräftelsesteget — rött är signalfärg, inte "radera".
 *
 * `primar` bär REN vit text — den varma ljus-tonen klarar inte 4,5:1 mot
 * #D3442E (se lib/palett.ts). Regeln vaktas av knapproller.test.tsx och
 * e2e/fargdisciplin.spec.ts.
 */
type Variant = 'primar' | 'sekundar' | 'diskret' | 'destruktiv'

const GRUND =
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm whitespace-nowrap ' +
  'transition-[background-color,opacity] duration-200 ease-[var(--ease-mjuk)] ' +
  'disabled:opacity-40 disabled:pointer-events-none'

function knappStil(variant: Variant): string {
  switch (variant) {
    case 'primar':
      return `${GRUND} bg-fermob font-medium text-white hover:bg-fermob/90`
    case 'sekundar':
      return `${GRUND} border border-linje bg-panel text-tusch hover:bg-upphojd`
    case 'diskret':
      return `${GRUND} text-dis hover:text-tusch`
    case 'destruktiv':
      return (
        'inline-flex min-h-9 items-center text-left text-sm text-dis underline ' +
        'underline-offset-4 hover:text-tusch'
      )
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

/**
 * Tvåstegsknapp för borttagning: första trycket armerar, andra bekräftar.
 * Före armering ser den ut som `destruktiv` — diskret text i normal färg.
 * Först i bekräftelsesteget blir texten röd: det är själva signalen.
 */
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
      className={`min-h-9 text-left text-sm underline underline-offset-4 ${
        armerad ? 'font-medium text-fermob-text' : 'text-dis hover:text-tusch'
      }`}
    >
      {armerad ? 'Tryck igen för att ta bort' : children}
    </button>
  )
}
