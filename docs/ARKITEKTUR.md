# Arkitektur — beslut och motiv

Uppdateras vid varje arkitekturval, i samma commit som ändringen.

## Omtaget (v2) — begreppsmodellen

Den ursprungliga modellen hade **två begrepp för samma sak**: `Area` (yta) och
`MapObject` (kartobjekt), sammankopplade via `mapObjectId`, plus en regel
(`VAXTBARA_TYPER`) om vilka objekttyper som fick kopplas. Det gav tre fel som
alla hängde ihop:

1. Ingen kunde förklara vad en yta var i förhållande till en polygon.
2. `Plant.areaId` var obligatorisk ⇒ man **tvingades skapa en yta** innan man
   fick lägga till en växt.
3. Foton låg på två ställen (`Plant.photoRefs` och `LogEntry.photoRef`) och de
   förstnämnda **saknade datum** — därför kunde en fototidslinje aldrig fungera.

**Beslut:** slå ihop till ett begrepp, `Plats`. Geometrin blir ett valfritt fält
på platsen. Konsekvenser:

- `platsId` på växt är valfri. Hemlös växt = giltigt tillstånd.
- `VAXTBARA_TYPER` borttagen. Typen styr bara ritstil. Att boden inte har växter
  är ett faktum om trädgården, inte en regel appen upprätthåller.
- **Foton är händelser.** En källa, alltid daterad.
- **`moveHistory` borttagen.** En flytt är en `flyttat`-händelse. En historik,
  inte två.
- Flera trädgårdar (Framsidan/Baksidan/Inomhus), var och en med egen ritning
  eller ingen alls.

**Språk:** modellen är svensk hela vägen ner (`Tradgard`, `Plats`, `Vaxt`,
`Handelse`; kollektioner `tradgardar/platser/vaxter/handelser`). Tidigare hette
samma sak `Area` i typen, `skapaYta` i funktionen och "Yta" i UI:t — tre ord för
en sak, och översättningslagret var precis där förvirringen kunde gömma sig.

### Migrering

`src/data/migrering.ts` innehåller en **ren funktion** `migreraV1TillV2` som tar
hela den gamla datamängden och returnerar den nya. Den är testad mot fixtures
och vet ingenting om Firestore. `korMigrering` är den tunna drivaren som läser,
skriver och stämplar `meta/migrering`. Gamla kollektioner raderas aldrig —
migreringen är därmed rullbar tillbaka genom att nollställa stämpeln.

Foton från `plants.photoRefs` saknar datum i v1. De dateras till växtens äldsta
loggpost och flaggas `datumOkant: true`; UI:t visar `≈ maj 2026`. Att gissa ett
exakt datum vore att ljuga i en journal.

## Behörighet (v0.1)

Appen är privat för två personer. Låset ligger i **säkerhetsreglerna**, som
körs på servern: `request.auth.token.email` måste stå i en fast lista OCH
`email_verified` måste vara true. Utan verifieringskravet skulle vem som helst
kunna registrera ett lösenordskonto på en av adresserna och komma in.
Isoleringen per uid finns kvar — Christian och Elin ser fortfarande varsin
trädgård.

Samma lista finns i `src/lib/behorighet.ts`, men **appens kontroll är bara
artighet**: den ger ett begripligt nej i stället för en app som ser ut att
fungera men inte kan läsa något. `behorighet.test.ts` bevakar att listan i
koden och de två regelfilerna inte glider isär.

Inloggning sker med Google (`signInWithPopup`, med `signInWithRedirect` som
fallback när popup blockeras — vilket händer i installerade PWA:er).
`prompt: 'select_account'` tvingar fram kontoväljaren; två personer delar ofta
en dator och en app som tyst loggar in fel konto är svår att förstå.

Popup valdes framför redirect som förstahandsval eftersom `authDomain`
(`plants-gardeing.firebaseapp.com`) är en annan origin än appen
(`plants-gardeing.web.app`), och `signInWithRedirect` är känsligt för
cookie-partitionering i Safari i den konstellationen.

## Fel får inte vara tysta

