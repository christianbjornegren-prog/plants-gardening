import type { SVGProps } from 'react'

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

export function KartaIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <path d="M9 4.5 3.5 6.3v13.2L9 17.7l6 1.8 5.5-1.8V4.5L15 6.3 9 4.5Z" />
      <path d="M9 4.5v13.2M15 6.3v13.2" />
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

export function YtorIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ikonProps(props)}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="M3.5 12h17M12 5.5v13" />
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
