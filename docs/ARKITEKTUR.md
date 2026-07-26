# Arkitektur — beslut och motiv

Uppdateras vid varje arkitekturval, i samma commit som ändringen.

## Stack (Fas 0)

- **React 19 + TypeScript (strict) + Vite 8.** CLAUDE.md angav React 18; mallen
  `npm create vite` gav React 19 som är bakåtkompatibelt och stöds av alla våra
  bibliotek. Vi stannar på 19 i stället för att nedgradera. `strict` och
  `noUncheckedIndexedAccess` är på.
- **Tailwind v4** via `@tailwindcss/vite`. Alla designtokens i `@theme` i
  `src/index.css`. Inga godtyckliga färger i komponenter.
- **Typsnitt via Fontsource** (npm), importeras i `main.tsx`. Ingen CDN.
- **vite-plugin-pwa** med `generateSW`. Ikonerna genereras av
  `scripts/generate-icons.mjs` (Playwright ritar SVG → PNG).

## Lokalt läge kontra molnläge

Miljön saknar Firebase-projekt (och Java för emulatorer). Beslut:

- `src/lib/lage.ts` läser `VITE_FIREBASE_API_KEY`:
  - **lokal** (ingen config): Firestore initieras med `persistentLocalCache`
    och `disableNetwork()`. Samma kodväg som molnläget, men all data stannar i
    webbläsarens IndexedDB. Ingen inloggning — fast uid `agare` (en användare,
    se CLAUDE.md).
  - **moln** (config i `.env.local`): nätverket på, Firebase Auth med
    e-post/lösenord, data synkas.
- Konsekvens för datalagret: **skriv-anrop väntar aldrig på servern.**
  Skrivningar görs fire-and-forget mot cachen och UI:t lyssnar med
  `onSnapshot`. Det är rätt mönster även i molnläge (offline-first).
- Foton: Firebase Storage saknar offline-stöd, därför abstraheras foton bakom
  `photoStore` (Fas 1): lokal implementation = IndexedDB, moln = Storage.

## Kodsplittring

`src/lib/lage.ts` är medvetet fri från Firebase-importer. `src/lib/firebase.ts`
importeras **endast dynamiskt** (`await import`) så att hela Firebase-SDK:t
ligger i en egen chunk (~112 kB gzip) som laddas först när datalagret används.

## Teststrategi

- **Vitest + Testing Library (jsdom):** ren logik och presentationskomponenter.
  Firestore körs inte i jsdom (kräver IndexedDB) — komponenter som behöver data
  testas via e2e i riktig webbläsare.
- **Playwright:** flöden, alltid i två projekt: `desktop` (1280×800) och
  `mobil` (390×844, touch). Egen port **5273** (`--strictPort`) för att aldrig
  krocka med andra dev-servrar.

## E2E och dev-server

Playwrights `webServer` startar `npm run dev -- --port 5273 --strictPort` och
återanvänder en redan startad server på samma port.
