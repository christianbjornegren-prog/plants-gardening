# Solen — modellen, och hur du kontrollerar den mot verkligheten

## Vad den räknar på

Solens läge (azimut och höjd) beräknas med NOAA:s solpositionsalgoritm i
`src/lib/sol.ts` — en ren funktion utan beroenden, med refraktion och
korrekt hantering av Europe/Stockholm inklusive sommartidens gränser.
Verifierad i `sol.test.ts` mot två oberoende källor (api.sunrise-sunset.org
och timeanddate.com) för Stockholm 2026: solmiddagen träffar på sekunden,
upp- och nedgång inom ett par minuter av timeanddates värden.

Skuggan för ett objekt med höjd *h* vid solhöjd *α* är `h / tan(α)` meter
lång, riktad rakt bort från solen, vriden med trädgårdens norrvinkel
(`src/lib/skugga.ts`). Soltimmarna samplar dygnet i tiominuterssteg och
rastrerar tomten i halvmetersrutor (`src/lib/soltimmar.ts`).

## Kontrollera modellen mot ett eget foto

Det enskilt viktigaste värdet är **norrvinkeln** — är den fel blir varje
skugga fel utan att det syns. Så här kontrollerar du den med ett foto:

1. Ta fram ett trädgårdsfoto med en tydlig skugga från något du känner
   igen på ritningen (boden, staketet, en stolpe). Notera **datum och
   klockslag** — står i telefonens bildinfo.
2. Öppna **Solen**, ställ datumreglaget på fotots datum och tidsreglaget
   på fotots klockslag.
3. Jämför skuggans **riktning** i vyn med fotot. Riktningen ska stämma på
   några grader när. Stämmer den inte: öppna *Justera underlaget* och vrid
   kompassen tills den gör det. Det är hela kalibreringen.
4. Jämför gärna **längden** också: ett 1 m högt objekt kastar 1 m skugga
   när solen står 45° högt, 1,7 m vid 30°, 3,7 m vid 15°. Längden styrs
   bara av klockslag och latitud — stämmer riktningen men inte längden är
   klockslaget eller datumet fel, inte norrvinkeln.

Bra kontrolltider: mitt på dagen står solen i söder (skuggan pekar mot
norr — kompassens motsatta håll), och vid dagjämning går solen upp nästan
rakt i öster och ner nästan rakt i väster.

## Vad modellen inte vet

Sägs även i vyn, med en rad: marken antas plan, himlen klar, och lövträd
skuggar lika tätt året om. Ett skogsbryn i söder skuggar i verkligheten
mindre i april (kala grenar) än i augusti. Moln finns inte. Soltimmarna är
därför ett *tak*, inte ett löfte.

## Snabbfakta för rimlighetskontroll (Sigtuna, 59,6°N)

| Datum | Solen som högst | Dagens längd |
|---|---|---|
| 21 juni | ≈ 53,8° | ≈ 18 h 37 min |
| 20 mars / 23 sep | ≈ 30,4° | ≈ 12 h 10 min |
| 21 december | ≈ 6,9° | ≈ 6 h 04 min |
