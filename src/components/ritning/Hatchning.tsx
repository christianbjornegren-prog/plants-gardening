/**
 * Hatchmönstren — det som gör skillnad mellan en ritning och en wireframe.
 *
 * Alla mönster ligger i userSpaceOnUse, alltså i VERKLIGA METER. En trall har
 * 14 cm brädor på ritningen därför att den har det i trädgården; zoomar man in
 * blir mönstret större, precis som på papper.
 *
 * Varje material ska gå att känna igen på en meters håll utan etikett: sten är
 * runda klumpar, grus är fint korn, gräs är strån, vatten är vågor.
 */
function ton(token: string, procent: number): string {
  return `color-mix(in srgb, var(--color-${token}) ${procent}%, transparent)`
}

export function Hatchning() {
  return (
    <defs>
      {/* Byggnad: tät 45°-skraffering, ritningskonvention för hus. */}
      <pattern id="h-bygg" patternUnits="userSpaceOnUse" width="0.3" height="0.3">
        <rect width="0.3" height="0.3" fill={ton('panel', 92)} />
        <path
          d="M-0.075 0.075 L0.075 -0.075 M0 0.3 L0.3 0 M0.225 0.375 L0.375 0.225"
          stroke={ton('tra', 26)}
          strokeWidth="0.022"
        />
      </pattern>

      {/* Altantrall: 14 cm brädor med fog och en aning ådring. */}
      <pattern id="h-trall" patternUnits="userSpaceOnUse" width="0.14" height="0.6">
        <rect width="0.14" height="0.6" fill={ton('tra', 17)} />
        <path d="M0 0 V0.6" stroke={ton('tra', 36)} strokeWidth="0.018" />
        <path
          d="M0.07 0.05 v0.18 M0.07 0.34 v0.14"
          stroke={ton('tra', 14)}
          strokeWidth="0.01"
        />
      </pattern>

      {/* Rabatt: mylla med små plantmarkeringar — inte bara prickar. */}
      <pattern id="h-rabatt" patternUnits="userSpaceOnUse" width="0.42" height="0.42">
        <rect width="0.42" height="0.42" fill={ton('orm', 34)} />
        <g stroke={ton('lov', 52)} strokeWidth="0.016" strokeLinecap="round" fill="none">
          <path d="M0.1 0.16 v-0.07 M0.07 0.13 l0.03 0.03 M0.13 0.13 l-0.03 0.03" />
          <path d="M0.31 0.35 v-0.07 M0.28 0.32 l0.03 0.03 M0.34 0.32 l-0.03 0.03" />
        </g>
        <circle cx="0.32" cy="0.1" r="0.015" fill={ton('tra', 34)} />
        <circle cx="0.09" cy="0.33" r="0.012" fill={ton('tra', 26)} />
      </pattern>

      {/* Pallkrage: liggande brädor med synlig ram. */}
      <pattern id="h-pallkrage" patternUnits="userSpaceOnUse" width="0.4" height="0.13">
        <rect width="0.4" height="0.13" fill={ton('tra', 22)} />
        <path d="M0 0 H0.4" stroke={ton('panel', 60)} strokeWidth="0.02" />
        <path d="M0.2 0 V0.13" stroke={ton('panel', 34)} strokeWidth="0.014" />
      </pattern>

      {/* Gräsmatta: strån i par, förskjutna så inga rader bildas. */}
      <pattern id="h-gras" patternUnits="userSpaceOnUse" width="0.34" height="0.34">
        <rect width="0.34" height="0.34" fill={ton('lov', 16)} />
        <g stroke={ton('lov', 50)} strokeWidth="0.015" strokeLinecap="round" fill="none">
          <path d="M0.07 0.12 c0.01 -0.04 0.02 -0.06 0.01 -0.09" />
          <path d="M0.1 0.12 c-0.005 -0.04 -0.01 -0.06 -0.03 -0.08" />
          <path d="M0.24 0.3 c0.01 -0.04 0.02 -0.06 0.01 -0.09" />
          <path d="M0.27 0.3 c-0.005 -0.04 -0.01 -0.06 -0.03 -0.08" />
        </g>
      </pattern>

      {/* Häck: klippt kant sedd uppifrån (kvar för äldre former). */}
      <pattern id="h-hack" patternUnits="userSpaceOnUse" width="0.36" height="0.36">
        <rect width="0.36" height="0.36" fill={ton('orm', 55)} />
        <path
          d="M0 0.27 a0.09 0.09 0 0 1 0.18 0 a0.09 0.09 0 0 1 0.18 0"
          fill="none"
          stroke={ton('lov', 40)}
          strokeWidth="0.02"
        />
      </pattern>

      {/* Träd: krona av överlappande bågar, tätare i mitten. */}
      <pattern id="h-trad" patternUnits="userSpaceOnUse" width="0.66" height="0.66">
        <rect width="0.66" height="0.66" fill={ton('lov', 20)} />
        <g fill="none" stroke={ton('lov', 42)} strokeWidth="0.022" strokeLinecap="round">
          <path d="M0.04 0.42 a0.13 0.13 0 0 1 0.26 0" />
          <path d="M0.3 0.24 a0.13 0.13 0 0 1 0.26 0" />
          <path d="M0.17 0.62 a0.13 0.13 0 0 1 0.26 0" />
        </g>
      </pattern>

      {/* Stenparti: runda klumpar i tre storlekar, som sten ritas på plan. */}
      <pattern id="h-stenparti" patternUnits="userSpaceOnUse" width="0.62" height="0.62">
        <rect width="0.62" height="0.62" fill={ton('upphojd', 90)} />
        <g fill={ton('dis-svag', 30)} stroke={ton('dis', 26)} strokeWidth="0.012">
          <ellipse cx="0.17" cy="0.19" rx="0.1" ry="0.075" />
          <ellipse cx="0.44" cy="0.41" rx="0.075" ry="0.06" />
          <ellipse cx="0.5" cy="0.11" rx="0.05" ry="0.04" />
          <ellipse cx="0.11" cy="0.5" rx="0.055" ry="0.045" />
        </g>
      </pattern>

      {/* Grus: fint korn, tätt och jämnt — en gång ska läsa som en gång. */}
      <pattern id="h-grus" patternUnits="userSpaceOnUse" width="0.16" height="0.16">
        <rect width="0.16" height="0.16" fill={ton('upphojd', 70)} />
        <g fill={ton('tra', 26)}>
          <circle cx="0.03" cy="0.04" r="0.011" />
          <circle cx="0.1" cy="0.02" r="0.008" />
          <circle cx="0.13" cy="0.09" r="0.011" />
          <circle cx="0.06" cy="0.12" r="0.009" />
          <circle cx="0.005" cy="0.1" r="0.007" />
        </g>
      </pattern>

      {/* Vatten: liggande vågor, klassisk kartkonvention. */}
      <pattern id="h-vatten" patternUnits="userSpaceOnUse" width="0.5" height="0.28">
        <rect width="0.5" height="0.28" fill="color-mix(in srgb, var(--color-lov) 12%, var(--color-panel))" />
        <g fill="none" stroke={ton('lov', 40)} strokeWidth="0.018" strokeLinecap="round">
          <path d="M0 0.09 q0.06 -0.05 0.125 0 t0.125 0 t0.125 0 t0.125 0" />
          <path d="M0 0.22 q0.06 -0.05 0.125 0 t0.125 0 t0.125 0 t0.125 0" />
        </g>
      </pattern>

      {/* Annat: gles neutral skraffering. */}
      <pattern id="h-annat" patternUnits="userSpaceOnUse" width="0.34" height="0.34">
        <rect width="0.34" height="0.34" fill={ton('upphojd', 85)} />
        <path d="M0 0.34 L0.34 0" stroke={ton('tra', 16)} strokeWidth="0.018" />
      </pattern>
    </defs>
  )
}
