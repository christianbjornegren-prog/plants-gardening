# CLAUDE.md — Ripvägen 11

## Vad detta är

**Ripvägen 11** är en personlig trädgårdsapp byggd för EN användare: en landskapsingenjör och hobbyodlare som sköter trädgården vid ett radhus. Hon sår sällan frön — hon köper växter, flyttar om dem och tar hand om trädgården. Appen är döpt efter husets adress och ska kännas som **hennes** app, inte en produkt.

Appen ska hjälpa henne att:
- Dokumentera trädgården (foton, anteckningar, skötsel)
- Hålla koll på vilka växter som står var — framsida, baksida och inomhus
- Se sina tomter som skalenliga, vackra ritningar
- Skissa hur det *ska* bli, inte bara hur det är

**Kärnprincip i datamodellen:** appen handlar om *platser och individer*, inte arter. Inga frödatabaser, inga såddkalendrar, ingen artdata. "Den här hortensian, som står där, som jag flyttade i maj."

## Icke förhandlingsbart

1. **Mobile-first i användning, desktop-first i ritande.** Ritningen kalibreras på dator (mus, stor skärm). Allt dagligt — titta, fota, logga, flytta växtprickar, placera växter — ska vara friktionsfritt i mobilen. Samma responsiva app, aldrig två appar.
2. **Minimalistisk och självförklarande.** Ingen onboarding, inga tooltips-karuseller. Max tre tryck till varje vanlig handling.
3. **All UI-text på svenska.** Vardagligt trädgårdsspråk: "Vattnat", "Flytta", "Rabatten vid staketet" — aldrig systemspråk.
4. **Allt utom namnet är valfritt.** En växt behöver ett namn. Foto, plats, sol, jord, kartposition — allt annat kan läggas till när som helst, eller aldrig. Inga obligatoriska fält, inga wizards.
5. **Man ska aldrig behöva skapa något för att skapa något annat.** En växt kan ligga hemlös och tilldelas plats senare. En plats kan sakna form. Ett tomt tillstånd bjuder in, det spärrar aldrig.
6. **Robusthet före features.** En halvfärdig feature ska aldrig ligga i main. Se Arbetsflöde nedan.
7. **En användare.** Ingen delning, inga roller. Auth = en enda inloggning (Firebase Auth, e-post/lösenord).

## Stack

- **React 19 + TypeScript + Vite** — strikt TS (`"strict": true`), inga `any`.
- **Tailwind v4** (via `@tailwindcss/vite`) — alla designtokens definieras i `@theme`, aldrig godtyckliga färger inline.
- **Firebase**: Firestore (data), Storage (foton), Auth, Hosting. Offline-persistens PÅ från dag 1 (`persistentLocalCache`).
- **vite-plugin-pwa** — installbar på hemskärmen, manifest med namn "Ripvägen 11".
- **Ritningen är handbyggd SVG.** Inget kartbibliotek, ingen canvas-lib. Pointer events + SVG viewBox.
- **Ingen state-lib.** React context + Firestore-lyssnare. Lägg inte till zustand/redux.
- **Inga datumbibliotek.** Native `Intl` och `Date`.
- Testning: **Vitest + Testing Library** (enhet/komponent), **Playwright** (flöden, körs i både desktop- och mobilviewport 390×844).

### Tillåtna UI-bibliotek

| Paket | Till vad | Varför inte själv |
|---|---|---|
| `motion` | Sheet-fysik, sidövergångar, delade element | Fjäderfysik och avbrytbara övergångar är svåra att få rätt |
| `vaul` | Bottensheets | Draggesten, snappunkter och fokusfångst |
| `sonner` | Toasts och Ångra | Kö, timers, svep-bort, tillgänglighet |
| `embla-carousel-react` | Fototidslinjen | Fritt svep med tröghet, 5 kB |

**shadcn/ui används INTE.** `npx shadcn init` skriver om `index.css` till sitt eget tokensystem och skulle skriva över `@theme`-paletten nedan. Behövs en tillgänglig primitiv som inte finns ovan, ta motsvarande `@radix-ui/react-*` direkt.

