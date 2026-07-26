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
| Adresskylt | renderar adressen | komponent |
| Layout | fyra menyposter, renderar vyinnehåll | komponent |
| Skal | adresskylt på startvyn, navigering mellan alla vyer, svensk titel, inga konsolfel | e2e (desktop + mobil) |

## Kända luckor

- Firestore-datalagret testas inte i jsdom (kräver IndexedDB). Täcks av e2e
  i riktig webbläsare från Fas 1.
- Molnläget (riktig Firebase-config + inloggning) kan inte e2e-testas utan
  Firebase-projekt; `LoggaInView` är endast typkontrollerad.
- PWA/servicearbetare testas inte automatiskt (byggs bara i produktion).
