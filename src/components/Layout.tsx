import { NavLink, Outlet } from 'react-router-dom'
import { KartaIkon, LoggIkon, VaxterIkon, YtorIkon } from './Ikoner'
import type { SVGProps } from 'react'

interface NavPost {
  till: string
  label: string
  Ikon: (props: SVGProps<SVGSVGElement>) => ReturnType<typeof KartaIkon>
}

const NAV: NavPost[] = [
  { till: '/', label: 'Karta', Ikon: KartaIkon },
  { till: '/vaxter', label: 'Växter', Ikon: VaxterIkon },
  { till: '/ytor', label: 'Ytor', Ikon: YtorIkon },
  { till: '/logg', label: 'Logg', Ikon: LoggIkon },
]

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Desktop: toppmeny */}
      <header className="hidden items-center justify-between border-b border-panel/10 px-6 py-3 md:flex">
        <NavLink to="/" className="font-display text-lg font-semibold tracking-tight">
          Ripvägen 11
        </NavLink>
        <nav className="flex gap-1" aria-label="Huvudmeny">
          {NAV.map(({ till, label }) => (
            <NavLink
              key={till}
              to={till}
              end={till === '/'}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive ? 'bg-panel text-ljus' : 'text-panel/60 hover:text-panel'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex flex-1 flex-col pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobil: bottenmeny */}
      <nav
        aria-label="Huvudmeny"
        className="fixed inset-x-0 bottom-0 border-t border-panel/10 bg-ljus/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-4">
          {NAV.map(({ till, label, Ikon }) => (
            <NavLink
              key={till}
              to={till}
              end={till === '/'}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 pt-1.5 pb-1"
            >
              {({ isActive }) => (
                <>
                  <Ikon width={22} height={22} className={isActive ? 'text-panel' : 'text-panel/45'} />
                  <span
                    className={`text-[11px] ${isActive ? 'font-medium text-panel' : 'text-panel/45'}`}
                  >
                    {label}
                  </span>
                  <span
                    aria-hidden
                    className={`h-1 w-1 rounded-full ${isActive ? 'bg-fermob' : 'bg-transparent'}`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
