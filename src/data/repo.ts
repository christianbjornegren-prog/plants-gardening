import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { appLage } from '../lib/lage'
import { rapporteraDataFel } from './fel'
import { utanUndefined } from '../lib/rensa'
import { franLagradGeometri, tillLagradGeometri, tolkaPlatsTyp } from './kartkonvertering'
import {
  grundTradgardar,
  migreraV1TillV2,
  MIGRERINGSVERSION,
  type V1Area,
  type V1Data,
  type V1LogEntry,
  type V1Plant,
} from './migrering'
import type {
  Handelse,
  HandelseTyp,
  Plats,
  PlatsTyp,
  PunktM,
  Skuggkalla,
  Sol,
  Status,
  Tradgard,
  Vaderstreck,
  Vaxt,
} from './types'

/**
 * Datalagret. Importeras alltid dynamiskt (await import) så att Firebase
 * hamnar i en egen chunk.
 *
 * Skrivningar är fire-and-forget mot den lokala cachen och UI:t lyssnar
 * med onSnapshot — vi väntar aldrig på server-ack (offline-first,
 * se docs/ARKITEKTUR.md).
 */

const sorterare = new Intl.Collator('sv')

/**
 * Skrivfel går till felkanalen så att UI:t kan säga till. Tidigare hamnade de
 * bara i konsolen, vilket gjorde en nekad skrivning omöjlig att skilja från
 * en app som hängt sig.
 */
function loggaFel(fel: unknown): void {
  rapporteraDataFel(fel, 'skrivning')
}

function loggaLasfel(fel: unknown): void {
  rapporteraDataFel(fel, 'lasning')
}

const tradgardCol = (uid: string) => collection(getDb(), 'users', uid, 'tradgardar')
const platsCol = (uid: string) => collection(getDb(), 'users', uid, 'platser')
const vaxtCol = (uid: string) => collection(getDb(), 'users', uid, 'vaxter')
const handelseCol = (uid: string) => collection(getDb(), 'users', uid, 'handelser')
const migreringDoc = (uid: string) => doc(getDb(), 'users', uid, 'meta', 'migrering')
const skuggkallaCol = (uid: string) => collection(getDb(), 'users', uid, 'skuggkallor')

export function nyttId(): string {
  return crypto.randomUUID().slice(0, 8)
}

/* ------------------------------------------------------------------ läsning */

function tillTradgard(snap: QueryDocumentSnapshot<DocumentData>): Tradgard {
  const d = snap.data()
  return {
    id: snap.id,
    namn: typeof d.namn === 'string' ? d.namn : '',
    ordning: typeof d.ordning === 'number' ? d.ordning : 99,
    widthM: typeof d.widthM === 'number' ? d.widthM : undefined,
    heightM: typeof d.heightM === 'number' ? d.heightM : undefined,
    norrVinkel: typeof d.norrVinkel === 'number' ? d.norrVinkel : undefined,
    latitud: typeof d.latitud === 'number' ? d.latitud : undefined,
    longitud: typeof d.longitud === 'number' ? d.longitud : undefined,
  }
}

function tillPlats(snap: QueryDocumentSnapshot<DocumentData>): Plats {
  const d = snap.data()
  return {
    id: snap.id,
    tradgardId: typeof d.tradgardId === 'string' ? d.tradgardId : '',
    namn: typeof d.namn === 'string' ? d.namn : '',
    typ: tolkaPlatsTyp(d.typ),
    egenTyp: d.egenTyp as string | undefined,
    geometri: franLagradGeometri(d.geometri),
    sol: d.sol as Sol | undefined,
    jord: d.jord as string | undefined,
    vetterMot: d.vetterMot as string | undefined,
    vaderstreck: d.vaderstreck as Vaderstreck | undefined,
    status: d.status === 'planerad' ? 'planerad' : 'finns',
    anteckning: d.anteckning as string | undefined,
    hojdM: typeof d.hojdM === 'number' ? d.hojdM : undefined,
  }
}

function tillVaxt(snap: QueryDocumentSnapshot<DocumentData>): Vaxt {
  const d = snap.data()
  return {
    id: snap.id,
    namn: typeof d.namn === 'string' ? d.namn : '',
    platsId: d.platsId as string | undefined,
    position: d.position as Vaxt['position'],
    status: d.status === 'planerad' ? 'planerad' : 'finns',
    sort: d.sort as string | undefined,
    latin: d.latin as string | undefined,
    planterad: d.planterad as string | undefined,
    antal: typeof d.antal === 'number' ? d.antal : undefined,
    sol: d.sol as Sol | undefined,
    jord: d.jord as string | undefined,
    anteckning: d.anteckning as string | undefined,
  }
}