## Arkitektur och datamodell

### Begreppsmodellen

```
Trädgård        Framsidan · Baksidan · Inomhus
  └─ Plats      Rabatten vid staketet · Boden · Köksfönstret · Pallkrage 1
       └─ Växt  Hortensian · Basilikan
            └─ Händelse   foto · vattnat · gödslat · beskuret · planterat · flyttat · anteckning
```

Fyra begrepp, inga fler. Framför allt: **"yta" finns inte.** Det som ritas på ritningen och det som innehåller växter är **samma sak — en plats**. Ordet "yta" får inte förekomma i UI eller kod.

- **En plats är en plats i trädgården.** Den kan *ha* en form på ritningen, men behöver inte. "Köksfönstret" är en plats utan form. Boden är en plats med form men utan växter. Rabatten har både och.
- **Alla platser kan hålla växter.** Typen (`bod`, `staket`, `rabatt` …) styr bara ritstil och namnförslag — aldrig vad som är tillåtet. Att boden inte har växter är ett faktum om trädgården, inte en regel appen upprätthåller.
- **Varje trädgård har sin egen ritning.** Framsidan och Baksidan är två separata ritningar med egna mått. Inomhus har ingen ritning alls.
- **Foton är händelser.** Det finns ingen annan fotolagring. Varje foto har ett datum, vilket är hela förutsättningen för fototidslinjen.
- **Historik finns på ett ställe.** Flyttar, planteringar och skötsel är alla händelser. Ingen parallell `moveHistory`.

### Koordinatsystem: allt i meter

Ritningens koordinatsystem är **verkliga meter**, origo i tomtens ena hörn, per trädgård. SVG:s `viewBox` sköter skala, zoom och panorering. "Skalenligt" är inte en feature — det är datamodellen.

### Firestore-struktur

```
users/{uid}/
  tradgardar/{tradgardId}
    { namn, ordning, widthM?, heightM? }        ← saknas mått ⇒ ingen ritning
  platser/{platsId}
    { tradgardId, namn, typ, geometri?: {punkter:[{x,y}…]},
      sol?, jord?, vetterMot?, vaderstreck?, status, anteckning? }
  vaxter/{vaxtId}
    { namn, platsId?, position?: {x,y}, status,
      sort?, planterad?, antal?, sol?, jord?, anteckning? }
  handelser/{handelseId}
    { typ, datum, vaxtId?, platsId?, fotoRef?, anteckning?,
      franPlatsId?, tillPlatsId?, datumOkant? }
  meta/migrering
    { version }
```

- `status: 'finns' | 'planerad'` på både plats och växt. Planerat ritas streckat och listas separat på Hem.
- `vetterMot` (trädgårds-id) och `vaderstreck` erbjuds bara på platser utan geometri — det är så en fönsterbräda får ett läge.
- Firestore stödjer inte nästlade arrayer, därför lagras punkter som `[{x,y}]` men är tupler `[x,y]` i appen.
- Foton i Firebase Storage: `users/{uid}/photos/{id}.jpg`, komprimerade klientside till max 1600 px.

### Kuben — allt nås från alla håll

Växt, plats och ritning ska nås från varandras håll. Ingen påtvingad ingång.

- Från **ritningen**: tryck tom yta → *Placera en växt här* → lista över alla växter (sektionen **Utan plats** överst) eller *Fota en ny växt*.
- Från **växtkortet**: *Placera på ritningen* → hårkors → tryck → tillbaka.
- Från **platskortet**: växterna som står där, plus *Lägg till växt här*.
- På desktop i ritläge: panel med växter utan position, dragbara rakt in i formerna.

### Ritinteraktion

