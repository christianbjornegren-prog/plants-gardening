import { Link } from 'react-router-dom'
import type { Plant } from '../data/types'
import { FotoBild } from './FotoBild'

export function VaxtRad({ vaxt, undertext }: { vaxt: Plant; undertext?: string }) {
  return (
    <li>
      <Link
        to={`/vaxter/${vaxt.id}`}
        className="flex items-center gap-3 rounded-lg border border-tra bg-tra/20 p-2.5"
      >
        <FotoBild
          fotoRef={vaxt.photoRefs[0]}
          alt=""
          className="size-14 shrink-0 overflow-hidden rounded-md"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{vaxt.name}</span>
          {undertext && <span className="block truncate text-sm text-panel/60">{undertext}</span>}
        </span>
      </Link>
    </li>
  )
}