function tillHandelse(snap: QueryDocumentSnapshot<DocumentData>): Handelse {
  const d = snap.data()
  return {
    id: snap.id,
    typ: (d.typ as HandelseTyp | undefined) ?? 'anteckning',
    datum: typeof d.datum === 'string' ? d.datum : '',
    vaxtId: d.vaxtId as string | undefined,
    platsId: d.platsId as string | undefined,
    fotoRef: d.fotoRef as string | undefined,
    anteckning: d.anteckning as string | undefined,
    franPlatsId: d.franPlatsId as string | undefined,
    tillPlatsId: d.tillPlatsId as string | undefined,
    datumOkant: d.datumOkant === true ? true : undefined,
  }
}

export function lyssnaPaTradgardar(uid: string, mottagare: (v: Tradgard[]) => void): () => void {
  return onSnapshot(
    tradgardCol(uid),
    (snap) => mottagare(snap.docs.map(tillTradgard).sort((a, b) => a.ordning - b.ordning)),
    loggaLasfel,
  )
}

export function lyssnaPaPlatser(uid: string, mottagare: (v: Plats[]) => void): () => void {
  return onSnapshot(
    platsCol(uid),
    (snap) => mottagare(snap.docs.map(tillPlats).sort((a, b) => sorterare.compare(a.namn, b.namn))),
    loggaLasfel,
  )
}

export function lyssnaPaVaxter(uid: string, mottagare: (v: Vaxt[]) => void): () => void {
  return onSnapshot(
    vaxtCol(uid),
    (snap) => mottagare(snap.docs.map(tillVaxt).sort((a, b) => sorterare.compare(a.namn, b.namn))),
    loggaLasfel,
  )
}

/** Sorterad med nyaste först (ISO-strängar jämförs lexikografiskt). */
export function lyssnaPaHandelser(uid: string, mottagare: (v: Handelse[]) => void): () => void {
  return onSnapshot(
    handelseCol(uid),
    (snap) => mottagare(snap.docs.map(tillHandelse).sort((a, b) => b.datum.localeCompare(a.datum))),
    loggaLasfel,
  )
}

/* ---------------------------------------------------------------- trädgårdar */

export interface TradgardFalt {
  namn: string
  ordning: number
  widthM?: number
  heightM?: number
}

/**
 * Ny ritning. Används för att skissa om en trädgård utan att röra nuläget —
 * "Baksidan" bredvid "Baksidan kommande".
 */
export function skapaTradgard(uid: string, falt: TradgardFalt): string {
  const ny = doc(tradgardCol(uid))
  void setDoc(ny, utanUndefined({ ...falt })).catch(loggaFel)
  return ny.id
}

/** Tar bort ritningen OCH platserna som hör till den. Växterna blir hemlösa. */
export function taBortTradgard(uid: string, id: string, platser: Plats[], vaxter: Vaxt[]): void {
  for (const plats of platser) {
    const dar = vaxter.filter((v) => v.platsId === plats.id)
    taBortPlats(uid, plats.id, dar, [])
  }
  void deleteDoc(doc(tradgardCol(uid), id)).catch(loggaFel)
}

export function sparaTradgardMatt(uid: string, id: string, widthM: number, heightM: number): void {
  void setDoc(doc(tradgardCol(uid), id), { widthM, heightM }, { merge: true }).catch(loggaFel)
}

export function dopOmTradgard(uid: string, id: string, namn: string): void {
  void updateDoc(doc(tradgardCol(uid), id), { namn }).catch(loggaFel)
}

/** Norrvinkel och läge för solberäkningen. Bara de fält som skickas med rörs. */
export function sparaSolinstallning(
  uid: string,
  id: string,
  falt: { norrVinkel?: number; latitud?: number; longitud?: number },
): void {
  const uppdatering: Record<string, unknown> = {}
  if ('norrVinkel' in falt) uppdatering.norrVinkel = falt.norrVinkel ?? deleteField()
  if ('latitud' in falt) uppdatering.latitud = falt.latitud ?? deleteField()
  if ('longitud' in falt) uppdatering.longitud = falt.longitud ?? deleteField()
  if (Object.keys(uppdatering).length === 0) return
  void updateDoc(doc(tradgardCol(uid), id), uppdatering).catch(loggaFel)
}

