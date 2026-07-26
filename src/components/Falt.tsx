import type { ReactNode } from 'react'

export const inmatningsStil =
  'w-full rounded-lg border border-linje bg-botten px-3 py-2.5 text-base text-ljus ' +
  'placeholder:text-dis-svag focus:border-dis-svag focus:outline-none'

/** Etikett + fält, staplade. Fungerar med input, textarea och select som barn. */
export function Falt({ etikett, children }: { etikett: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-dis">
      {etikett}
      {children}
    </label>
  )
}
