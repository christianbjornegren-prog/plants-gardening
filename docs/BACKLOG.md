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

- **Fas 3 — Kartan:** setup med tomtmått, meterkoordinater, polygonritning
  och hörn-/objektdragning med snap 0,1 m i redigeringsläget, typfärger +
  trallmönster, namnetiketter, koppling objekt↔yta (inkl. "skapa yta från
  objektet"), växtprickar (sparad position eller autoplacering), pan/pinch/
  hjulzoom, infokort med snabblogg (Vattnat på 3 tryck från kartan!),
  dra-prick-för-att-flytta med moveHistory, startanimationen med
  prefers-reduced-motion-stöd.

- **Fas 4 — Polish:** foton är daterade loggposter (kameraknapp i snabb-
  loggen + växtdetaljens foton loggas) → fototidslinje per yta/växt i
  tidslinjerna ("samma rabatt, april vs juli"); årstidston på levande kartan
  (CSS-filter per säsong); fotostädning vid borttagning av växt/yta och vid
  Ångra; PWA-bygget verifierat (manifest + service worker + ikoner).

## Pågår

—

## Senare
- Ta bort enskilda foton från en växt (nu tas foton bara bort med växten).
- Ta bort enskilda loggposter i efterhand (nu bara Ångra direkt efteråt).
- Foto på loggpost (`photoRef` finns i schemat men saknar UI).
- Lägga till/ta bort enskilda hörn på befintlig polygon.
- Zoomknappar (+/−) som komplement till pinch/hjul.
- Migreringsverktyg lokal→moln (lokalt läge och molnläge är skilda
  datamängder; dokumenterat i src/lib/lage.ts och .env.example).
- Uttrycklig z-ordningskontroll för kartobjekt (nu: ritordning).

## Ingår inte i v1

Artdatabaser, såddkalendrar, påminnelser, väder-API, delning, AI, export/import.