/** Platsens höjd i meter — undefined tar bort fältet. */
export function sparaPlatsHojd(uid: string, id: string, hojdM: number | undefined): void {
  void updateDoc(doc(platsCol(uid), id), { hojdM: hojdM ?? deleteField() }).catch(loggaFel)
}

/* -------------------------------------------------------------------- platser */

export interface PlatsFalt {
  tradgardId: string
  namn: string
  typ: PlatsTyp
  egenTyp?: string
  punkter?: PunktM[]
  runda?: number[]
  sol?: Sol
  jord?: string
  vetterMot?: string
  vaderstreck?: Vaderstreck
  status?: Status
  anteckning?: string
}

function platsPayload(falt: PlatsFalt): Record<string, unknown> {
  return utanUndefined({
    tradgardId: falt.tradgardId,
    namn: falt.namn,
    typ: falt.typ,
    egenTyp: falt.egenTyp,
    geometri: falt.punkter?.length
      ? tillLagradGeometri({ punkter: falt.punkter, runda: falt.runda })
      : undefined,
    sol: falt.sol,
    jord: falt.jord,
    vetterMot: falt.vetterMot,
    vaderstreck: falt.vaderstreck,
    status: falt.status ?? 'finns',
    anteckning: falt.anteckning,
  })
}

export function skapaPlats(uid: string, falt: PlatsFalt): string {
  const ny = doc(platsCol(uid))
  void setDoc(ny, platsPayload(falt)).catch(loggaFel)
  return ny.id
}

/**
 * Skriver tillbaka en plats med SAMMA id. Finns för ångra-funktionen i
 * ritläget: en borttagen plats ska kunna återuppstå exakt som den var, så att
 * växternas platsId fortfarande pekar rätt.
 */
export function aterskapaPlats(uid: string, plats: Plats): void {
  const { id, geometri, ...falt } = plats
  void setDoc(
    doc(platsCol(uid), id),
    utanUndefined({ ...falt, geometri: geometri ? tillLagradGeometri(geometri) : undefined }),
  ).catch(loggaFel)
}

/**
 * Sätter växtens plats och läge UTAN att skriva en händelse. Bara för ångra —
 * en ångrad flytt ska inte lämna spår i historiken.
 */
export function aterstallVaxtPlacering(
  uid: string,
  vaxtId: string,
  platsId: string | undefined,
  position: { x: number; y: number } | undefined,
): void {
  void updateDoc(doc(vaxtCol(uid), vaxtId), {
    platsId: platsId ?? deleteField(),
    position: position ?? deleteField(),
  }).catch(loggaFel)
}

/** Bara de fält som skickas med rörs; undefined raderar fältet. */
export function uppdateraPlats(uid: string, id: string, falt: Partial<PlatsFalt>): void {
  const uppdatering: Record<string, unknown> = {}
  if ('tradgardId' in falt) uppdatering.tradgardId = falt.tradgardId
  if ('namn' in falt) uppdatering.namn = falt.namn
  if ('typ' in falt) uppdatering.typ = falt.typ
  if ('status' in falt) uppdatering.status = falt.status ?? 'finns'
  if ('punkter' in falt) {
    uppdatering.geometri = falt.punkter?.length
      ? tillLagradGeometri({ punkter: falt.punkter, runda: falt.runda })
      : deleteField()
  }
  for (const nyckel of [
    'sol',
    'jord',
    'vetterMot',
    'vaderstreck',
    'anteckning',
    'egenTyp',
  ] as const) {
    if (nyckel in falt) uppdatering[nyckel] = falt[nyckel] ?? deleteField()
  }
  if (Object.keys(uppdatering).length === 0) return
  void updateDoc(doc(platsCol(uid), id), uppdatering).catch(loggaFel)
}

export function sparaPlatsGeometri(
  uid: string,
  id: string,
  punkter: PunktM[],
  runda?: number[],
): void {
  void updateDoc(doc(platsCol(uid), id), {
    geometri: tillLagradGeometri({ punkter, runda }),
  }).catch(loggaFel)
}

export interface TaBortPlatsAlternativ {
  /**
   * Behåll fotoblobbarna när raderingen erbjuds med ångra: en raderad blob
   * går aldrig att återskapa, så "Går att ångra" kräver att filerna får
   * ligga kvar. Priset är en föräldralös fil om ångra aldrig trycks —
   * osynligt, mot att ett tryck på Ångra faktiskt återställer allt.
   */
  bevaraFoton?: boolean
  /** Får de raderade händelserna — det är dessa ångra ska återskapa. */
  vidStadat?: (handelser: Handelse[]) => void
}

