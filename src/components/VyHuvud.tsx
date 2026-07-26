import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TillbakaIkon } from './Ikoner'

export function VyHuvud({
  titel,
  underrubrik,
  tillbakaTill,
  hoger,
}: {
  titel: string
  underrubrik?: ReactNode
  tillbakaTill?: string
  hoger?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-center gap-2">
      {tillbakaTill && (
        <Link
          to={tillbakaTill}
          aria-label="Tillbaka"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-dis hover:text-ljus"
        >
          <TillbakaIkon />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {/* Två rader hellre än avhugget namn — "Hortensian vid boden" ska få plats. */}
        <h1 className="line-clamp-2 font-display text-xl/tight font-semibold text-balance text-ljus sm:text-2xl">
          {titel}
        </h1>
        {underrubrik && <p className="mt-1 truncate text-sm text-dis">{underrubrik}</p>}
      </div>
      {hoger}
    </div>
  )
}

/** Vy för saker som inte längre finns (t.ex. efter borttagning). */
export function SaknasVy({ text, tillbakaTill }: { text: string; tillbakaTill: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl p-5 md:p-8">
      <p className="mt-10 text-center text-dis">{text}</p>
      <p className="mt-4 text-center">
        <Link to={tillbakaTill} className="text-lov underline underline-offset-4">
          Tillbaka
        </Link>
      </p>
    </div>
  )
}

/** Tomma vyer är inbjudningar, aldrig bara tomt. Se CLAUDE.md. */
export function TomtLage({
  rubrik,
  text,
  atgard,
}: {
  rubrik: string
  text: string
  atgard?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h2 className="font-display text-lg font-semibold text-ljus">{rubrik}</h2>
      <p className="max-w-xs text-sm/6 text-dis">{text}</p>
      {atgard && <div className="mt-2">{atgard}</div>}
    </div>
  )
}
