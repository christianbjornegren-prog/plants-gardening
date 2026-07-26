import type { SVGProps } from 'react'

/**
 * Handritade 24×24 stroke-ikoner (1,75 pt, runda ändar) i stället för ett
 * ikonbibliotek — matchar tuschkänslan och håller bundlen ren.
 */
function ikonProps(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }
}

export function HemIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5.5H9V20H5a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  )
}

export function RitningIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M3.5 14h6.5v5.5M10 4.5V10h10.5" />
    </svg>
  )
}

export function VaxterIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="M12 20.5v-7" />
      <path d="M12 13.5C12 9.9 9.1 7 5.5 7H4.5v.5C4.5 11.1 7.4 14 11 14h1" />
      <path d="M12 12c0-3 2.5-5.5 5.5-5.5h2v.5c0 3-2.5 5.5-5.5 5.5H12" />
    </svg>
  )
}

export function LoggIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
    </svg>
  )
}

export function PlatsIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="M12 20.5s6.5-5.4 6.5-10a6.5 6.5 0 1 0-13 0c0 4.6 6.5 10 6.5 10Z" />
      <circle cx="12" cy="10.2" r="2.4" />
    </svg>
  )
}

export function DroppeIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="M12 3.8c3.4 4.1 5.3 6.9 5.3 9.3a5.3 5.3 0 1 1-10.6 0c0-2.4 1.9-5.2 5.3-9.3Z" />
    </svg>
  )
}

export function GodselIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="M12 4v5M8.5 6.5 10 10M15.5 6.5 14 10" />
      <path d="M4.5 17.5c2.4-2 5-2 7.5 0s5.1 2 7.5 0" />
    </svg>
  )
}

export function SaxIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <circle cx="6" cy="7" r="2.3" />
      <circle cx="6" cy="17" r="2.3" />
      <path d="M7.9 8.3 19 19M7.9 15.7 19 5" />
    </svg>
  )
}

export function KameraIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="M4.5 8.5A1.5 1.5 0 0 1 6 7h2l1.3-2h5.4L16 7h2a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 18 19H6a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  )
}

export function PennaIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="m4.5 19.5 1.2-3.6L17 4.6a1.7 1.7 0 0 1 2.4 2.4L8.1 18.3l-3.6 1.2Z" />
    </svg>
  )
}

export function PlusIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function TillbakaIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </svg>
  )
}

export function KryssIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function SokIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

export function SolIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  )
}

export function PilIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="m9 5.5 6.5 6.5L9 18.5" />
    </svg>
  )
}
