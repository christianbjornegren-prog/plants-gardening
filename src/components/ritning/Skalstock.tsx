const STEG = [0.5, 1, 2, 5, 10, 20, 50] as const

/** Största "runda" måttet som blir 50–150 px långt vid nuvarande zoom. */
export function valjSkalsteg(mpp: number): number {
  const passande = STEG.filter((m) => {
    const px = m / mpp
    return px >= 50 && px <= 150
  })
  return passande[passande.length - 1] ?? (mpp > 0.2 ? 50 : 0.5)
}

/**
 * Skalstock och norrpil — fasta, alltid synliga, satta i mono. Två små saker
 * som säger "det här är en ritning" innan man har läst ett enda ord.
 */
export function Skalstock({ mpp }: { mpp: number }) {
  const meter = valjSkalsteg(mpp)
  const bredd = Math.round(meter / mpp)

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-end gap-4">
      <div className="flex flex-col gap-1">
        <svg width={bredd} height={7} aria-hidden className="text-dis">
          <path
            d={`M0.5 0.5 V6.5 M0.5 3.5 H${bredd - 0.5} M${bredd - 0.5} 0.5 V6.5`}
            stroke="currentColor"
            strokeWidth={1}
            fill="none"
          />
        </svg>
        <span className="mono text-[10px] text-dis">
          {String(meter).replace('.', ',')} m
        </span>
      </div>

      <div className="flex flex-col items-center gap-0.5" aria-label="Norr">
        <svg width={13} height={16} aria-hidden className="text-dis">
          <path d="M6.5 1 L11 15 L6.5 11.5 L2 15 Z" fill="currentColor" opacity={0.85} />
        </svg>
        <span className="mono text-[10px] text-dis">N</span>
      </div>
    </div>
  )
}