Skrivningar är fire-and-forget mot cachen. Det är rätt mönster, men det gjorde
en nekad skrivning osynlig: Firestore lägger på ändringen lokalt, servern nekar
och ändringen rullas tillbaka. På skärmen såg det ut som att en knapp
"flimrade till och gick tillbaka", eller att ingenting hände. En nekad
LÄSNING var värre — lyssnaren dog tyst, `laddad` blev aldrig true och appen
stod vit för alltid.

`src/data/fel.ts` är en liten felkanal. Repot rapporterar både skriv- och
läsfel dit, `FelVakt` visar dem (toast för skrivningar, banner för läsningar,
med "Logga in igen" när det är behörighet som saknas), och `DataProvider`
släpper fram vyerna även när en lyssnare fallerat.

Detta upptäcktes skarpt: rules skärptes till att kräva `email_verified`, och
det befintliga lösenordskontot hade `emailVerified: false`. Servern nekade
allt — och appen sa ingenting.

## Kurvor

`src/lib/form.ts` gör om hörnlistan till en SVG-path. Varje hörn kan vara
RUNT eller SPETSIGT; runda hörn får Catmull-Rom-tangenter (spänning 1/6),
spetsiga blir riktiga knäckar. Rena raksträckor skrivs som `L` så att pathen
inte blir onödigt tung.

Träffytor, centroid och animationens dash-längd räknas på `formTillPolygon`
— kurvan samplad till en tät polygon. Annars skulle ett tryck bredvid en
utbuktande kant missa, och tuschanimationen bli fel lång.

## Kuben

Växt, plats och ritning nås från varandras håll, utan påtvingad ingång:
ritningen kan placera en befintlig växt, växtkortet kan hoppa till ritningen i
placeringsläge, platskortet kan skapa växt på plats. Implementeras med ett
delat `PlaceraContext` (`src/data/PlaceraProvider.tsx`) som håller "vad ska
placeras härnäst" över navigering, i stället för att skicka state via
router-parametrar genom fyra vyer.

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

## Slutgranskningens lärdomar (multi-agent-review)

Bekräftade fynd som åtgärdats — mönster värda att minnas:

- **Arrayordning är z-ordning:** `sparaKartobjekt` ersätter objekt PÅ PLATS i
  `objects[]` — append-vid-redigering ändrade både rendering och yt-träffar.
- **IndexedDB-skrivningar** bekräftas på `transaction.oncomplete` (inte
  `request.onsuccess`) — annars kan kvotslut ge en photoRef mot en blob som
  aldrig committades.
- **URL-cachen i photoStore håller löften**, inte färdiga URL:er — samtidiga
  hämtningar av samma foto delar en objectURL i stället för att läcka en.
- **Pekar-id-disciplin:** varje gest äger sina pointerId:n; extra fingrar
  ignoreras och `pointercancel` committar ALDRIG (koordinaterna är opålitliga).
- **Ytbyte vid prick-släpp** avgörs av översta VÄXTBARA objekt med kopplad
  yta — träd/bod ovanpå en rabatt slukar inte släppet.
- **`arrayUnion`** för moveHistory/photoRefs i stället för hela arrayen från
  klient-state.
- **Loggstädning** vid borttagning frågar även den lokala cachen
  (`getDocsFromCache`), inte bara vyns state.

## E2E och dev-server

Playwrights `webServer` startar `npm run dev -- --port 5273 --strictPort` och
återanvänder en redan startad server på samma port.

**CI körde först rött på precis denna race.** Testet som tar bort en plats
gjorde `page.goto('/vaxter')` direkt efter raderingen och tappade skrivningen
på en långsammare maskin. Regeln är därför skärpt: e2e navigerar via appens
egna länkar (`gaTill`-hjälparen), och `page.goto` används bara som ett
testets FÖRSTA steg, aldrig efter en skrivning.

**Testmönster mot omladdningsracen:** i lokalt läge ackas skrivningar aldrig
av en server, så en `page.goto` (helsidesladdning) omedelbart efter en
skrivning kan riva sidan innan mutationen persisterats. Testerna väntar därför
på synlig UI-kvittens efter skrivningar och navigerar via appens länkar (SPA)
i stället för `goto` direkt efter skriv-operationer.
