export type AppLage = 'lokal' | 'moln'

/**
 * 'moln' när riktig Firebase-config finns i .env.local, annars 'lokal'.
 * I lokalt läge körs Firestore med enbart den beständiga cachen
 * (nätverket avstängt) — all data stannar i webbläsaren, men samma
 * kodväg används.
 *
 * OBS: lokalt läge och molnläge är SKILDA datamängder (olika projekt-id
 * och uid). Att fylla i .env.local startar med en tom molndatabas —
 * lokal data ligger kvar i webbläsaren men flyttas inte automatiskt.
 * Se docs/BACKLOG.md (migreringsverktyg är ett senare-ärende).
 *
 * Denna modul är medvetet fri från Firebase-importer så att skalet
 * kan läsa läget utan att dra in SDK:t i huvudbunten.
 */
export const appLage: AppLage = import.meta.env.VITE_FIREBASE_API_KEY ? 'moln' : 'lokal'
