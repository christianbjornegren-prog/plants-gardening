# CLAUDE.md — Ripvägen 11

## Vad detta är

**Ripvägen 11** är en personlig trädgårdsapp byggd för EN användare: en landskapsingenjör och hobbyodlare som sköter trädgården vid ett radhus. Hon sår sällan frön — hon köper växter, flyttar om dem och tar hand om trädgården. Appen är döpt efter husets adress och ska kännas som **hennes** app, inte en produkt.

Appen ska hjälpa henne att:
- Dokumentera trädgården (foton, anteckningar, skötsel)
- Hålla koll på vilka växter som står var — inklusive krukväxter inomhus
- Se sin tomt som en skalenlig, vacker karta

**Kärnprincip i datamodellen:** appen handlar om *platser och individer*, inte arter. Inga frödatabaser, inga såddkalendrar, ingen artdata. "Den här hortensian, som står där, som jag flyttade i maj."

## Icke förhandlingsbart

1. **Mobile-first i användning, desktop-first i redigering.** Kartan ritas och kalibreras på dator (mus, stor skärm). Allt dagligt — titta, fota, logga, flytta växtprickar — ska vara friktionsfritt i mobilen. Samma responsiva app, aldrig två appar.
2. **Minimalistisk och självförklarande.** Ingen onboarding, inga tooltips-karuseller. Max tre tryck till varje vanlig handling.
3. **All UI-text på svenska.** Vardagligt trädgårdsspråk: "Vattnat", "Flytta", "Rabatten vid staketet" — aldrig systemspråk.
4. **Robusthet före features.** En halvfärdig feature ska aldrig ligga i main. Se Arbetsflöde nedan.
5. **En användare.** Ingen delning, inga roller. Auth = en enda inloggning (Firebase Auth, e-post/lösenord), hårdkodat konto i prototypen.

## Stack och installation (första sessionen)

Kör detta först, verifiera att allt fungerar innan någon kod skrivs:

```bash
npm create vite@latest ripvagen-11 -- --template react-ts
cd ripvagen-11
npm install firebase react-router-dom
npm install -D tailwindcss @tailwindcss/vite
npm install -D vite-plugin-pwa
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
npm install -D @playwright/test && npx playwright install chromium
```

- **React 18 + TypeScript + Vite** — strikt TS (`"strict": true`), inga `any`.
- **Tailwind v4** (via `@tailwindcss/vite`) — alla designtokens definieras i `@theme`, aldrig godtyckliga färger inline.
- **Firebase**: Firestore (data), Storage (foton), Auth, Hosting. Offline-persistens PÅ från dag 1 (`persistentLocalCache`) — trädgården har dålig täckning ibland.
- **vite-plugin-pwa** — installbar på hemskärmen, manifest med namn "Ripvägen 11".
- **Kartan är handbyggd SVG.** Inget kartbibliotek, ingen canvas-lib. Pointer events + SVG viewBox räcker och ger full kontroll.
- **Ingen state-lib.** React context + Firestore-lyssnare. Lägg inte till zustand/redux.
- **Inga datumbibliotek.** Native `Intl` och `Date`.
- Testning: **Vitest + Testing Library** (enhet/komponent), **Playwright** (flöden, körs i både desktop- och mobilviewport 390×844).

## Arkitektur och datamodell

### Koordinatsystem: allt i meter

Kartans koordinatsystem är **verkliga meter**, origo i tomtens ena hörn. SVG:s `viewBox` sköter skala, zoom och panorering. "Skalenligt" är alltså inte en feature — det är datamodellen. Användaren anger tomtens mått en gång vid setup; därefter är allt som ritas automatiskt i skala.

### Firestore-struktur

```
users/{uid}/
  garden/map              ← ETT dokument: hela kartan
    { widthM, heightM, objects: [ {id, type, name, points: [[x,y],...], note} ] }
  areas/{areaId}          ← ytor som kan innehålla växter (rabatt, pallkrage, fönsterbräda…)
    { name, mapObjectId?, sunExposure?, soil?, note? }
  plants/{plantId}
    { name, areaId, position?: {x,y}, photoRefs: [], note,
      moveHistory: [ {fromAreaId, toAreaId, date} ] }
  logEntries/{entryId}
    { plantId?, areaId?, type: 'vattnat'|'gödslat'|'beskuret'|'planterat'|'anteckning',
      date, note?, photoRef? }
```

- **Kartobjekt är polygoner + typ.** Rektangel är ett specialfall. Typer: `bod | altan | rabatt | gräsmatta | pallkrage | häck | träd | staket | annat`. Typen styr färg/stil på kartan och logik: `rabatt`, `pallkrage` (m.fl.) kan kopplas till en yta som innehåller växter; `bod` kan inte.
- **Yta ≠ kartobjekt.** En yta kan sakna kartposition (t.ex. "Köksfönstret"). Ett kartobjekt kan sakna yta (t.ex. staketet). Koppling via `mapObjectId` när båda finns.
- Foton i Firebase Storage: `users/{uid}/photos/{id}.jpg`, komprimerade klientside till max 1600 px innan uppladdning.

### Kartinteraktion

- **Desktop (redigeringsläge):** rita polygon genom att klicka ut hörn, dubbelklick avslutar. Markera objekt → dra hörnpunkter, sätt typ/namn, ange mått. Snap till 0,1 m.
- **Mobil (levande läge):** panorera/zooma (pinch), tryck på objekt → infokort, dra växtprickar för att flytta (skapar automatiskt en post i `moveHistory`). Ingen polygonritning i mobilen i v1.
- Redigeringsläget är en explicit toggle, inte skärmstorleksdetektering — men UI:t föreslår rätt läge per enhet.