- **Desktop (ritläge):** rita polygon genom att klicka ut hörn, dubbelklick eller Enter avslutar, Esc ångrar sista hörnet. Markera objekt → dra hörnpunkter, sätt typ/namn/mått. Snap 0,1 m. Segmentlängder visas i mono under ritandet.
- **Kurvor:** varje hörn är en växel mellan mjukt och spetsigt (klicka på handtaget). Cirkel = mjukt, fyrkant = spetsigt. En D-formad rabatt är fyra punkter där de två på ena sidan är runda. Punkterna är sanningen, kurvan härleds (`lib/form.ts`).
- **Ritläget är tydligt märkt** med en fermob-tonad list och har alltid en **Klar**-knapp och en **Ångra**-knapp (Cmd/Ctrl+Z). Ångra-knappens etikett är fast — en etikett som växer radbryter verktygsraden och får ritytan att hoppa.
- **Flera ritningar per tomt:** "Baksidan" för nuläget, "Baksidan kommande" för hur det ska bli. Nya ritningar skapas från trädgårdsväxlaren.
- **Mobil (läsläge):** panorera/zooma (pinch), tryck på plats → bottensheet, dra växtprickar för att flytta (skapar en `flyttat`-händelse), placera växter, döpa om platser. Ingen polygonritning i mobilen.
- Ritläget är en explicit toggle och knappen visas bara ≥1024 px.

## Design — "Ripvägen 11"

Appen ska kännas som en **trädgårdsjournal för just den här tomten**. Fotona är det verkliga innehållet och ska bära det visuella.

### Brutna färger

Paletten är genomgående **brutna färger** — den nordiska målartraditionens lågmättade jordtoner. Inget är rent, allt matchar. Uttryckt som regel:

> **Kromtak: C ≤ 0,09 i OKLCH.** Varje färg i appen måste ligga under det. Enda undantaget är `fermob`, som ligger på 0,183 och är därför den enda färg som *kan* signalera. Regeln verifieras i test (`src/lib/palett.test.ts`).

Gränssnittet är mörkt — samma svartbetsade ton som boden och staketet. Mot mörk botten lyser trädgårdsfoton och gränssnittet försvinner till förmån för innehållet.

**Ljus ram** — en enda varm kulör (H ≈ 88°), jämna L-steg. Se docs/DESIGNLOGG.md för hela tabellen och varför rollerna bytte plats när botten blev ljus.

| Token | Hex | Roll | Kontrast mot panel |
|---|---|---|---|
| `--color-botten` | `#12110B` | App-bakgrund | — |
| `--color-panel` | `#24231B` | Kort, sheets, bottenrad. Boden och staketet | — |
| `--color-upphojd` | `#36342B` | Tryckt, valt, chips | — |
| `--color-linje` | `#49483E` | Hårlinjer, avdelare | 1,7:1 (avsiktligt) |
| `--color-dis-svag` | `#76756C` | Inaktivt, hjälptext | 3,4:1 |
| `--color-dis` | `#A09F96` | Sekundärtext, datum | 5,9:1 |
| `--color-ljus` | `#F7F5F0` | Primärtext | 14,5:1 |

**Trädgårdsfärgerna** — oförändrade sedan första dagen:

| Token | Hex | Från | Regel |
|---|---|---|---|
| `--color-tra` | `#C9B694` | Altantrallens obehandlade trä | Mått i mono, platsnamn på ritningen. 8,0:1 |
| `--color-lov` | `#8FA96F` | Ljusare lövverk | Läsbar grön, växtprickar. 6,1:1 |
| `--color-orm` | `#4E6B44` | Ormbunkar | **Endast fyllnad** — 2,6:1, aldrig text |
| `--color-fermob` | `#D3442E` | Den röda trädgårdssoffan | **Endast fylld yta**, ljus text ovanpå (4,5:1) |
| `--color-fermob-lyft` | `#E5644F` | — | Röd som *text*: aktiv flik, länk. 4,7:1 |

Fermob används mycket sparsamt — primär knapp, aktiv markering. Inget annat.

### Typografi

