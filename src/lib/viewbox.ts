import { begransa } from './geometri'

/** SVG-viewBox i meter. All zoom/panorering är ren matematik på denna. */
export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

/** Hela tomten med marginal, anpassad till behållarens proportioner. */
export function anpassaViewBox(
  breddM: number,
  hojdM: number,
  behallareBredd: number,
  behallareHojd: number,
  marginalM = 0.8,
): ViewBox {
  const innehallB = breddM + marginalM * 2
  const innehallH = hojdM + marginalM * 2
  const skala = Math.max(
    innehallB / Math.max(behallareBredd, 1),
    innehallH / Math.max(behallareHojd, 1),
  )
  const w = skala * Math.max(behallareBredd, 1)
  const h = skala * Math.max(behallareHojd, 1)
  return { x: breddM / 2 - w / 2, y: hojdM / 2 - h / 2, w, h }
}

/** Zoomar med faktor (>1 = zooma ut) kring ett fokus i meter. */
export function zoomaViewBox(vb: ViewBox, faktor: number, fokus: { x: number; y: number }): ViewBox {
  const w = vb.w * faktor
  const h = vb.h * faktor
  return {
    x: fokus.x - (fokus.x - vb.x) * faktor,
    y: fokus.y - (fokus.y - vb.y) * faktor,
    w,
    h,
  }
}

export function panoreraViewBox(vb: ViewBox, dxM: number, dyM: number): ViewBox {
  return { ...vb, x: vb.x + dxM, y: vb.y + dyM }
}

/**
 * Håller zoomen mellan 1,5 m och 4× tomten, och centrum i närheten av tomten.
 */
export function begransaViewBox(vb: ViewBox, breddM: number, hojdM: number): ViewBox {
  const proportion = vb.h / vb.w
  const maxW = Math.max(breddM, hojdM / proportion) * 4
  const w = begransa(vb.w, 1.5, maxW)
  const h = w * proportion
  const cx = begransa(vb.x + w / 2, -breddM * 0.5, breddM * 1.5)
  const cy = begransa(vb.y + h / 2, -hojdM * 0.5, hojdM * 1.5)
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

export function viewBoxAttribut(vb: ViewBox): string {
  return `${vb.x} ${vb.y} ${vb.w} ${vb.h}`
}
