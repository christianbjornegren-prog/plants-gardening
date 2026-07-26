# Designlogg

Designbeslut + vad som provats och förkastats.

## Omtaget (v2) — mörkt, brutna färger

**Diagnosen:** den ljusa versionen såg ut som en wireframe. Felet var inte
ljusheten i sig — det var att **ritningen saknade material**. En vit yta med en
kontur och en platt fyllnad läser som en skiss oavsett palett.

### Brutna färger, med kromtak

Paletten mättes om i OKLCH. Resultatet var att CLAUDE.md-paletten **redan** var
brutna färger utan att det stod någonstans:

| | krom (C) |
|---|---|
| ljus `#F7F5F0` | 0,007 |
| panel (gammal) `#232823` | 0,012 |
| trä `#C9B694` | 0,051 |
| ormbunke `#4E6B44` | 0,069 |
| löv `#8FA96F` | 0,086 |
| **fermob `#D3442E`** | **0,183** |

Fermob är 2,1× mer mättat än allt annat. Det är därför regeln "enda accentfärgen"
fungerar — den är den enda färg som *kan* signalera. Regeln formaliserades till
**kromtak C ≤ 0,09**, verifierat i `src/lib/palett.test.ts`.

### Bark-rampen

En kulör, H = 100° (mellan träets 82° och lövets 128°), jämna L-steg, C ≤ 0,016:
`botten #12110B` → `panel #24231B` → `upphojd #36342B` → `linje #49483E` →
`dis-svag #76756C` → `dis #A09F96` → `ljus #F7F5F0`.

**Panel ändrades från `#232823` till `#24231B`.** Samma mörkhet (L 0,255 mot
0,270), men kulör 145° → 100°. Vid 145° är den en kall grönsvart som läser som
skiffer; vid 100° läser den som betsat trä. Det spelade ingen roll när den bara
var en header på ljus botten — nu är den hela appens grund och allt ärver tonen.

**Röd i två steg:** `fermob #D3442E` ger bara 3,3:1 mot panel och underkänns som
text. Den används därför **enbart som fylld yta** (ljus text ovanpå = 4,5:1), och
`fermob-lyft #E5644F` (4,7:1) används när rött ska vara text.

### Ritningen som signaturmoment

Kartan är inte en karta utan en **ritning**, med ritningens material: hatchning
per platstyp (trall = parallella linjer, gräsmatta = stippel, rabatt =
prickraster, häck = bågar, träd = krona), linjeviktshierarki (tomtgräns grövst →
växtprickar tunnast), skalstock och norrpil i mono, platsnamn spärrade i
trä-tonen, växtprickar som bär miniatyren, planerat streckat.

Motivet: ingen av de undersökta apparna (Planta, Vera, Gardenize, Greg, Plant
Parent) har någon rumslighet alls — de vet inte var något står. Gardenizes
närmaste motsvarighet är att rita ovanpå ett foto. Att tala landskapsingenjörens
visuella språk är det enda som inte går att kopiera.

### Hållbarhet

1. Ingen glasmorfism, inga gradienter, inget sken. Ton + hårlinje skiljer ytor.
2. Typografi och spacing gör jobbet: åtta spacingsteg, fyra textstorlekar.
3. **En** rörelseidé: 220 ms, `cubic-bezier(.2,.8,.2,1)` (`--ease-mjuk`), delad
   av sheets, sidbyten och fototidslinjen. Ritningens tuschanimation är enda
   undantaget.

### Provat och förkastat i omtaget

- **shadcn/ui.** `npx shadcn init` skriver om `index.css` till sitt eget
  tokensystem (`--background`/`--foreground`, oklch) — rakt ovanpå `@theme`. Den
  drar dessutom in Radix + CVA + tailwind-merge + lucide för att ge oss knapp och
  fält, som redan fanns och var testade. Sheet kom från vaul, toast från sonner,
  karusell från embla, ikoner fanns handritade. Nettovärdet var negativt.
- **Årstidstonen — struken.** Ett CSS-filter över hela ritningen. På mörk botten
  blir det grumligt i stället för subtilt, och en effekt som "ska vara knappt
  märkbar" går inte att skilja från en bugg. `lib/arstid.ts` raderad.
- **Auto-"Planterat" vid ny växt — struken.** Den ljög: hortensian planterades
  inte den dag hon fotade den. Tidslinjen startar i stället med första fotot,
  vilket är sant. `planterat` skrivs numera bara när hon trycker "Planterad" på
  något planerat.
