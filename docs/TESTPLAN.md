# Testplan

## Hur

- `npm run test` — Vitest + Testing Library (jsdom). Ren logik och
  presentationskomponenter. Auto-cleanup mellan tester via `src/test/setup.ts`.
- `npm run e2e` — Playwright, alltid två projekt: **desktop** (1280×800) och
  **mobil** (390×844, touch, deviceScaleFactor 3). Kör mot dev-server på port
  5273.
- Skärmdumpar för designgranskning: `node scripts/skarmdump.mjs <utkatalog>`.

## Vad som testas (Fas 0)

| Område | Test | Typ |
|---|---|---|
| Formatering | `formatMeter` (decimalkomma, avrundning), `formatDatum` (i dag/i går/år) | enhet |
| Bildkomprimering | `beraknaMalstorlek` (skalning, gränser, aldrig 0 px) | enhet |
| Firestore-payload | `utanUndefined` (tar bort undefined, behåller falsy) | enhet |
| Adresskylt | renderar adressen | komponent |
| Layout | fyra menyposter, renderar vyinnehåll | komponent |
| TaBortKnapp | kräver två tryck, avarmerar efter timeout | komponent |
| Skal | adresskylt på startvyn, navigering mellan alla vyer, svensk titel, inga konsolfel | e2e (desktop + mobil) |
| Ytor | skapa med solläge/jordmån, visas i lista med växtantal | e2e |
| Offline | data kvar efter omladdning (Firestore-cache) | e2e |
| Växter | skapa i yta, visas i listor, ändra namn/anteckning | e2e |
| Flytt | byte av yta skapar flytthistorik | e2e |
| Foto | uppladdning → komprimering → visas som blob-URL | e2e |
| Borttagning | växt (två tryck), yta blockeras med växter, tom yta kan tas bort | e2e |
| Tomtillstånd | växtformulär utan ytor leder till "skapa yta" | e2e |

## Kända luckor

- Firestore-datalagret testas inte i jsdom (kräver IndexedDB). Täcks av e2e
  i riktig webbläsare från Fas 1.
- Molnläget (riktig Firebase-config + inloggning) kan inte e2e-testas utan
  Firebase-projekt; `LoggaInView` är endast typkontrollerad.
- PWA/servicearbetare testas inte automatiskt (byggs bara i produktion).
