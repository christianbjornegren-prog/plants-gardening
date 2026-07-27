# Testplan

## Hur

- `npm run test` — Vitest + Testing Library (jsdom). Ren logik och
  presentationskomponenter. Auto-cleanup mellan tester via `src/test/setup.ts`.
- `npm run e2e` — Playwright, alltid två projekt: **desktop** (1280×800) och
  **mobil** (390×844, touch, deviceScaleFactor 3). Kör mot dev-server på port
  5273, startad med `npm run dev:lokal`.
- Skärmdumpar för designgranskning: `node scripts/skarmdump.mjs <utkatalog>`.
  Skriptet sår en demoträdgård **genom UI:t** och fotograferar alla vyer.

**Lokalt läge tvingas i test.** `VITE_LAGE=lokal` (via `npm run dev:lokal`)
kringgår `.env.local`. Utan det fastnar hela sviten på inloggningsskärmen på en
maskin som har ett Firebase-projekt konfigurerat.

## Enhetstester

| Område | Test |
|---|---|
| **Migrering v1→v2** | trädgårdar sås, kartobjekt → plats med samma id, ytan smälter in (ytans namn vinner), yta utan kartobjekt behålls, yta mot raderat objekt tappas inte, okänd typ → 'annat', växt mot okänd yta blir hemlös, `photoRefs` → daterade fotohändelser med `datumOkant`, loggpost med foto → typ 'foto', `moveHistory` → exakta flyttar, sortering, **idempotens**, tom datamängd |
| **Paletten** | PALETT speglar `@theme` exakt; inga färgtokens utanför PALETT; **kromtaket C ≤ 0,09** per token; fermob är enda undantaget; bark-rampen håller kulör och är monotont ljusare; kontrast AA/AAA per roll; fyllnadsfärger klarar INTE brödtext (regeln är därför nödvändig); fermob-fyllning kräver ren vit text |
| **Händelser** | urval per växt/plats, historik följer växten vid flytt, fototidslinje **äldst först**, bara poster med bild, senaste fotot per växt, tidsfönster, "inte fotad på länge" (aldrig fotade först, planerade räknas inte) |
| **Former och kurvor** | runda hörn som data (växla, sortera, alla); spetsig form ger raka `L` utan bezier; runda hörn ger `C`; sluten/öppen path; degenererade former; samplad polygon går genom hörnen; **D-form buktar ut men behåller den raka kanten**; punkt i utbuktningen räknas som inne |
| **Behörighet** | listan speglas exakt i båda regelfilerna; reglerna kräver `email_verified`; isolering per uid kvar; allt utanför `users/` stängt; `arBehorig` normaliserar och nekar overifierat |
| **Växtplacering** | sparad position, autoplacering i formen, determinism, spridning, hemlösa ritas inte, platser utan form ritas inte, bara efterfrågad trädgård; `platsVidPunkt` med z-ordning |
| **Geometri** | snap, centroid, punkt-i-polygon (även icke-konvex), omkrets, bbox, `skalaTillMatt` |
| **ViewBox** | anpassa/zooma/panorera/begränsa |
| **Formatering** | `formatMeter`, `formatDatum`, bildkomprimering, `utanUndefined` |
| **Komponenter** | Adresskylt, TaBortKnapp (två tryck + avarmering), Layout (fyra flikar, `+` i mitten, öppnar direkt) |

## E2E-flöden

| Område | Test |
|---|---|
| **Skalet** | adresskylt, fyra flikar, svensk titel, inga konsolfel; **ordet "yta" finns inte i UI**; tre trädgårdar sås tyst och ingen setup blockerar starten |
| **Flöde A — ny växt** | + → kamera → namn → Klart landar på kortet med bilden i fototidslinjen; **ingen påhittad "Planterat"-post**; namn är enda kravet; metadata som chips → rader → går att ta bort; plats i efterhand loggas INTE som flytt; omladdning behåller data; borttagning i två tryck |
| **Flöde B — händelse** | ett tryck loggar med dagens datum; beskärning erbjuder bild men kräver den inte; vattning erbjuder ingen bild; Ångra tar bort posten; knappen visar senaste datum; flera foton bygger tidslinjen |
| **Flöde C — ritning** | egen ritning per trädgård, Inomhus har ingen; skalstock + norrpil; rita polygon → namn → kvar efter omladdning; mått skalar formen; planerad plats ritas streckad; platsborttagning gör växter hemlösa (inte raderade) |
| **Ritläget (nytt)** | ett hörn kan rundas och spetsas igen (path får/tappar `C`); ångra tar tillbaka en borttagen plats; ångra är avstängd innan något gjorts; läget är märkt RITLÄGE och Klar-knappen tar en ur det; **ritläget får inte tvinga fram sidscroll** |
| **Kuben** | växt utan position sätts ut från ritläget; plats tar emot befintlig växt; växtkortet skickar växt till ritningen; planerad växt → streckad + listad under Planerat → "Planterad" skriver planterat-post |
| **Platsens ark** | listar växterna som står där, inte bara antalet |
| **Flera ritningar** | ny ritning kan läggas till bredvid nuläget och ärver måtten |
| **Hem & logg** | Hem öppnar med foto, antal och veckans händelser; global logg filtrerar på trädgård och typ; växtlistan grupperar och söker; `prefers-reduced-motion` visar ritningen direkt |

Ritlägestesterna hoppas över i mobilprojektet (`test.skip` på viewport <1024) —
ritläget är desktop-först enligt CLAUDE.md.

