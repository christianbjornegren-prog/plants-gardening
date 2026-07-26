import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LogEntry, LogType } from '../data/types'
import { formatDatum } from '../lib/format'
import { LOGGTYPER } from '../lib/logg'
import { FotoBild } from './FotoBild'
import { DroppeIkon, GodselIkon, PennaIkon, SaxIkon, VaxterIkon } from './Ikoner'

const TYP_IKON: Record<LogType, typeof DroppeIkon> = {
  vattnat: DroppeIkon,
  gödslat: GodselIkon,
  beskuret: SaxIkon,
  planterat: VaxterIkon,
  anteckning: PennaIkon,
}

export interface TidslinjeMal {
  text: string
  lank: string
}

/**
 * Tidslinje över loggposter, nyaste först. `mal` anger var posten hör hemma
 * (växt/yta) och visas bara där det behövs (globala loggen).
 */
export function Tidslinje({
  poster,
  mal,
  tom,
}: {
  poster: LogEntry[]
  mal?: (post: LogEntry) => TidslinjeMal | undefined
  tom: ReactNode
}) {
  if (poster.length === 0) {
    return <p className="py-6 text-center text-sm text-panel/60">{tom}</p>
  }
  return (
    <ol className="flex flex-col">
      {poster.map((post) => {
        const Ikon = TYP_IKON[post.type]
        const postMal = mal?.(post)
        return (
          <li
            key={post.id}
            className="flex gap-3 border-b border-panel/8 py-3 last:border-b-0"
          >
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-lov/20 text-orm">
              <Ikon width={16} height={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  <span>{LOGGTYPER[post.type]}</span>
                  {postMal && (
                    <>
                      {' · '}
                      <Link
                        to={postMal.lank}
                        className="font-normal text-orm underline underline-offset-2"
                      >
                        {postMal.text}
                      </Link>
                    </>
                  )}
                </p>
                <time className="shrink-0 text-xs text-panel/50" dateTime={post.date}>
                  {formatDatum(new Date(post.date))}
                </time>
              </div>
              {post.note && (
                <p className="mt-0.5 text-sm whitespace-pre-wrap text-panel/75">{post.note}</p>
              )}
              {post.photoRef && (
                <FotoBild
                  fotoRef={post.photoRef}
                  alt="Loggfoto"
                  className="mt-2 aspect-[4/3] w-full max-w-60 overflow-hidden rounded-md"
                />
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
