import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TillbakaIkon } from './Ikoner'

export function VyHuvud({
  titel,
  tillbakaTill,
  hoger,
}: {
  titel: string
  tillbakaTill?: string
  hoger?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-center gap-2">
      {tillbakaTill && (
        <Link
          to={tillbakaTill}
          aria-label="Tillbaka"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-md text-panel/70"
        >
          <TillbakaIkon />
        </Link>
      )}
      <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-semibold">{titel}</h1>
      {hoger}
    </div>
  )
}

/** Vy för saker som inte längre finns (t.ex. efter borttagning). */
export function SaknasVy({ text, tillbakaTill }: { text: string; tillbakaTill: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl p-5 md:p-8">
      <p className="mt-10 text-center text-panel/60">{text}</p>
      <p className="mt-4 text-center">
        <Link to={tillbakaTill} className="text-orm underline underline-offset-2">
          Tillbaka
        </Link>
      </p>
    </div>
  )
}
