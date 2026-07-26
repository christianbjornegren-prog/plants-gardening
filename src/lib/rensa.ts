/** Firestore accepterar inte undefined-värden — ta bort dem före skrivning. */
export function utanUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const rensat: Record<string, unknown> = {}
  for (const [nyckel, varde] of Object.entries(obj)) {
    if (varde !== undefined) rensat[nyckel] = varde
  }
  return rensat
}
