import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataRot } from '../auth/AuthProvider'
import type { Status } from '../data/types'
import { BIBLIOTEK_ATTRIBUT, KAMERA_ATTRIBUT, taEmotFoto } from '../lib/foto'
import { Ark } from './Ark'
import { FotoBild } from './FotoBild'
import { KameraIkon } from './Ikoner'
import { Knapp } from './Knapp'
import { kvittera } from './Kvittens'
import { inmatningsStil } from './Falt'
import { NamnForslag } from './NamnForslag'

/**
 * Flöde A — lägg till en växt, foto först.
 *
 *   Tryck + → kameran öppnas direkt → ta bild → skriv namn → Klart
 *
 * Två fält, en bild, noll obligatoriska val. Plats, sol och jord erbjuds
 * efteråt på växtkortet som mjuka förslag — aldrig som krav (se CLAUDE.md).
 */

export interface NyVaxtForval {
  platsId?: string
  position?: { x: number; y: number }
  status?: Status
  /** Hoppa över kameran (planerad växt som inte finns att fota än). */
  utanFoto?: boolean
}

interface NyVaxtApi {
  oppna: (forval?: NyVaxtForval) => void
}

/** Exporterad så att komponenttester kan rendera skalet utan Firebase. */
export const NyVaxtContext = createContext<NyVaxtApi | undefined>(undefined)

export function useNyVaxt(): NyVaxtApi {
  const api = useContext(NyVaxtContext)
  if (!api) throw new Error('useNyVaxt kräver NyVaxtProvider')
  return api
}

