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

## Kartan (Fas 3)

- **ViewBox i meter.** `useKartYta` äger viewBox-tillståndet; all zoom/pan är
  ren matematik i `lib/viewbox.ts` (testad). Skärm↔meter-konvertering via
  behållarens `getBoundingClientRect`.
- **Delade SVG-lager:** `KartobjektLager` (tomtgräns, polygoner, etiketter)
  och `VaxtPrickLager` används av både levande läget (`KartaView`) och
  redigeringsläget (`RedigeraKartaView`). Interaktion sköts av vyerna via
  `data-objekt-id`/`data-vaxt-id` + pointer events; lagren är rena renderare.
- **Skärmkonstant grafik:** `vector-effect: non-scaling-stroke` för linjer;
  etiketter och prickar skalas med meter-per-pixel (mpp) så de har konstant
  skärmstorlek. Prickarnas osynliga träffyta är 44 px.
- **Startanimationen:** stroke-dashoffset-teckning. Två lärdomar, betalda
  kontant: (1) Firestore tillåter inte nästlade arrayer (se DATAMODELL),
  (2) med non-scaling-stroke tolkas dash-mönster i *skärmpixlar* och
  `pathLength` hjälper inte — därför sätts dash-längden till omkrets/mpp i px
  inline, och `KartaView` stänger av animera-läget efter ~2,6 s så att
  dasharrayn försvinner helt (annars blir konturer streckade vid zoom).
  `prefers-reduced-motion` stänger av allt via CSS (med `!important` eftersom
  dash-värdena ligger inline).
- **Gester:** en pekare = panorera (tap-tröskel 8 px öppnar infokort), två =
  pinchzoom, pekare på prick = dra växt (släpp gör punkt-i-polygon-träff mot
  översta objektet och flyttar växten om objektets yta är en annan).
  Hjul-zoom registreras med `{ passive: false }` (Reacts onWheel är passiv).

## E2E och dev-server

Playwrights `webServer` startar `npm run dev -- --port 5273 --strictPort` och
återanvänder en redan startad server på samma port.

**Testmönster mot omladdningsracen:** i lokalt läge ackas skrivningar aldrig
av en server, så en `page.goto` (helsidesladdning) omedelbart efter en
skrivning kan riva sidan innan mutationen persisterats. Testerna väntar därför
på synlig UI-kvittens efter skrivningar och navigerar via appens länkar (SPA)
i stället för `goto` direkt efter skriv-operationer.