- **`+` som meny.** Provat: `+` öppnar val mellan "Ny växt" och "Ny plats". Det
  åt upp hela kamerafördelen. `+` gör nu en enda sak — ny växt, kameran direkt.
  Platser skapas där de hör hemma (rita på ritningen, eller "Ny plats…" i
  platsväljaren).

### Tre saker som bara upptäcktes genom att mäta och titta

- **Ren vit på fermob, inte `ljus`.** `#F7F5F0` ger 4,2:1 mot `#D3442E` och
  underkänns; ren vit ger 4,5:1. Skillnaden syns knappt men den är mätbar, så
  primärknappen bär `text-white`. Konstanten heter `TEXT_PA_FERMOB`.
- **"Planterad" betydde två saker.** Metadatafältet (ett datum) och knappen som
  gör en planerad växt verklig hette likadant. Fältet heter numera
  **"Planterades"**.
- **"Flyttat" loggades när en hemlös växt fick sin första plats.** Efter varje
  ny växt fylldes Hem av "Flyttat till …", vilket är fel: att fylla i var något
  står är metadata, inte en händelse i trädgården. Nu loggas bara riktiga
  flyttar (`repo.flyttaVaxt` returnerar tidigt när `franPlatsId` saknas).

### Bilder på två ställen är en gång för mycket

Första versionen visade fototidslinjen överst OCH samma bilder i full storlek i
historiken under. Historiken blev oläslig och kortet oändligt. Tidslinjen
(`bilder="sma"`) visar 56 px-miniatyrer på växt- och platskort; full storlek
finns kvar i den globala loggen, som är den vy man bläddrar i.

### Ritläget skulle inte gå att förväxla med läsläget

Första versionen hade bara en "Redigera"-länk och sedan såg allt likadant ut.
Nu: en fermob-tonad list med etiketten RITLÄGE, en hjälprad som säger vad man
kan göra just nu, och en tydlig **Klar**-knapp. Man ska aldrig undra om man är
i läget eller hur man tar sig ur det.

**Ångra-knappen har en FAST etikett.** Första försöket skrev ut vad som skulle
ångras på knappen ("Ångra placera Hortensian"). Det radbröt verktygsraden när
texten växte, och då hoppade hela ritytan nedåt mitt under arbetet. Vad som
ångras står i hjälpraden i stället, där bredden inte spelar roll.

**Ritläget får inte tvinga fram sidscroll.** Panelen till höger växte förbi
fönstret och puttade ut sidan; ritytan gled undan under handen. Raden har
numera fast höjd på desktop (`lg:h-[72vh] lg:flex-none`) och panelen scrollar
internt. Ett e2e-test vaktar att sidan inte kan scrolla i ritläget.

### Kurvor: hörnet är växeln, inte ett eget verktyg

En trädgård har sällan bara raka kanter. I stället för ett kurvverktyg är
varje hörn en växel: klicka på det så blir det mjukt, klicka igen så blir det
spetsigt. Handtaget visar vilket det är — cirkel för mjukt, fyrkant för
spetsigt. En D-formad rabatt är fyra punkter där de två på ena sidan är runda.

Det betyder att allt annat fungerar som förut: mått, snap till 0,1 m,
dragning av hörn. Kurvan är en presentation av punkterna, inte en egen
datamodell.

### Hem blev en instrumentbräda

Första versionen öppnade med en helskärmsbild från senaste händelsen. När den
var tom stod det "Ingen bild än" — och hela vyn lästes som en uppmaning att
ladda upp ett foto. Fel budskap: appen ska svara på *vad har jag och vad hände
senast*.

Nu: nyckeltal överst (växter, platser, veckans händelser — klickbara),
snabbåtgärd, och sedan sektioner som var och en **säger varför de finns**.
"Senast i trädgården" är ett kort, inte en hjälte.

**"Inte fotad på länge" var för vagt** och delades i två med tydliga rubriker:
*Väntar på sin första bild* (aldrig fotade — utan bild går det inte att följa
dem över säsongen) och *Dags att fota igen* (inte fotade på 60 dagar, med
datumet utskrivet). Och *Utan plats*, som faktiskt går att åtgärda.

### Inloggningen får inte skvallra om adressen

Inloggningsskärmen är den enda sidan en främling kan nå. Den visade
adresskylten och "Trädgårdsjournalen för Ripvägen 11". Nu ett neutralt märke,
"Trädgårdsjournal", och fliktiteln byts medan man är utloggad. Adresskylten hör
hemma innanför inloggningen. Ett komponenttest vaktar att adressen inte smyger
tillbaka.

