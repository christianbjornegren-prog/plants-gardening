import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Chip: både filter (vald/ej vald) och "lägg till fält"-erbjudande.
 * Ifyllda fält visas som rader, tomma erbjuds som chips — se DESIGNLOGG.md.
 */
export function Chip({
  vald = false,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { vald?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={vald}
      {...rest}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm
        transition-colors duration-200 ease-[var(--ease-mjuk)] ${
          vald
            ? 'border-transparent bg-salvia font-medium text-tusch'
            : 'border-linje text-dis hover:border-dis-svag hover:text-tusch'
        } ${className}`}
    />
  )
}

/** Etikett + värde som en rad i ett växt-/platskort. Värden i mono när de mäts. */
export function Uppgift({
  etikett,
  children,
  mono = false,
}: {
  etikett: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-dis-svag">{etikett}</dt>
      <dd className={`text-right text-sm text-tusch ${mono ? 'mono' : ''}`}>{children}</dd>
    </div>
  )
}