/**
 * Tar bort platsen. Växterna där blir HEMLÖSA — aldrig raderade. Platsens egna
 * händelser städas; foton bara om raderingen inte är ångringsbar.
 *
 * Utöver vyns listor frågas den lokala cachen — både efter händelser och
 * efter växter med platsId mot platsen: vyns state kan sakna poster som just
 * skrivits, eller växter som placerades här från en annan flik/enhet.
 */
export function taBortPlats(
  uid: string,
  id: string,
  vaxterDar: Vaxt[],
  handelser: Handelse[],
  alternativ: TaBortPlatsAlternativ = {},
): void {
  void deleteDoc(doc(platsCol(uid), id)).catch(loggaFel)

  void (async () => {
    let cachade: Vaxt[] = []
    try {
      const snap = await getDocs(query(vaxtCol(uid), where('platsId', '==', id)))
      cachade = snap.docs.map(tillVaxt)
    } catch {
      cachade = []
    }
    const beroras = new Map([...vaxterDar, ...cachade].map((v) => [v.id, v] as const))
    for (const vaxt of beroras.values()) {
      void updateDoc(doc(vaxtCol(uid), vaxt.id), {
        platsId: deleteField(),
        position: deleteField(),
      }).catch(loggaFel)
    }
  })().catch(loggaFel)

  // BARA platsens EGNA händelser. Växternas händelser bär också platsId (de
  // loggas med platsen de stod på), och att radera dem skulle förstöra
  // växternas historik och foton — trots att UI:t lovar att växterna blir kvar.
  void stadaHandelser(uid, 'platsId', id, handelser, (h) => h.vaxtId === undefined, {
    bevaraFoton: alternativ.bevaraFoton,
    vidStadat: alternativ.vidStadat,
  }).catch(loggaFel)
}

/* --------------------------------------------------------------------- växter */

export interface VaxtFalt {
  namn: string
  platsId?: string
  status?: Status
  sort?: string
  latin?: string
  planterad?: string
  antal?: number
  sol?: Sol
  jord?: string
  anteckning?: string
}

export function skapaVaxt(uid: string, falt: VaxtFalt): string {
  const ny = doc(vaxtCol(uid))
  void setDoc(
    ny,
    utanUndefined({
      namn: falt.namn,
      platsId: falt.platsId,
      status: falt.status ?? 'finns',
      sort: falt.sort,
      latin: falt.latin,
      planterad: falt.planterad,
      antal: falt.antal,
      sol: falt.sol,
      jord: falt.jord,
      anteckning: falt.anteckning,
    }),
  ).catch(loggaFel)
  return ny.id
}

/**
 * Bara de fält som skickas med rörs; undefined raderar fältet.
 * (Ingen automatisk "Planterat"-post — den ljög, se docs/DESIGNLOGG.md.)
 */
export function uppdateraVaxt(uid: string, id: string, falt: Partial<VaxtFalt>): void {
  const uppdatering: Record<string, unknown> = {}
  if ('namn' in falt) uppdatering.namn = falt.namn
  if ('status' in falt) uppdatering.status = falt.status ?? 'finns'
  for (const nyckel of [
    'platsId',
    'sort',
    'latin',
    'planterad',
    'antal',
    'sol',
    'jord',
    'anteckning',
  ] as const) {
    if (nyckel in falt) uppdatering[nyckel] = falt[nyckel] ?? deleteField()
  }
  if (Object.keys(uppdatering).length === 0) return
  void updateDoc(doc(vaxtCol(uid), id), uppdatering).catch(loggaFel)
}

/** Sätter växtens läge på ritningen (position i meter). */
export function placeraVaxt(uid: string, vaxtId: string, x: number, y: number): void {
  void updateDoc(doc(vaxtCol(uid), vaxtId), { position: { x, y } }).catch(loggaFel)
}

export function taBortPlacering(uid: string, vaxtId: string): void {
  void updateDoc(doc(vaxtCol(uid), vaxtId), { position: deleteField() }).catch(loggaFel)
}

