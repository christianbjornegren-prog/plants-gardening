/**
 * Hatchmönstren — det som gör skillnad mellan en ritning och en wireframe.
 *
 * Alla mönster ligger i userSpaceOnUse, alltså i VERKLIGA METER. En trall har
 * 14 cm brädor på ritningen därför att den har det i trädgården; zoomar man in
 * blir mönstret större, precis som på papper.
 */
export function Hatchning() {
  return (
    <defs>
      {/* Byggnad: tät 45°-skraffering, ritningskonvention för hus. */}
      <pattern id="h-bygg" patternUnits="userSpaceOnUse" width="0.3" height="0.3">
        <rect width="0.3" height="0.3" fill="color-mix(in srgb, var(--color-panel) 92%, transparent)" />
        <path
          d="M-0.075 0.075 L0.075 -0.075 M0 0.3 L0.3 0 M0.225 0.375 L0.375 0.225"
          stroke="color-mix(in srgb, var(--color-tra) 26%, transparent)"
          strokeWidth="0.022"
        />
      </pattern>

      {/* Altantrall: 14 cm brädor med fog. */}
      <pattern id="h-trall" patternUnits="userSpaceOnUse" width="0.14" height="0.14">
        <rect width="0.14" height="0.14" fill="color-mix(in srgb, var(--color-tra) 17%, transparent)" />
        <path
          d="M0 0 V0.14"
          stroke="color-mix(in srgb, var(--color-tra) 34%, transparent)"
          strokeWidth="0.018"
        />
      </pattern>

      {/* Rabatt: fint prickraster i jordton — det ska läsa som mylla. */}
      <pattern id="h-rabatt" patternUnits="userSpaceOnUse" width="0.24" height="0.24">
        <rect width="0.24" height="0.24" fill="color-mix(in srgb, var(--color-orm) 34%, transparent)" />
        <circle cx="0.06" cy="0.06" r="0.017" fill="color-mix(in srgb, var(--color-lov) 45%, transparent)" />
        <circle cx="0.18" cy="0.18" r="0.017" fill="color-mix(in srgb, var(--color-lov) 45%, transparent)" />
        <circle cx="0.18" cy="0.05" r="0.009" fill="color-mix(in srgb, var(--color-tra) 30%, transparent)" />
      </pattern>

      {/* Pallkrage: liggande brädor. */}
      <pattern id="h-pallkrage" patternUnits="userSpaceOnUse" width="0.2" height="0.13">
        <rect width="0.2" height="0.13" fill="color-mix(in srgb, var(--color-tra) 22%, transparent)" />
        <path
          d="M0 0 H0.2"
          stroke="color-mix(in srgb, var(--color-panel) 60%, transparent)"
          strokeWidth="0.02"
        />
      </pattern>

      {/* Gräsmatta: gles stippling, förskjuten så rader inte bildar linjer. */}
      <pattern id="h-gras" patternUnits="userSpaceOnUse" width="0.42" height="0.42">
        <rect width="0.42" height="0.42" fill="color-mix(in srgb, var(--color-lov) 15%, transparent)" />
        <g
          stroke="color-mix(in srgb, var(--color-lov) 42%, transparent)"
          strokeWidth="0.016"
          strokeLinecap="round"
        >
          <path d="M0.08 0.13 v-0.05 M0.3 0.09 v-0.05 M0.19 0.31 v-0.05 M0.37 0.35 v-0.05" />
        </g>
      </pattern>

      {/* Häck: små bågar, som en klippt kant sedd uppifrån. */}
      <pattern id="h-hack" patternUnits="userSpaceOnUse" width="0.36" height="0.36">
        <rect width="0.36" height="0.36" fill="color-mix(in srgb, var(--color-orm) 55%, transparent)" />
        <path
          d="M0 0.27 a0.09 0.09 0 0 1 0.18 0 a0.09 0.09 0 0 1 0.18 0"
          fill="none"
          stroke="color-mix(in srgb, var(--color-lov) 40%, transparent)"
          strokeWidth="0.02"
        />
      </pattern>

      {/* Träd: krona med tätare bågar. */}
      <pattern id="h-trad" patternUnits="userSpaceOnUse" width="0.5" height="0.5">
        <rect width="0.5" height="0.5" fill="color-mix(in srgb, var(--color-lov) 20%, transparent)" />
        <g
          fill="none"
          stroke="color-mix(in srgb, var(--color-lov) 38%, transparent)"
          strokeWidth="0.022"
          strokeLinecap="round"
        >
          <path d="M0.05 0.4 a0.12 0.12 0 0 1 0.24 0" />
          <path d="M0.26 0.18 a0.12 0.12 0 0 1 0.24 0" />
        </g>
      </pattern>

      {/* Annat: gles neutral skraffering. */}
      <pattern id="h-annat" patternUnits="userSpaceOnUse" width="0.34" height="0.34">
        <rect width="0.34" height="0.34" fill="color-mix(in srgb, var(--color-upphojd) 85%, transparent)" />
        <path
          d="M0 0.34 L0.34 0"
          stroke="color-mix(in srgb, var(--color-tra) 16%, transparent)"
          strokeWidth="0.018"
        />
      </pattern>
    </defs>
  )
}
