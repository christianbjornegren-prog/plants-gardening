# Nattkörning 27 juli 2026 — Solen + dataintegritet

Läs på fem minuter. Grenen `solen`, byggd på `main@18e4b69` (som
verifierades ren: 0 lintfel, 178→222 enhetstester, 87 e2e gröna, tsc ren).

---

## 1. Färgdisciplin

**Regeln är nu kod:** fyra knapproller (`primar`/`sekundar`/`diskret`/
`destruktiv`) definierade på ett ställe i `components/Knapp.tsx`, och
**exakt en röd åtgärd per skärm**. Skalets "Ny växt" (+) är appens röda;
en vy har bara en egen röd när skalet inte syns: ritläget (*Rita ny
plats*), inloggningen, och ark (deras primärknapp — overlayn täcker
skalet).

Ändrat: Hems "Fota en växt", tomlägenas "Fota första växten",
inline-"Skapa ritningen" och "Planterad"/"Anlagd" demoterade till
sekundär (de dubblerade eller konkurrerade med skalets röda).
Destruktivt är diskret text i normal färg — TaBortKnapps röda inramade
vila är borta; rött förekommer först i bekräftelsesteget. Mät-läget
markeras med ton (inte röd kant), placeringsbanderollen fick neutral
kant, kvittensens Ångra och FelVakts knapp är neutrala. **Medvetet kvar
i rött:** ritytans canvas-återkoppling (markerad kontur, pågående
polygon, måttband) — det är pennan, inte knappar — samt feltexter.

Vaktas av `knapproller.test.tsx` (4 tester) och `e2e/fargdisciplin.spec.ts`
(en röd per vy över alla flikar inkl. Solen; aldrig rött destruktivt före
bekräftelse). Skärmdumpar före/efter ligger i sessionens scratchpad
(`skarm-fore/`, `skarm-del0/`).

## 2. Solen

**Fungerar.** Ny flik med skuggor i realtid och soltimmar per dag/plats.

**Verifiering av solmodellen** (`lib/sol.test.ts`, 15 tester) mot två
oberoende källor för Stockholm 2026:

| Kontroll | Facit | Vår modell | Avvikelse |
|---|---|---|---|
| Solmiddag 21 jun (sunrise-sunset.org) | 10:49:32 UTC | 10:49:32 | 0 s |
| Solmiddag 21 dec | 10:45:45 UTC | 10:45:46 | 1 s |
| Solnedgång 21 jun (timeanddate) | 22:08 CEST | 22:08:11 | 11 s |
| Daglängd 21 jun (timeanddate) | 18 h 37 m | 18 h 37 m 19 s | 19 s |
| Daglängd 21 dec (timeanddate) | 6 h 04 m | 6 h 04 m 46 s | 46 s |
| Middagshöjd 21 jun, 59,62°N | ≈ 53,8° | 53,8° | < 0,4° |
| Middagshöjd 21 dec | ≈ 6,9° + refraktion | inom 6,6–7,4° | ✓ |
| Azimut över dygnet | strikt medurs | strikt medurs | ✓ |
| Dagjämning | upp ≈ öst, ner ≈ väst | inom 5° | ✓ |
| Sommartidsgränser 2026 | 29 mar / 25 okt | exakt | ✓ |

En källa avviker: sunrise-sunset.orgs upp-/nedgångar ligger ~3 min från
kanonisk NOAA (kontrollräknat för hand i testkommentaren — deras daglängd
18:44 mot NOAA:s 18:37). Vår modell följer NOAA och timeanddate.

**Skuggmotorn** (`lib/skugga.test.ts`, 18 tester): 1 m högt objekt ger
1 m skugga vid 45° och √3 m vid 30°; riktningar åt alla väderstreck;
norrvinkeln vrider; objekt skuggar inte sitt eget inre; klippning vid
200 m när solen står lågt. **Soltimmar**: 10-minuterssampling, 0,5 m-
raster; uppmätt 45 ms för 16×11 m och 99 ms för 20×20 m med fem
skuggare — ingen worker behövs.

**Vyn**: ett tidsreglage, ett datumreglage, spela dygnet, växeln
Skuggor/Soltimmar. Tryck på plats → soltimmar i dag + 15 apr/15 jun/
15 sep. Underlaget bakom EN knapp: vridbar kompass (viktigaste värdet),
Sigtuna förifyllt, höjder som lista, skuggkällor ritas som rektanglar
direkt i vyn. Saknas norr: en lugn banner. Saknas höjder: fri yta, inget
fel. Ärlighetsrad om plan mark/klar himmel/lövverk. Hur du kalibrerar
norrvinkeln mot ett eget foto: **docs/SOLEN.md**.

Skärmdumpar (scratchpad `skarm-solen/`): desktop 1280×800 skuggor +
soltimmar, mobil 390×844.

## 3. Dataintegritet

Granskningen kördes som 33 parallella agenter (6 domängranskare, 27
råfynd, varje fynd adversariellt prövat: 24 bekräftade, 3 avfärdade).
Nio unika defekter, sorterade efter allvar — **alla nio rättade**:

