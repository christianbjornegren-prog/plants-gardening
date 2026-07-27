import { useEffect, type SVGProps } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { HemIkon, LoggIkon, PlusIkon, RitningIkon, SolIkon, VaxterIkon } from './Ikoner'
import { useNyVaxt } from './NyVaxt'

interface NavPost {
  till: string
  label: string
  Ikon: (props: SVGProps<SVGSVGElement>) => React.ReactElement
}

/** Fyra flikar. `+` ligger i mitten av bottenraden och gör EN sak: ny växt. */
const VANSTER: NavPost[] = [
  { till: '/', label: 'Hem', Ikon: HemIkon },
  { till: '/ritning', label: 'Ritningen', Ikon: RitningIkon },
  { till: '/solen', label: 'Solen', Ikon: SolIkon },
]
const HOGER: NavPost[] = [
  { till: '/vaxter', label: 'Växter', Ikon: VaxterIkon },
  { till: '/logg', label: 'Logg', Ikon: LoggIkon },
]
const ALLA = [...VANSTER, ...HOGER]

function Flik({ till, label, Ikon }: NavPost) {
  return (
    <NavLink
      to={till}
      end={till === '/'}
      className="flex min-h-14 flex-col items-center justify-center gap-1 pt-1.5 pb-1"
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200 ease-[var(--ease-mjuk)] ${
              isActive ? 'bg-salvia' : ''
            }`}
          >
            <Ikon width={20} height={20} className={isActive ? 'text-orm' : 'text-dis-svag'} />
          </span>
          <span className={`text-[11px] ${isActive ? 'font-medium text-tusch' : 'text-dis-svag'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export function Layout() {
  const { oppna } = useNyVaxt()
  const iRitlage = useLocation().pathname.startsWith('/ritning/rita')

  // Skalets titel är neutral (index.html) så att inloggningssidan inte
  // skvallrar om adressen. Väl inne får fliken sitt riktiga namn.
  useEffect(() => {
    document.title = 'Ripvägen 11'
  }, [])

  return (
    <div className="flex min-h-dvh flex-col bg-botten">
      {/* Desktop: toppmeny */}
      <header className="hidden items-center gap-6 border-b border-linje px-6 py-3 md:flex">
        <NavLink to="/" className="font-display text-lg font-semibold tracking-tight text-tusch">
          Ripvägen 11
        </NavLink>
        <nav className="flex gap-1" aria-label="Huvudmeny">
          {ALLA.map(({ till, label }) => (
            <NavLink
              key={till}
              to={till}
              end={till === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 ease-[var(--ease-mjuk)] ${
                  isActive ? 'bg-salvia text-tusch' : 'text-dis hover:text-tusch'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        {/* Ritläget har sin egen röda knapp. Två röda på samma skärm gör att
            ingen av dem betyder något. */}
        {!iRitlage && (
          <button
            type="button"
            onClick={() => oppna()}
            className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg bg-fermob px-4 text-sm font-medium text-white transition-colors duration-200 ease-[var(--ease-mjuk)] hover:bg-fermob/90"
          >
            <PlusIkon width={18} height={18} />
            Ny växt
          </button>
        )}
      </header>

      <main className="flex flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      {/* Mobil: bottenrad med fem platser, + i mitten */}
      <nav
        aria-label="Huvudmeny"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-linje bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid grid-cols-6 items-center">
          {VANSTER.map((post) => (
            <Flik key={post.till} {...post} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => oppna()}
              aria-label="Ny växt"
              className="-mt-6 flex size-14 items-center justify-center rounded-full bg-fermob text-white shadow-lg shadow-tusch/20 ring-4 ring-botten transition-transform duration-200 ease-[var(--ease-mjuk)] active:scale-95"
            >
              <PlusIkon width={26} height={26} />
            </button>
          </div>
          {HOGER.map((post) => (
            <Flik key={post.till} {...post} />
          ))}
        </div>
      </nav>
    </div>
  )
}
