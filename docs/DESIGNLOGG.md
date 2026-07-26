# Designlogg

Designbeslut + vad som provats och förkastats.

## Fas 0

- **Tokens:** paletten från CLAUDE.md rakt in i `@theme` (`panel`, `tra`,
  `orm`, `lov`, `fermob`, `ljus`). Fermob används hittills bara för aktiv
  menymarkering (punkt i mobilmenyn), primärknapp (inloggning) och feltext.
- **Typografi:** Bricolage Grotesque Variable (display), Instrument Sans
  Variable (UI), IBM Plex Mono 400/500 (mått). Via Fontsource.
- **Adresskylten:** mörk panel (`bg-panel`), ljus text, inre ljus ring
  (`ring-ljus/20`) som emalj-kant. Återanvänds som komponent, testid
  `adresskylt`.
- **Navigering:** mobil = bottenmeny med fyra poster (ikon + etikett,
  min-höjd 56 px, safe-area-padding). Aktiv post: full kontrast + liten
  fermob-punkt. Desktop = topprad med adressnamn till vänster och menyn som
  textlänkar, aktiv får mörk pill.
- **Ikoner:** handritade 24×24 stroke-ikoner (1,75 pt, runda ändar) i stället
  för ikonbibliotek — matchar "tuschritning"-känslan och håller bundlen ren.
- **Appikonen:** adresskylt-motiv, mörk platta med "11" och ett lov-grönt blad.
- **Tomma vyer:** inbjudande text utan döda knappar (knappar kommer med
  funktionen i Fas 1–2).
- **Fokus:** `:focus-visible` med 2 px fermob-kontur globalt.

## Fas 1

- **Kort:** listrader för ytor/växter på `bg-tra/20` med `border-tra` — den
  varma trallkänslan utan att dränka sidan. Växtrader har 56 px fototumnagel
  med lövikon på `bg-tra/30` som platshållare.
- **Fermob-budget per vy:** max en primärknapp ("Ny yta"/"Spara") + ev.
  borttagningsflöde. Sollägesväljaren använder mörk panel som vald-markering,
  inte fermob.
- **Borttagning:** tvåstegsknapp ("Ta bort" → "Tryck igen för att ta bort",
  avarmerar efter 4 s) i stället för modal — färre lager, självförklarande.
- **Formulär:** etikett över fält, vita fält med panel-kant, placeholders med
  vardagsexempel ("Rabatten vid staketet"). Autofokus på namnfältet.
- **Yta-skydd:** en yta med växter visar en förklaring i stället för en
  inaktiverad knapp — hellre säga varför än gråa ut.

## Fas 2

- **Snabbloggen:** tre gröna knappar (droppe/gödsel/sax) i orm/lov-toner —
  medvetet INTE fermob, skötsel är vardag, inte accent. Kvittensen
  "Vattnat — antecknat." med Ångra-länk i 6 s ersätter både toast och
  per-rad-borttagning.
- **Tidslinjen:** rund lov-tonad ikonbricka per typ, datum högerställt
  ("i dag"/"i går"/"14 maj"), mål som orm-länk bara när sammanhanget kräver
  (globala loggen och ytans logg).
- **Auto-"Planterat":** varje växt får en startpost — tidslinjen är aldrig tom
  och känns levande från första stund.
- **Provat och förkastat:** loggformulär med typ-väljare (för många steg);
  per-rad-radering i tidslinjen (för plottrigt, Ångra täcker felslag).

## Fas 3

- **Kartans språk:** panel-mörka konturer på vitlyft tomtyta = tuschritning.
  Typfärger ur paletten: gräsmatta lov/45, rabatt tra/55, pallkrage tra/75,
  häck orm/55, träd lov/35 med orm-kontur, bod nästan helmörk med ljus
  etikett, altan med trallmönster (SVG-pattern i verklig skala, 28 cm brädor),
  staket streckad öppen linje. Fermob endast för valt objekt/dragen prick.
- **Etiketter och prickar är skärmkonstanta** (skalas med meter-per-pixel) —
  kartan ska kännas som en ritning, inte en webbsida som zoomar text.
  Etiketter visas bara när objektet är stort nog på skärmen (>64 px).
- **Startanimationen:** tomtgräns (0 ms) → altan → bod → rabatter → övrigt
  (90 ms stagger), fyllnader tonar in ~370 ms efter respektive kontur,
  prickar landar med studs från 1050 ms. Totalt ~1,3 s. Spelas en gång per
  appstart; `prefers-reduced-motion` visar allt direkt.
- **Infokortet** ligger som flytande kort nertill (inte modal) — kartan
  förblir synlig och interaktiv logik enkel. Växtens kort har snabbloggen:
  Karta → prick → Vattnat = tre tryck.
- **Provat och förkastat:** `pathLength`-normaliserad dash-animation
  (fungerar inte med non-scaling-stroke, gav permanent streckade konturer);
  autoplacering av prickar exakt på centroiden (krockade med namnetiketten,
  flyttad 0,6 m nedåt).