/**
 * Byte av plats; kartläget nollställs.
 *
 * En hemlös växt som får sin FÖRSTA plats har inte flyttat någonstans — det
 * är att fylla i en uppgift, inte en händelse i trädgården. Därför loggas
 * bara riktiga flyttar, annars fylls loggen av "Flyttat" direkt efter att
 * varje ny växt lagts till.
 */
export function flyttaVaxt(
  uid: string,
  vaxt: Vaxt,
  tillPlatsId: string | undefined,
): string | undefined {
  if (tillPlatsId === vaxt.platsId) return undefined
  void updateDoc(doc(vaxtCol(uid), vaxt.id), {
    platsId: tillPlatsId ?? deleteField(),
    position: deleteField(),
  }).catch(loggaFel)
  if (!vaxt.platsId) return undefined
  // Händelse-id:t returneras så att en ÅNGRAD flytt kan ta bort sin
  // historikpost — annars står en flytt som aldrig blev av kvar i loggen.
  return skapaHandelse(uid, {
    typ: 'flyttat',
    vaxtId: vaxt.id,
    platsId: tillPlatsId,
    franPlatsId: vaxt.platsId,
    tillPlatsId,
  })
}

/**
 * Flytt via ritningen: ny position, och om prickens nya läge hör till en annan
 * plats byts även platsen (med flyttat-händelse).
 */
export function flyttaVaxtPaRitningen(
  uid: string,
  vaxt: Vaxt,
  x: number,
  y: number,
  tillPlatsId: string | undefined,
): string | undefined {
  if (tillPlatsId && tillPlatsId !== vaxt.platsId) {
    void updateDoc(doc(vaxtCol(uid), vaxt.id), {
      platsId: tillPlatsId,
      position: { x, y },
    }).catch(loggaFel)
    // Samma regel som flyttaVaxt: första platsen är ingen flytt. Id:t
    // returneras så att ångra kan radera historikposten.
    if (vaxt.platsId) {
      return skapaHandelse(uid, {
        typ: 'flyttat',
        vaxtId: vaxt.id,
        platsId: tillPlatsId,
        franPlatsId: vaxt.platsId,
        tillPlatsId,
      })
    }
    return undefined
  }
  placeraVaxt(uid, vaxt.id, x, y)
  return undefined
}

/** Planerad → finns, med en planterat-händelse daterad i dag. */
export function markeraPlanterad(uid: string, vaxt: Vaxt): void {
  void updateDoc(doc(vaxtCol(uid), vaxt.id), { status: 'finns' }).catch(loggaFel)
  skapaHandelse(uid, { typ: 'planterat', vaxtId: vaxt.id, platsId: vaxt.platsId })
}

export function markeraPlatsAnlagd(uid: string, plats: Plats): void {
  void updateDoc(doc(platsCol(uid), plats.id), { status: 'finns' }).catch(loggaFel)
  skapaHandelse(uid, { typ: 'planterat', platsId: plats.id })
}

/** Tar även bort växtens händelser och alla deras foton. */
export function taBortVaxt(uid: string, vaxt: Vaxt, handelser: Handelse[]): void {
  void deleteDoc(doc(vaxtCol(uid), vaxt.id)).catch(loggaFel)
  void stadaHandelser(uid, 'vaxtId', vaxt.id, handelser).catch(loggaFel)
}

/* ---------------------------------------------------------------- skuggkällor */

function tillSkuggkalla(snap: QueryDocumentSnapshot<DocumentData>): Skuggkalla {
  const d = snap.data()
  const geometri = franLagradGeometri(d.geometri)
  return {
    id: snap.id,
    tradgardId: typeof d.tradgardId === 'string' ? d.tradgardId : '',
    namn: typeof d.namn === 'string' ? d.namn : '',
    punkter: geometri?.punkter ?? [],
    hojdM: typeof d.hojdM === 'number' ? d.hojdM : 0,
  }
}

export function lyssnaPaSkuggkallor(
  uid: string,
  mottagare: (v: Skuggkalla[]) => void,
): () => void {
  return onSnapshot(
    skuggkallaCol(uid),
    (snap) =>
      mottagare(snap.docs.map(tillSkuggkalla).sort((a, b) => sorterare.compare(a.namn, b.namn))),
    loggaLasfel,
  )
}

export function skapaSkuggkalla(
  uid: string,
  falt: { tradgardId: string; namn: string; punkter: PunktM[]; hojdM: number },
): string {
  const ny = doc(skuggkallaCol(uid))
  void setDoc(ny, {
    tradgardId: falt.tradgardId,
    namn: falt.namn,
    geometri: tillLagradGeometri({ punkter: falt.punkter }),
    hojdM: falt.hojdM,
  }).catch(loggaFel)
  return ny.id
}