| # | Allvar | Defekt | Fix |
|---|---|---|---|
| 1 | Hög | Ritlägets "Ta bort platsen" lovade "Går att ångra" men raderade platsens händelser och foton oåterkalleligt | Foton bevaras, raderade händelser fångas, ångra återskapar allt. Regressions-e2e med foto |
| 2 | Hög | Migreringen kunde stämpla "klar" efter tysta cache-fallbacks → molndata strandad för alltid | Molnläge läser källorna från servern; kan de inte läsas sätts ingen stämpel; befintliga dokument skrivs aldrig över |
| 3 | Hög | Flik två fick bara minnescache — offline-skrivningar försvann när fliken stängdes | persistentMultipleTabManager |
| 4 | Medel | Ångrad flytt lämnade falsk "Flyttat"-post i historiken | Flyttfunktionerna returnerar händelse-id; ångra raderar posten. E2e |
| 5 | Medel | Dubbel-submit i Ny växt → två växter med delat foto (radera en → den andras bild borta) | Submit-spärr. E2e |
| 6 | Medel | taBortPlats frikopplade bara växter anroparen kände till → hängande platsId från annan flik/enhet | Cache-union på växter, samma mönster som händelsestädningen |
| 7 | Medel | Växt med hängande platsId osynlig i alla filter utom Alla | Behandlas som "Utan plats" i Växter och Hem |
| 8 | Låg | Ångra av "rita platsen" raderade med tomma listor → hängande platsId | Callbacken läser läget via refs vid ångra-ögonblicket |
| 9 | Låg | Dubbeltryck i platsväljaren → dubbla flyttat-poster; föräldralösa fotoblobbar i Ny växt-flöden | Valspärr per öppning; blobben städas när arket stängs osparat. E2e |

**Invarianterna som permanenta tester**: `lib/integritet.ts` +
`integritet.test.ts` (7) prövar alla fyra invarianterna; `e2e/
integritet.spec.ts` (4 flödesregressioner) bevisar dem i verkliga flöden.

**Kvar (dokumenterade begränsningar, ej rättade):**
- Klient B:s osynkade händelser mot en växt som klient A raderar blir
  föräldralösa — kan inte städas klientside. Synliga via invarianterna;
  UI kraschar inte på dem.
- Tvåfliksscenariot är inte automatiserat (multi-tab-cachen verifierad
  mot hela sviten i en flik).
- Migreringens serverläsningsväg är kodgranskad + typkontrollerad men
  inte körd mot riktig molndata i natt (var förbjudet).
- Avfärdade som avsiktlig design: PlatsViews radering utan ångra (texten
  säger nu ärligt vad som följer med), form-dragets teoretiska race.

## 4. Ritläget i mobil

De 19 hoppade testerna är desktop-grindade i specen; jag körde flödena
manuellt i 390×844 via direkt-URL (Redigera-länken är medvetet dold
< 1024 px — det är avsikten, och den degraderar tyst, inte med vit
skärm): **ingen krasch, inga konsolfel** — rita, hörnknappar, kantklick,
mät och panel fungerar. Tre skavanker rättade: måttfälten klämdes till
oläslighet (shrink-0), knappar radbröt inuti (whitespace-nowrap i
knappgrunden), och ritytan fick bara 256 px höjd (nu 45 vh). Klar-knappen
nås med svep i den rullbara verktygsraden — acceptabelt för ett
desktop-först-läge.

## 5. Bevis: befintlig funktionalitet orörd

- **E2e mot `main` före merge:** 87 passerade, 19 hoppade (sparad logg).
- **E2e på den mergade koden:** identiskt utfall för alla befintliga
  tester + de nya (färgdisciplin, integritet, solen) gröna — siffror i
  avsnitt 7.
- **Skärmdumpar** av Hem/Ritningen/Växter/Logg i båda viewporterna före
  och efter: enda skillnaderna är de beställda — knapproller (Del 0) och
  Solen-fliken i navigeringen.
- **Ett befintligt test har ändrad förväntan**, öppet redovisat:
  `Layout.test.tsx` kodifierar bottenradens exakta sammansättning; den
  beställda Solen-fliken ändrar den med nödvändighet. Förväntan är
  utökad till sex poster i exakt ordning — inte försvagad. Alla övriga
  befintliga tester passerar oförändrade.

## 6. Deploy

*(fylls i efter merge — se slutet av filen)*

## 7. Siffror

- Enhetstester: 222 (varav nya: sol 15, skugga/soltimmar 18, integritet 7,
  knapproller 4, + tidigare 178)
- E2e: se avsnitt 6/kommandologgen — alla gröna i slutkörningen
- Lint: 0 fel. `tsc --noEmit`: rent.
- Commits på grenen: färgdisciplin, solmodell, skuggmotor, datamodell,
  dataintegritet (3 st), Solen-vyn, docs, mobilfixar, Layout-testet.

## 8. Hann inte / kunde inte verifiera

- **CI-deployen är fortfarande blockerad**: `VITE_FIREBASE_*`-secrets
  saknas i GitHub, så Actions bygger och testar men deployar inte.
  Deploy sker manuellt, som tidigare.
- Solmodellen är inte kontrollerad mot ett verkligt foto — det kräver
  dina foton och din norrvinkel. Proceduren står i docs/SOLEN.md och
  tar två minuter med ett foto med känd tid.
- Norrvinkeln, latituden och skuggkällorna för Ripvägen 11 är inte
  ifyllda — Solen visar en lugn uppmaning tills du vrider kompassen.
- Migreringens molnväg och tvåfliksscenariot enligt avsnitt 3.

## 9. Nästa steg om jag fick fortsätta

1. Fyll i norrvinkeln via ett foto (SOLEN.md) och rita radhuset som
   skuggkälla — först då blir soltimmarna trovärdiga på riktigt.
2. Automatisera tvåfliksscenariot (Playwright: två sidor i samma
   kontext) för multi-tab-cachen och cache-unionen i taBortPlats.
3. Lägg GitHub-secrets så CI-deployen går hela vägen.
4. Solen: skuggkällor borde gå att flytta/redigera i efterhand (nu bara
   höjd + ta bort/rita om), och "soltimmar per månad"-kurva per plats
   vore nästa naturliga steg.
5. Kör migreringens serverväg mot en klon av molndatan.