## Kända luckor

- Firestore-datalagret testas inte i jsdom (kräver IndexedDB). Täcks av e2e i
  riktig webbläsare.
- Molnläget (riktig Firebase-config + inloggning) e2e-testas inte;
  `LoggaInView` är endast typkontrollerad.
- **Migreringen är testad som ren funktion, inte mot en riktig v1-databas.**
  Drivaren `sakerstallDatamodell` körs skarpt först när molndatan migreras.
  Gamla kollektioner raderas aldrig, så vägen tillbaka är att nollställa
  `meta/migrering`.
- PWA/servicearbetare testas inte automatiskt; manifest, sw.js och ikoner
  röktestas manuellt via `vite preview`.
- **Firestore-/Storage-säkerhetsreglerna är INTE testade skarpt.** Reglerna
  låser data till ägaren (`request.auth.uid == uid`), men isoleringen mellan
  användare är inte verifierad mot emulatorn eftersom Java saknas på maskinen.
  - Installera Java (macOS): `brew install --cask temurin`
  - Ett `test:rules`-skript med `@firebase/rules-unit-testing` finns ännu inte.
- Hatchmönstren granskas visuellt via skärmdump, inte automatiskt.

## Förenklingsomgången

- `lib/ritstil.test.ts` (6) — namnförslag för nya former. Regression: numret
  räknades förut som "antal former + 1" och återanvändes efter en radering, så
  två former kunde heta "Rabatt 2". Nu letas första LEDIGA numret upp.
- `lib/viewbox.test.ts` (13) — `innehallsRuta`: innehållets ruta, golvet på
  6 × 6 m, och fallback till hela tomten när ingenting är ritat.
- `lib/vaxtsok.test.ts` (11) — rankning (exakt → prefix → nytt ord → mitt-i),
  sökning på latin och alternativnamn, okänslighet för versaler och å/ä/ö,
  taket på åtta förslag. Plus fyra påståenden om själva namnlistan: 500–800
  poster, alla fält ifyllda, inga dubbletter, och att växterna hon faktiskt
  har finns med.
- `e2e/ritning.spec.ts` — hörnmodellen: knapparna syns först när ett hörn är
  markerat, Runda växlar fram och tillbaka, Ta bort stannar vid tre hörn,
  klick på en kant lägger till ett hörn, kanterna är inte klickbara förrän
  formen är markerad. Plus att ritläget saknar instruktionsrad och har exakt
  en röd knapp i vyn.
- `e2e/vaxt.spec.ts` — namnförslag fyller i namn + latin, och ett eget namn
  ("Mormors ros") sparas som det står utan latin på köpet.
- `e2e/logg.spec.ts` — Hem samlar allt som saknas i **en** lista med skäl, och
  trädgårdsfiltret i loggen syns inte förrän mer än en trädgård har händelser.

### Kända luckor efter omgången

- Hörnknapparnas placering (`tillSkarm` + `position: fixed`) testas
  funktionellt, inte visuellt — att de hamnar *intill* hörnet granskas med
  skärmdump.
- Namnlistans innehåll är granskat av en människa, inte mot en källa. Fel
  latinskt namn på en post upptäcks inte av testerna.

## Nattkörningen (Solen + dataintegritet)

- `lib/sol.test.ts` (15) — NOAA-modellen mot facit: solmiddag på sekunden
  mot api.sunrise-sunset.org (4 datum), timeanddate-ankare (solnedgång
  22:08 21/6, daglängder 18:37/6:04) inom 2 min, middagshöjder på 59,6°N,
  azimutrotation, dagjämningens öst/väst, midnattssol/polarnatt i Kiruna,
  sommartidsgränserna 2026.
- `lib/skugga.test.ts` (18) — skugglängder (1 m vid 45°, √3 vid 30°),
  riktningar, norrvinkelvridning, självskuggning, soltimmarraster
  (fri yta = hela dagen, mur-scenario) och prestandatak (<150 ms).
- `lib/integritet.test.ts` (7) — de fyra referensinvarianterna som ren
  funktion.
- `components/knapproller.test.tsx` (4) — signalfärgen tillhör primar;
  destruktivt är aldrig rött före bekräftelsesteget.
- `e2e/fargdisciplin.spec.ts` — exakt EN röd åtgärd per vy (alla flikar
  inkl. Solen), och destruktivt utan rött före bekräftelse.
- `e2e/integritet.spec.ts` — ångrad platsradering återställer historik och
  foto; ångrad placering lämnar ingen loggpost; dubbel-submit ger en växt;
  dubbeltryck i platsväljaren ger en flytt.
- `e2e/solen.spec.ts` — tom inbjudan utan ritning, skuggläge + reglage +
  norr-banner, kompassen släcker bannern, plats med höjd ger soltimmar och
  nyckeldatum, skuggkälla ritas/namnges/listas, fri yta utan höjder.

### Kända luckor efter nattkörningen

- Multi-tab-persistensen (persistentMultipleTabManager) är verifierad mot
  hela e2e-sviten i EN flik; tvåfliksscenariot är inte automatiserat.
- Migreringens serverläsningar i molnläge är kodgranskade och
  typkontrollerade men inte körda mot en riktig molndatabas i natt
  (ingen migrering mot molndata var tillåten).
- Klient B:s osynkade händelser mot en växt som klient A raderar blir
  föräldralösa — klientsidan kan inte städa vad den inte sett.
  Dokumenterad begränsning; invariantfunktionen gör brotten synliga.