export function NyVaxtProvider({ children }: { children: ReactNode }) {
  const uid = useDataRot()
  const navigera = useNavigate()
  const kameraRef = useRef<HTMLInputElement>(null)
  const biblioteksRef = useRef<HTMLInputElement>(null)

  const [oppen, setOppen] = useState(false)
  const [forval, setForval] = useState<NyVaxtForval>({})
  const [namn, setNamn] = useState('')
  const [valtNamn, setValtNamn] = useState<{ sv: string; lat: string }>()
  const [fotoRef, setFotoRef] = useState<string>()
  const [laddarFoto, setLaddarFoto] = useState(false)
  const [fel, setFel] = useState<string>()
  const spararRef = useRef(false)

  /**
   * Grov men pålitlig enhetsgissning: telefoner och plattor har grov pekare.
   * På dator finns ingen kamera att öppna, och att slänga upp en filbläddrare
   * innan man ens sett formuläret är bara förvirrande.
   */
  const harKamera = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true

  const oppna = useCallback((nyttForval: NyVaxtForval = {}) => {
    setForval(nyttForval)
    setNamn('')
    setFotoRef(undefined)
    setFel(undefined)
    spararRef.current = false
    setOppen(true)
    // Kameran öppnas i SAMMA gest som knapptrycket — annars blockerar Safari.
    // Arket ligger redan under, så ett avbrutet kamerapass landar mjukt.
    if (!nyttForval.utanFoto && harKamera()) kameraRef.current?.click()
  }, [])

  async function vidValdBild(e: ChangeEvent<HTMLInputElement>) {
    const fil = e.target.files?.[0]
    e.target.value = ''
    if (!fil) return
    setLaddarFoto(true)
    setFel(undefined)
    try {
      const gammal = fotoRef
      setFotoRef(await taEmotFoto(uid, fil))
      if (gammal) {
        // Städningen av den ERSATTA blobben får inte färga felraden — det
        // nya fotot är redan sparat. Misslyckas raderingen blir filen bara
        // en osynlig rest, inte förlorad data.
        void import('../lib/photoStore')
          .then(({ taBortFoto }) => taBortFoto(gammal))
          .catch(() => undefined)
      }
    } catch {
      setFel('Fotot kunde inte sparas. Försök igen.')
    } finally {
      setLaddarFoto(false)
    }
  }

  function vidOppenChange(nyOppen: boolean) {
    setOppen(nyOppen)
    // Fotot laddas upp direkt när det väljs. Stängs arket utan att växten
    // sparas skulle blobben bli föräldralös — städa den. spararRef skiljer
    // "stängde utan att spara" från "sparade och stängde".
    if (!nyOppen && !spararRef.current && fotoRef) {
      const ref = fotoRef
      void import('../lib/photoStore')
        .then(({ taBortFoto }) => taBortFoto(ref))
        .catch(() => undefined)
    }
  }

  function spara(e: FormEvent) {
    e.preventDefault()
    // Enter + tryck på Klart i samma andetag gav två växter som delade
    // samma fotoRef — och raderades den ena försvann den andras bild.
    if (spararRef.current) return
    const trimmat = namn.trim()
    if (!trimmat) {
      setFel('Ge växten ett namn.')
      return
    }
    spararRef.current = true
    const sparadFoto = fotoRef
    setOppen(false)
    void (async () => {
      const repo = await import('../data/repo')
      const vaxtId = repo.skapaVaxt(uid, {
        namn: trimmat,
        // Bara om namnet fortfarande är det man valde — skriver hon om det
        // till "Mormors ros" är latinet inte längre hennes.
        latin: valtNamn?.sv === trimmat ? valtNamn.lat : undefined,
        platsId: forval.platsId,
        status: forval.status ?? 'finns',
      })
      if (forval.position) {
        repo.placeraVaxt(uid, vaxtId, forval.position.x, forval.position.y)
      }
      // Tidslinjen startar med det FÖRSTA FOTOT, inte med en påhittad
      // planterat-post (se docs/DESIGNLOGG.md).
      if (sparadFoto) {
        repo.skapaHandelse(uid, { typ: 'foto', vaxtId, platsId: forval.platsId, fotoRef: sparadFoto })
      }
      kvittera({
        text: `${trimmat} tillagd`,
        onAngra: () => {
          void (async () => {
            const repo2 = await import('../data/repo')
            repo2.taBortVaxt(uid, { id: vaxtId, namn: trimmat, status: 'finns' }, [])
            navigera('/')
          })()
        },
      })
      navigera(`/vaxter/${vaxtId}`)
    })()
  }

  return (
    <NyVaxtContext.Provider value={{ oppna }}>
      {children}

      <input
        {...KAMERA_ATTRIBUT}
        data-testid="ny-vaxt-kamera"
        ref={kameraRef}
        onChange={vidValdBild}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
      <input
        {...BIBLIOTEK_ATTRIBUT}
        data-testid="ny-vaxt-bibliotek"
        ref={biblioteksRef}
        onChange={vidValdBild}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />

      <Ark
        oppen={oppen}
        onOppenChange={vidOppenChange}
        titel={forval.status === 'planerad' ? 'Planera en växt' : 'Ny växt'}
      >
        <form onSubmit={spara} className="flex flex-col gap-4" data-testid="ny-vaxt-form">
          <button
            type="button"
            onClick={() => kameraRef.current?.click()}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-linje bg-botten"
          >
            {fotoRef ? (
              <FotoBild fotoRef={fotoRef} alt="Den nya växten" className="h-full w-full" />
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-2 text-dis">
                <KameraIkon width={28} height={28} />
                <span className="text-sm">
                  {laddarFoto ? 'Sparar bilden…' : harKamera() ? 'Ta en bild' : 'Välj en bild'}
                </span>
              </span>
            )}
          </button>

          {harKamera() && (
            <button
              type="button"
              onClick={() => biblioteksRef.current?.click()}
              className="-mt-1 self-center text-sm text-dis underline underline-offset-4 hover:text-tusch"
            >
              Välj ur biblioteket
            </button>
          )}

          <input
            type="text"
            autoFocus
            value={namn}
            onChange={(e) => setNamn(e.target.value)}
            placeholder="Vad är det?"
            aria-label="Växtens namn"
            enterKeyHint="done"
            autoComplete="off"
            className={`${inmatningsStil} text-lg`}
          />

          <NamnForslag
            fraga={namn}
            onVald={(n) => {
              setNamn(n.sv)
              setValtNamn({ sv: n.sv, lat: n.lat })
            }}
          />

          {fel && (
            <p role="alert" className="text-sm text-fermob-text">
              {fel}
            </p>
          )}

          <Knapp type="submit" variant="primar" disabled={laddarFoto} className="w-full">
            Klart
          </Knapp>
          <p className="text-center text-xs text-dis-svag">
            Plats, sol och jord kan du lägga till sen — eller aldrig.
          </p>
        </form>
      </Ark>
    </NyVaxtContext.Provider>
  )
}
