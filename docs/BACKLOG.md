# Backlog

Uppdateras varje session.

## Klart

### v1 (arkiv)
Fas 0 fundament, Fas 1 ytor & växter, Fas 2 skötsellogg, Fas 3 kartan,
Fas 4 polish. Ersatt av omtaget nedan — begreppsmodellen bar inte.

### v2 — omtaget

- **Fas 0 — Dokument:** CLAUDE.md och alla fem docs-filer omskrivna till
  Plats-modellen, brutna färger med kromtak, kuben, hållbarhetsreglerna.
- **Fas 1 — Datamodell:** `Tradgard/Plats/Vaxt/Handelse` i svensk namngivning,
  nytt repo, `migreraV1TillV2` som ren funktion (14 tester), `sakerstallDatamodell`
  som kör migrering + sådd före lyssnarna. `moveHistory`, `photoRefs`, `Area`
  och `VAXTBARA_TYPER` borttagna.
- **Fas 2 — Palett & skal:** mörk bark-ramp (H≈100°) i `@theme`, `lib/palett.ts`
  som spegel + 20 tester som verifierar kromtak och kontrast, bottenrad med fyra
  flikar och `+` i mitten, `+`-flödet med kamera direkt.
- **Fas 3 — Växtkortet:** fototidslinje (embla, äldst först), fyra
  händelseknappar med "senast"-datum, kvittens med Ångra i 6 s och "Ta en bild"
  vid beskärning, metadata som chips → rader.
- **Fas 4 — Hem:** hjältebild från senaste fotot, antal, veckans händelser,
  Planerat, "inte fotad på länge", länk till hela loggen.
- **Fas 5 — Ritningen & kuben:** hatchmönster per platstyp, linjeviktshierarki,
  skalstock + norrpil, platsnamn satta i ritningen, växtprickar med miniatyr,
  planerat streckat, trädgårdsväxlare, ritläge på desktop med segmentlängder i
  mono, placering av växter från ritningen / växtkortet / platskortet.
- **Fas 6 — Listor & logg:** växtlistan som bildkort med segment, sök och
  gruppering på plats; platskortet; global logg med filter; offline verifierat.
- **Verktyg:** `npm run dev:lokal` (`VITE_LAGE=lokal`) så att e2e och
  skärmdumpar fungerar på en maskin med ifylld `.env.local`.

- **v0.1-omgången:** Google-inloggning med låst behörighetslista, felkanal så
  att nekade skrivningar/läsningar syns, kurvade kanter (runda hörn), ångra i
  ritläget, tydligt märkt ritläge med Klar-knapp, växtlista i platsens ark,
  flera ritningar per tomt.

## Pågår

—

## Nästa

- **Kör migreringen skarpt mot molndatan.** Koden är testad som ren funktion;
  drivaren har inte körts mot det riktiga projektet (`plants-gardeing`) än.
  Gamla kollektioner (`areas`, `plants`, `logEntries`, `garden/map`) ligger kvar
  orörda tills det är verifierat.
- Städa bort v1-kollektionerna när v2 är verifierad i molnet.

## Senare

- Ta bort enskilda foton (nu tas de bort med växten/platsen eller via Ångra).
- Ta bort enskilda händelser i efterhand (nu bara Ångra direkt efteråt).
- Lägga till/ta bort enskilda hörn på en befintlig polygon.
- Zoomknappar (+/−) som komplement till pinch/hjul.
- Uttrycklig z-ordningskontroll för platser (nu: ritordning).
- Migreringsverktyg lokal→moln (skilda datamängder, se `src/lib/lage.ts`).
- Säkerhetsreglerna mot emulatorn (kräver Java, se TESTPLAN.md).
- Utvärdera om **Logg-fliken** förtjänar sin plats efter en säsong. Används den
  inte tas fliken bort och "Hela loggen →" på Hem får bära den.

## Ingår inte i v1

Artdatabaser, såddkalendrar, påminnelser, väder-API, delning, AI, export/import,
årstidston (prövad och struken, se DESIGNLOGG.md).