### Två småsaker som gjorde stor skillnad

- **Loggens filter radbryter i stället för att scrolla.** Med dold scrollbar
  såg ett avklippt sista filter bara ut som en bugg.
- **Kameran öppnas automatiskt bara där det finns en kamera.** På dator slängde
  appen upp en filbläddrare innan man ens sett formuläret. Nu gissas enheten på
  `(pointer: coarse)`; på telefon går det rakt in i kameran som förut.

### Typlistan får inte vara en tvångströja

`häck` erbjuds inte längre (men är kvar som giltigt värde så gamla former
behåller sin stil). I stället finns **Egen…** — ett eget namn på typen
(`egenTyp`) för stenparti, kompost, damm. Ritstilen kommer fortfarande från en
standardtyp, så hatchning och linjevikt fungerar som vanligt.

### Materialen ska gå att känna igen utan etikett

Första omgången hatchning var prickar och streck i olika täthet — allt läste
som "mönster", inget som "material". Nu har varje yta sitt eget formspråk:
sten är runda klumpar i tre storlekar, grus är fint jämnt korn, gräs är strån i
par, vatten är liggande vågor, rabatt är mylla med små plantmarkeringar, trall
har både fog och ådring. Tre nya typer tillkom — **stenparti, grus och vatten**
— eftersom en trädgård sällan består av bara rabatt och gräs.

### Kurvan slog öglor

Catmull-Rom räknar tangenten på avståndet mellan hörnets GRANNAR. Har två
grannsegment mycket olika längd blir tangenten längre än det korta segmentet,
och kurvan viker tillbaka över sig själv — det syntes som en liten krumelur vid
ett hörn. Tangenten begränsas nu till 42 % av sitt eget segment. Ett test
kontrollerar att den samplade kurvan inte korsar sig själv.

### Ritningen som verktyg, inte bild

Tre tillägg som gör ritningen till något man arbetar i:

- **Area och omkrets** räknas ut per plats, på den samplade kurvan så att en
  rundad kant räknas rätt. Det är siffran man behöver när man ska beställa jord
  eller kantsten.
- **Måttbandet** mäter mellan två punkter direkt i ritningen.
- **Jämför ritningar** lägger en annan ritning över samma tomt som ett streckat
  spöke under den aktuella. Poängen med "Baksidan" och "Baksidan kommande" är
  att SE skillnaden, inte att bläddra mellan dem.

### Metadata utan formulär

Ifyllda fält visas som rader, tomma erbjuds som chips (`+ Sol  + Jord  + Antal`).
Chipraden krymper allteftersom och försvinner när allt är ifyllt. En växt med
bara namn och foto ser ren ut; en hon bryr sig om blir rik. Ingen skillnad i
flöde, inget formulär att "komma igenom".

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

## Fas 4

- **Foto = loggpost.** I stället för en separat fotomodul är ett foto en
  daterad anteckning i loggen (kameraknapp i snabbloggen; växtdetaljens
  "Lägg till foto" loggar också). Fototidslinjen "april vs juli" faller ut
  gratis ur ytans tidslinje. Foton i tidslinjen visas 4:3, max 240 px breda.
- **Årstidston:** ett CSS-filter på kartobjektslagret, bara i levande läget
  (redigeringen är färgneutral). Svalare vår, mättad sommar, varmare höst,
  avmättad vinter — en tonjustering, inte ett tema.
- **Städning:** borttagen växt/yta tar med sig loggposter OCH deras foton;
  Ångra på ett loggfoto raderar även blobben.

## Slutgranskning

- **Touchytor:** snabbloggens sekundärknappar (Ångra/Foto/Skriv anteckning),
  infokortets stängknapp och redigerarens tillbaka-länk höjda till 44 px
  efter granskning — specens minimum gäller ÄVEN småknappar.
- **Fotofel är aldrig tysta:** varje fotoväg (snabblogg, växtdetalj,
  växtformulär) visar "Fotot kunde inte sparas …" med role=alert.
- **Mått (m)-fält** i objektpanelen: spec-kravet "ange mått" uppfyllt genom
  att skala polygonens bounding box, förankrad i övre vänstra hörnet, mono.
- **Namnskydd:** enbart mellanslag i namn ger "Ge växten/ytan ett namn."
