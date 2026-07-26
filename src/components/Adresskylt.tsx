/** Adresskylten — en liten emaljskylt i ritningens hörn. */
export function Adresskylt({ stor = false }: { stor?: boolean }) {
  return (
    <div
      data-testid="adresskylt"
      className={`inline-block rounded-md bg-panel ring-1 ring-tra/25 ring-inset ${
        stor ? 'px-5 py-2.5' : 'px-3.5 py-1.5'
      }`}
    >
      <span
        className={`font-display font-semibold tracking-[0.06em] text-tra ${
          stor ? 'text-lg' : 'text-sm'
        }`}
      >
        Ripvägen 11
      </span>
    </div>
  )
}