- **Display** (rubriker, appnamnet): *Fraunces* — serif. Skillnaden mellan "app" och "journal".
- **Brödtext/UI:** *Instrument Sans*.
- **Mått, datum och antal:** *IBM Plex Mono* — en diskret CAD-blinkning. Allt som är en mätning eller ett datum sätts i mono, utan undantag: `4,2 m` · `12 juni` · `14 växter`.

Ladda via Fontsource (npm), inte Google Fonts-CDN.

### Signaturmomentet: Ritningen

Kartan är inte en karta, den är en **ritning** — och den har ritningens material:

- **Hatchning per platstyp** som SVG-mönster: trall = parallella linjer, gräsmatta = stipplande punkter, rabatt = fin prickraster, häck = små bågar, träd = krona med skuggning.
- **Linjeviktshierarki:** tomtgräns grövst, byggnader därnäst, planteringar tunnare, växtprickar tunnast. Det är detta som skiljer en ritning från en wireframe.
- **Skalstock och norrpil** i mono, alltid synliga.
- **Platsnamn satta i ritningen** — versaler, spärrade, i trä-tonen, i formens tyngdpunkt.
- **Växtprickar bär miniatyren.** Tryck → pricken växer till en cirkulär bild av just den plantan.
- **Planerat ritas streckat.** Ritningskonvention, gratis semantik.
- **Startanimationen:** konturerna tecknas med SVG stroke-dashoffset (~1,2 s, orkestrerat: tomtgräns → altan → bod → rabatter), därefter tonar fyllnaderna in och prickarna landar. Respektera `prefers-reduced-motion`.

Det andra beatet är **fototidslinjen på växtkortet**: samma planta i april, juni och september bredvid varandra, datum i mono under varje bild. Det är den vy hon öppnar om tre år.

### Hållbarhet

Designen ska hålla i tio år, inte se ut som 2026.

1. **Ingen glasmorfism, inga gradienter, inget sken.** Ytor skiljs med ton och hårlinje.
2. **Typografi och spacing gör jobbet.** Åtta spacingsteg, fyra textstorlekar, hållna strikt.
3. **En rörelseidé, återanvänd.** Sheets, sidbyten och fototidslinjen delar samma kurva och varaktighet (220 ms, `cubic-bezier(.2,.8,.2,1)`, token `--ease-mjuk`). Ritningens tuschanimation är enda undantaget.

### Övrigt

- Tomma vyer är inbjudningar: "Här bor inga växter än. Börja med att fota något som växer." — aldrig bara tomt.
- **Fel är aldrig tysta.** Nekade skrivningar och läsningar går via `data/fel.ts` till `FelVakt` och visas. En knapp som "flimrar tillbaka" utan förklaring är en bugg, inte ett gränssnitt.
- Touchytor minst 44×44 px. Synligt tangentbordsfokus på desktop.
- Bottensheets i mobilen, aldrig modaler.

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

Uppdatera relevant md-fil **i samma commit** som ändringen.

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
- [ ] All text på svenska, följer designtokens, inga färger utanför kromtaket
- [ ] Relevanta docs-filer uppdaterade
- [ ] Inga TS-fel, inga console-varningar

## Ingår INTE i v1 (lägg inte till)

- Artdatabaser, växtlexikon, såddkalendrar (fältet **Sort** är fri text, hennes egna ord)

  **Gränsen mot namnlistan:** `src/data/vaxtnamn.json` är tillåten och är
  inte en artdatabas. Den innehåller *namn* — svenskt, latinskt, grov
  kategori — och ingenting annat: ingen skötsel, inga zoner, inga såddtider,
  ingen bevattningsrytm. Syftet är stavning och sökbarhet, inte kunskap om
  arter. Fri text vinner alltid; ett förslag kan aldrig krävas eller
  korrigera det hon skrivit. Växer filen till att bära egenskaper per art har
  gränsen passerats.
- Påminnelser/notiser
- Väder-API
- Delning, flera användare
- AI-funktioner
- Export/import
- Årstidston på ritningen (prövat och struket, se DESIGNLOGG.md)

---
*Byggd med kärlek för trädgården på Ripvägen 11.*
