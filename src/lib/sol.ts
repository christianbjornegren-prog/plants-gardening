/**
 * Solens position enligt NOAA:s solpositionsalgoritm (Jean Meeus,
 * "Astronomical Algorithms", i NOAA:s förenkling). Rena funktioner, inga
 * beroenden. Vinklar i grader: azimut 0 = norr, medurs; höjd 0 = horisonten.
 *
 * Noggrannheten är ±0,01° i position och ±1–2 min för upp-/nedgång jämfört
 * med NOAA:s egen kalkylator — mer än nog för skuggor i en trädgård.
 * Verifierad mot facit i sol.test.ts; bygg ingenting på den utan att de
 * testerna är gröna.
 */

const RAD = Math.PI / 180

/** Zenitvinkel för upp-/nedgång: 90° + refraktion (34′) + solskivans radie (16′). */
const UPPGANGSZENIT = 90.833

function mod(tal: number, bas: number): number {
  return ((tal % bas) + bas) % bas
}

function begransa(tal: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, tal))
}

/** Juliansk dag från en absolut tidpunkt. */
function julianskDag(datum: Date): number {
  return datum.getTime() / 86_400_000 + 2_440_587.5
}

/** Solens grundstorheter vid ett julianskt århundrade T. Allt i grader. */
function solelement(T: number) {
  const L0 = mod(280.46646 + T * (36000.76983 + 0.0003032 * T), 360)
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T)
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
  const C =
    Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * M * RAD) * 0.000289
  const omega = 125.04 - 1934.136 * T
  const skenbarLong = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD)
  const epsilon0 =
    23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
  const epsilon = epsilon0 + 0.00256 * Math.cos(omega * RAD)
  const deklination = Math.asin(Math.sin(epsilon * RAD) * Math.sin(skenbarLong * RAD)) / RAD

  // Tidsekvationen i minuter: skillnaden mellan sann och medelsoltid.
  const y = Math.tan((epsilon / 2) * RAD) ** 2
  const tidsekvation =
    (4 / RAD) *
    (y * Math.sin(2 * L0 * RAD) -
      2 * e * Math.sin(M * RAD) +
      4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) -
      0.5 * y * y * Math.sin(4 * L0 * RAD) -
      1.25 * e * e * Math.sin(2 * M * RAD))

  return { deklination, tidsekvation }
}

/** NOAA:s refraktionskorrektion: hur mycket högre solen SER UT att stå. */
function refraktion(hojd: number): number {
  if (hojd > 85) return 0
  const tanH = Math.tan(hojd * RAD)
  if (hojd > 5) return (58.1 / tanH - 0.07 / tanH ** 3 + 0.000086 / tanH ** 5) / 3600
  if (hojd > -0.575)
    return (1735 + hojd * (-518.2 + hojd * (103.4 + hojd * (-12.79 + hojd * 0.711)))) / 3600
  return -20.774 / tanH / 3600
}

export interface Solposition {
  /** Grader från norr, medurs: 90 = öster, 180 = söder, 270 = väster. */
  azimut: number
  /** Grader över horisonten, med refraktion. ≤ 0 betyder att solen är nere. */
  hojd: number
}

/** Solens läge på himlen vid en absolut tidpunkt, sedd från (latitud, longitud). */
export function solposition(datum: Date, latitud: number, longitud: number): Solposition {
  const T = (julianskDag(datum) - 2_451_545) / 36_525
  const { deklination, tidsekvation } = solelement(T)

  const utcMinuter =
    datum.getUTCHours() * 60 + datum.getUTCMinutes() + datum.getUTCSeconds() / 60
  const sannSoltid = mod(utcMinuter + tidsekvation + 4 * longitud, 1440)
  const timvinkel = sannSoltid / 4 - 180

  const lat = latitud * RAD
  const dek = deklination * RAD
  const H = timvinkel * RAD

  const cosZenit = Math.sin(lat) * Math.sin(dek) + Math.cos(lat) * Math.cos(dek) * Math.cos(H)
  const zenit = Math.acos(begransa(cosZenit, -1, 1)) / RAD
  const hojd = 90 - zenit + refraktion(90 - zenit)

  // Azimut via atan2 (mätt från söder, västlig positiv) + 180 → från norr medurs.
  const azimut = mod(
    Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dek) * Math.cos(lat)) / RAD +
      180,
    360,
  )
  return { azimut, hojd }
}

export type Soldygn =
  | { typ: 'normal'; uppgang: Date; nedgang: Date; middag: Date }
  /** Solen går aldrig ner (högsommar norröver). */
  | { typ: 'midnattssol'; middag: Date }
  /** Solen går aldrig upp. */
  | { typ: 'polarnatt'; middag: Date }

/**
 * Soluppgång, solnedgång och solmiddag för ett kalenderdygn (år, månad 1–12,
 * dag) på en given plats. Dygnet tolkas som det lokala dygnet — för svenska
 * longituder ligger alla tre händelserna på samma UTC-datum.
 */