## Design — "Ripvägen 11"

Appen ska kännas som en **trädgårdsjournal för just den här tomten**, inte som en generisk app. Första intrycket ska vara "wow, det här är vår trädgård".

### Palett — hämtad från den verkliga trädgården

Definiera som Tailwind-tokens i `@theme`:

| Token | Hex | Från |
|---|---|---|
| `--color-panel` | `#232823` | Svartbetsad bod och staket — mörk yta, header, kartans linjer |
| `--color-tra` | `#C9B694` | Altantrallens obehandlade trä — varma ytor, kort |
| `--color-orm` | `#4E6B44` | Ormbunkar och grönska — primär grön, växtprickar |
| `--color-lov` | `#8FA96F` | Ljusare lövverk — sekundär grön, gräsytor på kartan |
| `--color-fermob` | `#D3442E` | Den röda trädgårdssoffan — ENDA accentfärgen, används mycket sparsamt (primär knapp, aktiv markering) |
| `--color-ljus` | `#F7F5F0` | Bakgrund |

### Typografi

- **Display** (rubriker, appnamnet): *Bricolage Grotesque* — karaktär utan att vara gullig.
- **Brödtext/UI:** *Instrument Sans*.
- **Mått och koordinater:** *IBM Plex Mono* — en diskret CAD-blinkning: alla metervärden ("4,2 m") sätts alltid i mono.

Ladda via Fontsource (npm), inte Google Fonts-CDN.

### Signaturmomentet (wow)

**Startvyn ÄR kartan.** När appen öppnas ritas tomten fram som en tuschritning: kartobjektens konturer animeras med SVG stroke-dashoffset (~1,2 s totalt, orkestrerat: tomtgräns → altan → bod → rabatter), därefter tonar fyllnadsfärgerna in och växtprickarna landar. Appnamnet "Ripvägen 11" visas som en liten adresskylt (mörk panel, ljus text) i kartans hörn. Respektera `prefers-reduced-motion` — då visas kartan direkt.

Detta är den enda stora animationen. Allt annat är stilla och precist. I minimalistisk design ligger kvaliteten i spacing, typografi och detaljer — lägg omsorgen där.

### Övrigt

- Kartans färgton skiftar diskret med årstid (beräknat från datum): svalare grön april–maj, mättad juni–aug, varmare ton sep–okt, avmättad nov–mars. Subtilt — en tonjustering, inte ett tema.
- Tomma vyer är inbjudningar: "Här bor inga växter än. Lägg till den första." — aldrig bara tomt.
- Touchytor minst 44×44 px. Synligt tangentbordsfokus på desktop.

## Arbetsflöde och robusthet

### Dokumentstruktur i repot

```
CLAUDE.md            ← denna fil
docs/
  ARKITEKTUR.md      ← beslut och motiv, uppdateras vid varje arkitekturval
  DATAMODELL.md      ← Firestore-schemat, alltid i synk med koden
  TESTPLAN.md        ← vad som testas, hur, och kända luckor
  BACKLOG.md         ← faser, klart/pågår/senare — uppdateras varje session
  DESIGNLOGG.md      ← designbeslut + noteringar om vad som provats och förkastats
```

Uppdatera relevant md-fil **i samma commit** som ändringen. Dokument som släpar efter är värre än inga dokument.

### Iterationsloop — gäller varje feature

1. Skriv/uppdatera test först eller parallellt (Vitest för logik, Playwright för flödet).
2. Bygg.
3. Kör `npm run test` + relevant Playwright-flöde i **mobilviewport 390×844**. Ta skärmdump och granska kritiskt mot designavsnittet ovan.
4. Fixa. Upprepa 2–4 tills allt är grönt och skärmdumpen håller.
5. Först då: nästa feature. **Iterera aldrig vidare med röda tester.**

### Definition of done per feature

- [ ] Tester gröna (enhet + flöde)
- [ ] Fungerar i mobilviewport, verifierat med skärmdump
- [ ] Fungerar offline (Firestore-cache) där det är rimligt
- [ ] All text på svenska, följer designtokens
- [ ] Relevanta docs-filer uppdaterade
- [ ] Inga TS-fel, inga console-varningar

## Byggordning

**Fas 0 — Fundament:** Vite + Tailwind + Firebase-init + PWA + test-setup körbart. Designtokens och typografi på plats. En tom men snygg skal-app med adresskylten.

**Fas 1 — Ytor & växter:** CRUD för ytor (med solläge/jordmån som valfria fält) och växtkort (namn, foto, yta, anteckning). Fotouppladdning med komprimering.

**Fas 2 — Skötsellogg:** Logga vattnat/gödslat/beskuret på max tre tryck. Tidslinje per växt och per yta.

**Fas 3 — Kartan:** Meter-koordinatsystem, polygonredigering på desktop, typer med färger, växtprickar, mobil pan/zoom + dra-för-att-flytta. Startanimationen.

**Fas 4 — Polish:** Fototidslinje ("samma rabatt, april vs juli"), årstidston, offline-finslipning.

## Ingår INTE i v1 (lägg inte till)

- Artdatabaser, växtlexikon, såddkalendrar
- Påminnelser/notiser
- Väder-API
- Delning, flera användare
- AI-funktioner
- Export/import

---
*Byggd med kärlek för trädgården på Ripvägen 11.*
