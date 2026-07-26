# Backlog

Uppdateras varje session.

## Klart

- **Fas 0 — Fundament:** Vite + React 19 + TS strict, Tailwind v4 med
  designtokens, typsnitt (Fontsource), PWA (manifest + ikoner), Firebase-grund
  med lokalt läge/molnläge, router med fyra vyer, adresskylt, test-setup
  (Vitest + Playwright desktop/mobil), docs-struktur.
- **Fas 1 — Ytor & växter:** datalager (repo + DataProvider med
  onSnapshot-lyssnare), CRUD för ytor (solläge/jordmån/anteckning) och växter
  (namn, yta, anteckning, foton), flytt mellan ytor loggas i moveHistory,
  fotokomprimering (max 1600 px, JPEG) + photoStore (IndexedDB lokalt /
  Storage i moln), tvåstegsborttagning, skydd mot att ta bort yta med växter.

- **Fas 2 — Skötsellogg:** snabbloggning (Vattnat/Gödslat/Beskuret) med ett
  tryck på växt- och ytdetaljen (= tre tryck totalt från fliken), Ångra i 6 s,
  anteckningar, automatisk "Planterat"-post när växt skapas, tidslinjer per
  växt, per yta (inkl. växternas poster) och globalt med länkar till målet.
  Loggposter städas när växt/yta tas bort.

## Pågår

- **Fas 3 — Kartan:** meterkoordinater, polygonredigering (desktop),
  typfärger, växtprickar, mobil pan/zoom + dra-för-att-flytta,
  startanimationen.

## Senare
- **Fas 4 — Polish:** fototidslinje, årstidston, offline-finslipning.
- Ta bort enskilda foton från en växt (nu tas foton bara bort med växten).
- Ta bort enskilda loggposter i efterhand (nu bara Ångra direkt efteråt).
- Foto på loggpost (`photoRef` finns i schemat men saknar UI).

## Ingår inte i v1

Artdatabaser, såddkalendrar, påminnelser, väder-API, delning, AI, export/import.