export function soldygn(
  ar: number,
  manad: number,
  dag: number,
  latitud: number,
  longitud: number,
): Soldygn {
  const midnattUTC = Date.UTC(ar, manad - 1, dag)

  // Först en skattning vid 12 UTC, sedan förfining vid själva händelsen —
  // tidsekvationen och deklinationen hinner ändras några minuter på ett dygn.
  const middagMin = preciseraMiddag(midnattUTC, longitud)
  const middag = new Date(midnattUTC + middagMin * 60_000)

  const uppMin = precisera(midnattUTC, middagMin, latitud, longitud, 'uppgang')
  const nedMin = precisera(midnattUTC, middagMin, latitud, longitud, 'nedgang')
  if (uppMin === undefined || nedMin === undefined) {
    const { deklination } = solelement((julianskDag(middag) - 2_451_545) / 36_525)
    const middagshojd = 90 - Math.abs(latitud - deklination)
    return middagshojd > 90 - UPPGANGSZENIT
      ? { typ: 'midnattssol', middag }
      : { typ: 'polarnatt', middag }
  }
  return {
    typ: 'normal',
    uppgang: new Date(midnattUTC + uppMin * 60_000),
    nedgang: new Date(midnattUTC + nedMin * 60_000),
    middag,
  }
}

/** Solmiddagen finns varje dygn — alltid ett tal, med en förfiningsomgång. */
function preciseraMiddag(midnattUTC: number, longitud: number): number {
  let min = 720
  for (let varv = 0; varv < 2; varv++) {
    const T = (julianskDag(new Date(midnattUTC + min * 60_000)) - 2_451_545) / 36_525
    min = 720 - 4 * longitud - solelement(T).tidsekvation
  }
  return min
}

/**
 * Minuter efter UTC-midnatt för uppgång/nedgång, med en förfiningsomgång:
 * elementen räknas om vid den först skattade tidpunkten. undefined när solen
 * aldrig passerar horisonten (midnattssol/polarnatt).
 */
function precisera(
  midnattUTC: number,
  startMin: number,
  latitud: number,
  longitud: number,
  vad: 'uppgang' | 'nedgang',
): number | undefined {
  let min = startMin
  for (let varv = 0; varv < 2; varv++) {
    const T = (julianskDag(new Date(midnattUTC + min * 60_000)) - 2_451_545) / 36_525
    const { deklination, tidsekvation } = solelement(T)
    const middag = 720 - 4 * longitud - tidsekvation
    const cosH0 =
      (Math.cos(UPPGANGSZENIT * RAD) -
        Math.sin(latitud * RAD) * Math.sin(deklination * RAD)) /
      (Math.cos(latitud * RAD) * Math.cos(deklination * RAD))
    if (cosH0 > 1 || cosH0 < -1) return undefined
    const H0 = Math.acos(cosH0) / RAD
    min = vad === 'uppgang' ? middag - 4 * H0 : middag + 4 * H0
  }
  return min
}

/* ------------------------------------------------------------- lokal tid */

/**
 * UTC-offset i minuter för en tidszon vid en given tidpunkt, via Intl.
 * Europe/Stockholm: +60 vintertid, +120 sommartid — inklusive själva
 * omställningsdatumen, utan egen DST-tabell.
 */
export function tidszonOffsetMin(datum: Date, tidszon = 'Europe/Stockholm'): number {
  const delar = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tidszon,
    timeZoneName: 'longOffset',
  }).formatToParts(datum)
  const namn = delar.find((d) => d.type === 'timeZoneName')?.value ?? 'GMT'
  const traff = /GMT([+-])(\d{2}):(\d{2})/.exec(namn)
  if (!traff) return 0
  const tecken = traff[1] === '-' ? -1 : 1
  return tecken * (Number(traff[2]) * 60 + Number(traff[3]))
}

/**
 * Absolut tidpunkt för en VÄGGKLOCKETID i Stockholm: år, månad 1–12, dag och
 * minuter efter midnatt. Två pass eftersom offseten beror på tidpunkten
 * (sommartidens gränser).
 */
export function stockholmsTid(
  ar: number,
  manad: number,
  dag: number,
  minuterEfterMidnatt: number,
  tidszon = 'Europe/Stockholm',
): Date {
  let gissning = new Date(Date.UTC(ar, manad - 1, dag, 0, minuterEfterMidnatt) - 60 * 60_000)
  for (let varv = 0; varv < 2; varv++) {
    const offset = tidszonOffsetMin(gissning, tidszon)
    gissning = new Date(Date.UTC(ar, manad - 1, dag, 0, minuterEfterMidnatt - offset))
  }
  return gissning
}

/** Väggklocketid i Stockholm (minuter efter midnatt) för en absolut tidpunkt. */
export function stockholmsMinuter(datum: Date, tidszon = 'Europe/Stockholm'): number {
  const offset = tidszonOffsetMin(datum, tidszon)
  const skiftad = new Date(datum.getTime() + offset * 60_000)
  return skiftad.getUTCHours() * 60 + skiftad.getUTCMinutes() + skiftad.getUTCSeconds() / 60
}
