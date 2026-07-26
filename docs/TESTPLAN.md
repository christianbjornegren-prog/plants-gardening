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
| Loggfilter | `loggForVaxt`/`loggForYta` (ytans + växternas poster, följer flytt) | enhet |
| Snabblogg | tre tryck från fliken till Vattnat, kvittens, Ångra tar bort posten | e2e |
| Loggposter | auto-Planterat vid ny växt, anteckning på yta, ytlogg med växtlänkar | e2e |
| Loggstädning | borttagen växt lämnar inga loggposter | e2e |
| Geometri | snap, centroid, punkt-i-polygon (även icke-konvex), omkrets, bbox | enhet |
| ViewBox | anpassa/zooma/panorera/begränsa | enhet |
| Växtplacering | sparad position, autoplacering i polygon, deterministisk, spridning | enhet |
| Kartkonvertering | punkter ↔ {x,y}, undefined-fält, trasig data | enhet |
| Karta setup | tomtmått → tomtgräns + adresskylt | e2e |
| Ritning | polygon klickas ut, panel öppnas, typ/namn, kvar efter omladdning | e2e |
| Yta-koppling | skapa yta från objekt → växtprick på kartan | e2e |
| Infokort | tryck på objekt/prick, stäng, Vattnat från kartan (3 tryck) | e2e |
| Prickdragning | dra till annat objekt → ny yta + flytthistorik | e2e |
| Rörelse | reducedMotion: kartan visas direkt | e2e |
| Årstidston | månader → årstid → CSS-filter | enhet |
| Fototidslinje | loggfoto via snabblogg + växtfoto → daterad post med bild i tidslinjer | e2e |
| Måttskala | `skalaTillMatt` (exakta mått, ankare, degenererade fall) | enhet |
| Lagringsrobusthet | okänd karttyp → 'annat'; flyttalsrester normaliseras | enhet |
| Formulärskydd | enbart mellanslag i namn stoppas med felmeddelande | (via required + trim, e2e täcker happy path) |

## Kända luckor

- Firestore-datalagret testas inte i jsdom (kräver IndexedDB). Täcks av e2e
  i riktig webbläsare från Fas 1.
- Molnläget (riktig Firebase-config + inloggning) kan inte e2e-testas utan
  Firebase-projekt; `LoggaInView` är endast typkontrollerad.
- PWA/servicearbetare testas inte automatiskt (byggs bara i produktion);
  manifest, sw.js och ikoner röktestas manuellt via `vite preview`.
- Årstidstonen verifieras som ren funktion (enhet), inte visuellt per säsong.
- **Firestore-/Storage-säkerhetsreglerna är INTE testade skarpt.** Reglerna i
  `firestore.rules`/`storage.rules` låser all data till ägaren
  (`request.auth.uid == uid`), men isoleringen mellan användare är ännu inte
  verifierad mot emulatorn eftersom Java saknas på maskinen (Firebase-
  emulatorn kräver en JDK). Detta är en **känd, öppen lucka** tills reglerna
  körts mot emulatorn.
  - Installera Java (macOS, Homebrew): `brew install --cask temurin`
  - Ett `test:rules`-skript och en harness med `@firebase/rules-unit-testing`
    finns ännu inte — måste läggas till innan reglerna kan köras automatiskt.
    Manuellt kan reglerna laddas i emulatorn med
    `firebase emulators:start --only firestore,storage,auth`.
