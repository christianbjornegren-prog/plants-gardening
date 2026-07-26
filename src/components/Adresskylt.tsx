/** Adresskylten — mörk panel, ljus text, som en liten emaljskylt. */
export function Adresskylt({ stor = false }: { stor?: boolean }) {
  return (
    <div
      data-testid="adresskylt"
      className={`inline-block rounded-md bg-panel text-ljus shadow-sm ring-1 ring-ljus/20 ring-inset ${
        stor ? 'px-5 py-2.5' : 'px-3.5 py-1.5'
      }`}
    >
      <span
        className={`font-display font-semibold tracking-[0.06em] ${stor ? 'text-lg' : 'text-sm'}`}
      >
        Ripvägen 11
      </span>
    </div>
  )
}
