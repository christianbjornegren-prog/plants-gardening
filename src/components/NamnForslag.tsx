import { useEffect, useRef, useState } from 'react'
import { laddaVaxtnamn, sokVaxtnamn, type VaxtNamn } from '../lib/vaxtsok'

/**
 * Namnförslag under ett textfält.
 *
 * Förslagen är ett erbjudande. Det man skrivit sparas alltid som det står —
 * listan kan inte hindra, korrigera eller kräva något. Därför ingen dropdown
 * som stjäl Enter och ingen "välj ur listan"-tvång: bara rader man kan trycka
 * på om man vill slippa stava.
 */
export function NamnForslag({
  fraga,
  onVald,
}: {
  fraga: string
  onVald: (namn: VaxtNamn) => void
}) {
  const [alla, setAlla] = useState<readonly VaxtNamn[]>()
  const [dold, setDold] = useState(false)
  const sistaFraga = useRef(fraga)

  // Listan laddas först när någon börjar skriva — inte i startbunten.
  useEffect(() => {
    if (fraga.trim().length < 2 || alla) return
    let levande = true
    void laddaVaxtnamn().then((n) => {
      if (levande) setAlla(n)
    })
    return () => {
      levande = false
    }
  }, [fraga, alla])

  // Skriver man vidare efter ett val ska förslagen komma tillbaka.
  if (fraga !== sistaFraga.current) {
    sistaFraga.current = fraga
    if (dold) setDold(false)
  }

  if (dold || !alla) return null
  const traffar = sokVaxtnamn(alla, fraga)
  if (traffar.length === 0) return null
  // Har man redan skrivit hela namnet är listan bara en upprepning.
  if (traffar.length === 1 && traffar[0]!.sv.toLowerCase() === fraga.trim().toLowerCase()) return null

  return (
    <ul aria-label="Namnförslag" className="flex flex-col overflow-hidden rounded-xl bg-panel">
      {traffar.map((n) => (
        <li key={`${n.sv}-${n.lat}`}>
          <button
            type="button"
            onClick={() => {
              setDold(true)
              sistaFraga.current = n.sv
              onVald(n)
            }}
            className="flex min-h-11 w-full items-baseline gap-2 px-3 text-left hover:bg-upphojd"
          >
            <span className="shrink-0 text-sm text-tusch">{n.sv}</span>
            <span className="mono min-w-0 flex-1 truncate text-[11px] text-dis-svag italic">
              {n.lat}
            </span>
            <span className="shrink-0 text-[11px] text-dis-svag">{n.kat}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
