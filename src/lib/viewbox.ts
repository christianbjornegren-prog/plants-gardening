import { begransa } from './geometri'

/** SVG-viewBox i meter. All zoom/panorering är ren matematik på denna. */
export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

export interface Rutan {
  x: number
  y: number
  bredd: number
  hojd: number
}

/**
 * Minsta yta en öppning zoomar in till. Utan golv skulle en enda liten rabatt
 * fylla hela skärmen och tappa allt sammanhang.
 */
const MINSTA_VY_M = 6

/**
 * Vad ritningen ska visa när den öppnas: innehållet, inte tomten.
 *
 * Är tomten ritad men innehållet litet låg förut en liten teckning mitt i en
 * stor tom yta. Ligger inget ritat ännu visas hela tomten.
 */
export function innehallsRuta(
  breddM: number,
  hojdM: number,
  innehall: Rutan | undefined,
): Rutan {
  const hela: Rutan = { x: 0, y: 0, bredd: breddM, hojd: hojdM }
  if (!innehall || innehall.bredd <= 0 || innehall.hojd <= 0) return hela

  const bredd = Math.max(innehall.bredd, MINSTA_VY_M)
  const hojd = Math.max(innehall.hojd, MINSTA_VY_M)
  const cx = innehall.x + innehall.bredd / 2
  const cy = innehall.y + innehall.hojd / 2
  // Aldrig större än tomten — då är hela tomten det rimliga.
  if (bredd >= breddM && hojd >= hojdM) return hela
  return { x: cx - bredd / 2, y: cy - hojd / 2, bredd, hojd }
}

/** Ytan med marginal, anpassad till behållarens proportioner. */
export function anpassaViewBox(
  breddM: number,
  hojdM: number,
  behallareBredd: number,
  behallareHojd: number,
  marginalM = 0.8,
  ruta: Rutan = { x: 0, y: 0, bredd: breddM, hojd: hojdM },
): ViewBox {
  const innehallB = ruta.bredd + marginalM * 2
  const innehallH = ruta.hojd + marginalM * 2
  const skala = Math.max(
    innehallB / Math.max(behallareBredd, 1),
    innehallH / Math.max(behallareHojd, 1),
  )
  const w = skala * Math.max(behallareBredd, 1)
  const h = skala * Math.max(behallareHojd, 1)
  return {
    x: ruta.x + ruta.bredd / 2 - w / 2,
    y: ruta.y + ruta.hojd / 2 - h / 2,
    w,
    h,
  }
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