export function uppdateraSkuggkalla(
  uid: string,
  id: string,
  falt: Partial<{ namn: string; punkter: PunktM[]; hojdM: number }>,
): void {
  const uppdatering: Record<string, unknown> = {}
  if ('namn' in falt) uppdatering.namn = falt.namn
  if ('hojdM' in falt) uppdatering.hojdM = falt.hojdM
  if (falt.punkter) uppdatering.geometri = tillLagradGeometri({ punkter: falt.punkter })
  if (Object.keys(uppdatering).length === 0) return
  void updateDoc(doc(skuggkallaCol(uid), id), uppdatering).catch(loggaFel)
}

export function taBortSkuggkalla(uid: string, id: string): void {
  void deleteDoc(doc(skuggkallaCol(uid), id)).catch(loggaFel)
}

/* ------------------------------------------------------------------ händelser */

export interface HandelseFalt {
  typ: HandelseTyp
  vaxtId?: string
  platsId?: string
  fotoRef?: string
  anteckning?: string
  franPlatsId?: string
  tillPlatsId?: string
  /** Endast för migrerad/backdaterad data. */
  datum?: string
}

export function skapaHandelse(uid: string, falt: HandelseFalt): string {
  const ny = doc(handelseCol(uid))
  void setDoc(
    ny,
    utanUndefined({ ...falt, datum: falt.datum ?? new Date().toISOString() }),
  ).catch(loggaFel)
  return ny.id
}

/**
 * Skriver tillbaka en händelse med SAMMA id — motstycket till aterskapaPlats,
 * för ångra av platsradering. Utan den kommer platsen tillbaka men inte dess
 * historik, och "Går att ångra" vore en lögn.
 */
export function aterskapaHandelse(uid: string, handelse: Handelse): void {
  const { id, ...falt } = handelse
  void setDoc(doc(handelseCol(uid), id), utanUndefined({ ...falt })).catch(loggaFel)
}

export function taBortHandelse(uid: string, id: string): void {
  void deleteDoc(doc(handelseCol(uid), id)).catch(loggaFel)
}

function stadaFoton(fotoRefs: string[]): void {
  if (fotoRefs.length === 0) return
  void (async () => {
    const { taBortFoto } = await import('../lib/photoStore')
    await Promise.all(fotoRefs.map(taBortFoto))
  })().catch(loggaFel)
}

/**
 * Raderar händelser för ett mål och städar deras foton. Frågar även den lokala
 * cachen — vyns state kan sakna poster som just skrivits.
 */
async function stadaHandelser(
  uid: string,
  falt: 'vaxtId' | 'platsId',
  varde: string,
  kanda: Handelse[],
  /** Extra filter: bara händelser som passerar raderas. */
  galler: (h: Handelse) => boolean = () => true,
  alternativ: { bevaraFoton?: boolean; vidStadat?: (handelser: Handelse[]) => void } = {},
): Promise<void> {
  let cachade: Handelse[] = []
  try {
    const snap = await getDocs(query(handelseCol(uid), where(falt, '==', varde)))
    cachade = snap.docs.map(tillHandelse)
  } catch {
    cachade = []
  }
  const alla = new Map(
    [...kanda, ...cachade].filter(galler).map((h) => [h.id, h] as const),
  )
  alternativ.vidStadat?.([...alla.values()])
  for (const handelse of alla.values()) taBortHandelse(uid, handelse.id)
  if (!alternativ.bevaraFoton) {
    stadaFoton([...alla.values()].flatMap((h) => (h.fotoRef ? [h.fotoRef] : [])))
  }
}

/* ------------------------------------------------------------------ migrering */

/**
 * Källäsning för migreringen. I molnläge läses FRÅN SERVERN: en tom lokal
 * cache (ny webbläsare, offline, nekad läsning) ser annars ut precis som
 * "ingen data finns", och då skulle stämpeln sättas och verklig molndata
 * strandas för alltid. undefined betyder "gick inte att läsa" — det är något
 * HELT annat än en tom lista.
 */
async function lasForMigrering(ref: Query): Promise<QueryDocumentSnapshot<DocumentData>[] | undefined> {
  try {
    const snap = appLage === 'moln' ? await getDocsFromServer(ref) : await getDocs(ref)
    return snap.docs
  } catch {
    // I lokalt läge finns ingen server — cachen ÄR sanningen, och ett fel
    // där betyder "finns inte", inte "vet inte".
    return appLage === 'moln' ? undefined : []
  }
}

