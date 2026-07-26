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
