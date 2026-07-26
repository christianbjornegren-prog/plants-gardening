import { useCallback, useEffect, useRef, useState } from 'react'
import type { PunktM } from '../../data/types'
import {
  anpassaViewBox,
  begransaViewBox,
  panoreraViewBox,
  zoomaViewBox,
  type ViewBox,
} from '../../lib/viewbox'

/**
 * Behållarmätning + viewBox-tillstånd + konvertering skärm↔meter.
 * Delas av levande läget och redigeringsläget.
 */
export function useKartYta(breddM: number, hojdM: number) {
  const behallareRef = useRef<HTMLDivElement>(null)
  const [storlek, setStorlek] = useState<{ b: number; h: number }>()
  const [vb, setVb] = useState<ViewBox>()

  useEffect(() => {
    const el = behallareRef.current
    if (!el) return
    const observer = new ResizeObserver((poster) => {
      const rekt = poster[0]?.contentRect
      if (rekt && rekt.width > 0 && rekt.height > 0) {
        setStorlek({ b: rekt.width, h: rekt.height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Passa in hela tomten när storleken är känd eller tomtens mått ändras.
  useEffect(() => {
    if (!storlek) return
    setVb(anpassaViewBox(breddM, hojdM, storlek.b, storlek.h))
  }, [storlek, breddM, hojdM])

  const mpp = vb && storlek ? vb.w / storlek.b : 0.02

  const tillMeter = useCallback(
    (clientX: number, clientY: number): PunktM => {
      const el = behallareRef.current
      if (!el || !vb) return [0, 0]
      const rekt = el.getBoundingClientRect()
      return [
        vb.x + ((clientX - rekt.left) / rekt.width) * vb.w,
        vb.y + ((clientY - rekt.top) / rekt.height) * vb.h,
      ]
    },
    [vb],
  )

  const panoreraPx = useCallback(
    (dxPx: number, dyPx: number) => {
      setVb((nu) =>
        nu ? begransaViewBox(panoreraViewBox(nu, -dxPx * (nu.w / (storlek?.b ?? 1)), -dyPx * (nu.w / (storlek?.b ?? 1))), breddM, hojdM) : nu,
      )
    },
    [storlek, breddM, hojdM],
  )

  const zoomaVid = useCallback(
    (faktor: number, fokus: PunktM) => {
      setVb((nu) =>
        nu
          ? begransaViewBox(zoomaViewBox(nu, faktor, { x: fokus[0], y: fokus[1] }), breddM, hojdM)
          : nu,
      )
    },
    [breddM, hojdM],
  )

  // Hjulzoom med aktiv preventDefault (React-lyssnare är passiva).
  useEffect(() => {
    const el = behallareRef.current
    if (!el) return
    function vidHjul(e: WheelEvent) {
      e.preventDefault()
      const faktor = e.deltaY > 0 ? 1.12 : 1 / 1.12
      zoomaVid(faktor, tillMeter(e.clientX, e.clientY))
    }
    el.addEventListener('wheel', vidHjul, { passive: false })
    return () => el.removeEventListener('wheel', vidHjul)
  }, [zoomaVid, tillMeter])

  return { behallareRef, vb, mpp, tillMeter, panoreraPx, zoomaVid }
}