async function lasDokForMigrering(
  ref: DocumentReference,
): Promise<{ finns: boolean; data: DocumentData | undefined } | undefined> {
  try {
    const snap = appLage === 'moln' ? await getDocFromServer(ref) : await getDoc(ref)
    return { finns: snap.exists(), data: snap.data() }
  } catch {
    // getDoc med avstängt nätverk KASTAR för dokument som inte ligger i
    // cachen ("client is offline") — i lokalt läge betyder det bara att
    // dokumentet inte finns.
    return appLage === 'moln' ? undefined : { finns: false, data: undefined }
  }
}

async function hamtaAlla<T>(
  ref: ReturnType<typeof collection>,
  omvandla: (snap: QueryDocumentSnapshot<DocumentData>) => T,
): Promise<T[] | undefined> {
  const docs = await lasForMigrering(ref)
  return docs?.map(omvandla)
}

/**
 * Körs en gång per datamängd innan UI:t visar något. Migrerar v1 → v2 och
 * sår de tre trädgårdarna. Är datamängden tom blir resultatet bara
 * trädgårdarna — samma kodväg täcker både migrering och första start.
 *
 * OBS: lokalt läge och molnläge är SKILDA datamängder och migreras var för sig.
 * Gamla kollektioner raderas aldrig — det är hela rollbacken.
 */
export async function sakerstallDatamodell(uid: string, personligUid?: string): Promise<void> {
  const db = getDb()
  let redanGjord = false
  try {
    const stampel = await getDoc(migreringDoc(uid))
    redanGjord = (stampel.data()?.version ?? 0) >= MIGRERINGSVERSION
  } catch {
    redanGjord = false
  }
  if (redanGjord) return

  // Trädgården blev gemensam. Data som skrevs medan den låg under det
  // personliga kontot flyttas hit — kopieras, aldrig raderas.
  if (personligUid && personligUid !== uid) {
    const flytt = await flyttaHitPersonligData(uid, personligUid)
    if (flytt === 'flyttat') return
    // Gick källorna inte att läsa får INGEN stämpel sättas — en tom läsning
    // och "finns ingen data" är två olika saker. Nästa start försöker igen.
    if (flytt === 'okant') return
  }

  // v1-data ligger under det personliga kontot — trädgården blev gemensam
  // först i v2. Läs därifrån, inte från den (tomma) delade roten.
  const v1Rot = personligUid ?? uid
  const [kartaLast, areas, plants, logEntries] = await Promise.all([
    lasDokForMigrering(doc(db, 'users', v1Rot, 'garden', 'map')),
    hamtaAlla<V1Area>(collection(db, 'users', v1Rot, 'areas'), (s) => ({
      id: s.id,
      ...(s.data() as Omit<V1Area, 'id'>),
    })),
    hamtaAlla<V1Plant>(collection(db, 'users', v1Rot, 'plants'), (s) => ({
      id: s.id,
      ...(s.data() as Omit<V1Plant, 'id'>),
    })),
    hamtaAlla<V1LegacyLogg>(collection(db, 'users', v1Rot, 'logEntries'), (s) => ({
      id: s.id,
      ...(s.data() as Omit<V1LegacyLogg, 'id'>),
    })),
  ])
  if (kartaLast === undefined || !areas || !plants || !logEntries) return

  const karta = (() => {
    if (!kartaLast.finns || !kartaLast.data) return null
    const d = kartaLast.data
    return {
      widthM: typeof d.widthM === 'number' ? d.widthM : 0,
      heightM: typeof d.heightM === 'number' ? d.heightM : 0,
      objects: (Array.isArray(d.objects) ? d.objects : []).map((rad: Record<string, unknown>) => ({
        id: typeof rad.id === 'string' ? rad.id : '',
        type: typeof rad.type === 'string' ? rad.type : 'annat',
        name: typeof rad.name === 'string' ? rad.name : '',
        points: (Array.isArray(rad.points) ? rad.points : []).map(
          (p: { x?: number; y?: number }): PunktM => [p?.x ?? 0, p?.y ?? 0],
        ),
        note: typeof rad.note === 'string' ? rad.note : undefined,
      })),
    }
  })()

  const v1: V1Data = { karta, areas, plants, logEntries }
  const v2 = migreraV1TillV2(v1, new Date().toISOString())

  // Dokument som redan finns skrivs ALDRIG över — en halvkörd eller sent
  // omkörd migrering får inte klippa bort redigeringar som gjorts sedan dess
  // (omdöpta trädgårdar, flyttade växter, nya anteckningar).
  const [harTradgardar, harPlatser, harVaxter, harHandelser] = await Promise.all([
    hamtaAlla(tradgardCol(uid), (s) => s.id),
    hamtaAlla(platsCol(uid), (s) => s.id),
    hamtaAlla(vaxtCol(uid), (s) => s.id),
    hamtaAlla(handelseCol(uid), (s) => s.id),
  ])
  if (!harTradgardar || !harPlatser || !harVaxter || !harHandelser) return
  const befintliga = {
    tradgardar: new Set(harTradgardar),
    platser: new Set(harPlatser),
    vaxter: new Set(harVaxter),
    handelser: new Set(harHandelser),
  }

  const batch = writeBatch(db)
  for (const tradgard of v2.tradgardar) {
    if (befintliga.tradgardar.has(tradgard.id)) continue
    const { id, ...falt } = tradgard
    batch.set(doc(tradgardCol(uid), id), utanUndefined(falt))
  }
  for (const plats of v2.platser) {
    if (befintliga.platser.has(plats.id)) continue
    const { id, geometri, ...falt } = plats
    batch.set(
      doc(platsCol(uid), id),
      utanUndefined({
        ...falt,
        geometri: geometri ? tillLagradGeometri(geometri) : undefined,
      }),
    )
  }
  for (const vaxt of v2.vaxter) {
    if (befintliga.vaxter.has(vaxt.id)) continue
    const { id, ...falt } = vaxt
    batch.set(doc(vaxtCol(uid), id), utanUndefined(falt))
  }
  for (const handelse of v2.handelser) {
    if (befintliga.handelser.has(handelse.id)) continue
    const { id, ...falt } = handelse
    batch.set(doc(handelseCol(uid), id), utanUndefined(falt))
  }
  batch.set(migreringDoc(uid), { version: MIGRERINGSVERSION })

  // Fire-and-forget mot cachen, precis som övriga skrivningar. Stämpeln
  // ligger i SAMMA batch som datan — de blir varaktiga tillsammans eller
  // inte alls, så en avbruten körning kan aldrig lämna en stämpel utan data.
  void batch.commit().catch(loggaFel)
}

