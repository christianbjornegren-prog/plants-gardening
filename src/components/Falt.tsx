import type { ReactNode } from 'react'

export const inmatningsStil =
  'rounded-md border border-panel/25 bg-white px-3 py-2.5 text-base font-normal'

/** Etikett + fält, staplade. Fungerar med input, textarea och select som barn. */
export function Falt({ etikett, children }: { etikett: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {etikett}
      {children}
    </label>
  )
}
