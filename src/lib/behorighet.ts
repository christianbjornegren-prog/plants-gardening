/**
 * Vilka som får komma in. EN sanning, speglad på tre ställen:
 * den här listan, firestore.rules och storage.rules.
 * `behorighet.test.ts` ser till att de inte glider isär.
 *
 * Appens kontroll är bara artighet — den ger ett begripligt nej i stället för
 * en app som ser ut att fungera men inte kan läsa något. Det RIKTIGA låset är
 * säkerhetsreglerna, som körs på servern och inte går att kringgå.
 */
/**
 * All data ligger under EN rot som båda delar — Christian och Elin sköter
 * samma trädgård. Rutan är alltså inte "min data" utan "vår data"; reglerna
 * släpper in båda och isolerar mot alla andra.
 */
export const DELAD_DATAROT = 'delad'

export const TILLATNA_EPOSTER: readonly string[] = [
  'christian.bjornegren@gmail.com',
  'elinkristinaeriksson@gmail.com',
]

/**
 * Kräver verifierad e-post. Utan det skulle vem som helst kunna registrera ett
 * lösenordskonto på en av adresserna ovan och komma in — Google-inloggning ger
 * alltid verifierad adress, så kravet kostar oss ingenting.
 */
export function arBehorig(epost: string | null | undefined, verifierad = true): boolean {
  if (!epost || !verifierad) return false
  return TILLATNA_EPOSTER.includes(epost.trim().toLowerCase())
}