/**
 * Kopierar en v2-datamängd från det personliga kontot till den delade roten.
 * Dokument-id:n behålls, så alla referenser (platsId, vaxtId, fotoRef) fortsätter
 * peka rätt. Returnerar true om något faktiskt fanns att flytta.
 *
 * Foton rörs inte: fotoRef är en lagringsväg under det gamla kontot, och
 * storage-reglerna släpper in båda ägarna överallt under users/.
 */
async function flyttaHitPersonligData(
  till: string,
  fran: string,
): Promise<'flyttat' | 'ingenting' | 'okant'> {
  const db = getDb()
  const namn = ['tradgardar', 'platser', 'vaxter', 'handelser'] as const

  const kallor = await Promise.all(
    namn.map(async (n) => ({ n, docs: await lasForMigrering(collection(db, 'users', fran, n)) })),
  )
  // Kunde någon källa inte läsas vet vi INTE att där är tomt — avbryt utan
  // stämpel och låt nästa start försöka igen.
  if (kallor.some((k) => k.docs === undefined)) return 'okant'

  // Räkna ALLT — en personlig rot med bara trädgårdar och händelser är också
  // data som inte får överges.
  const totalt = kallor.reduce((n, k) => n + (k.docs?.length ?? 0), 0)
  if (totalt === 0) return 'ingenting'

  const batch = writeBatch(db)
  let antal = 0
  for (const { n, docs } of kallor) {
    for (const d of docs ?? []) {
      batch.set(doc(collection(db, 'users', till, n), d.id), d.data())
      antal++
    }
  }
  batch.set(migreringDoc(till), { version: MIGRERINGSVERSION, flyttadFran: fran })
  void batch.commit().catch(loggaFel)
  console.info(`Ripvägen 11: flyttade ${antal} dokument till den delade trädgården.`)
  return 'flyttat'
}

type V1LegacyLogg = V1LogEntry

export function seedTradgardar(): Tradgard[] {
  return grundTradgardar()
}
