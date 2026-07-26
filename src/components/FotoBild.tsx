import { useEffect, useState } from 'react'
import { VaxterIkon } from './Ikoner'

/** Visar ett foto via dess photoStore-nyckel, med lugn platshållare. */
export function FotoBild({
  fotoRef,
  alt,
  className = '',
}: {
  fotoRef: string | undefined
  alt: string
  className?: string
}) {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    setUrl(undefined)
    if (!fotoRef) return
    let aktiv = true
    void (async () => {
      const { hamtaFotoUrl } = await import('../lib/photoStore')
      const hittad = await hamtaFotoUrl(fotoRef)
      if (aktiv) setUrl(hittad)
    })()
    return () => {
      aktiv = false
    }
  }, [fotoRef])

  if (!url) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-upphojd text-linje ${className}`}
      >
        <VaxterIkon width={26} height={26} />
      </div>
    )
  }
  return <img src={url} alt={alt} className={`object-cover ${className}`} />
}
