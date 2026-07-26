# Datamodell — Firestore

Hålls alltid i synk med `src/data/types.ts`. Appen handlar om **platser och
individer**, inte arter.

```
users/{uid}/
  tradgardar/{tradgardId}
    { namn, ordning, widthM?, heightM? }
  platser/{platsId}
    { tradgardId, namn, typ, egenTyp?, geometri?: { punkter: [{x,y}…], runda?: [index] },
      sol?, jord?, vetterMot?, vaderstreck?, status, anteckning? }
  vaxter/{vaxtId}
    { namn, platsId?, position?: {x,y}, status,
      sort?, planterad?, antal?, sol?, jord?, anteckning? }
  handelser/{handelseId}
    { typ, datum, vaxtId?, platsId?, fotoRef?, anteckning?,
      franPlatsId?, tillPlatsId?, datumOkant? }
  meta/migrering
    { version }
```

## Fyra begrepp, inga fler

**Trädgård** — Framsidan, Baksidan, Inomhus. Skapas tyst vid första körningen
(`sadTradgardar` i `repo.ts`), går att döpa om. `widthM`/`heightM` saknas ⇒
trädgården har ingen ritning (Inomhus).

**Plats** — det som ritas på ritningen OCH det som håller växter. Samma sak.
`geometri` är valfri: "Köksfönstret" är en plats utan form. **Ordet "yta" finns
inte längre** — varken i UI eller kod.

**Växt** — en individ. `platsId` är **valfri**; en hemlös växt är ett giltigt
tillstånd och listas under "Utan plats".

**Händelse** — all historik på ett ställe: skötsel, foton, flyttar,
planteringar, anteckningar.

## Konventioner

- **Koordinater är verkliga meter**, origo i tomtens ena hörn (`PunktM`), per
  trädgård. Snap vid ritande: 0,1 m.
- **Datum lagras som ISO-strängar**, inte Firestore Timestamp.
- **Platstyper:** `bod | altan | rabatt | gräsmatta | pallkrage | häck | träd |
  staket | annat`. Typen styr **endast ritstil och namnförslag** — aldrig vad
  som är tillåtet. Alla platser kan hålla växter (`VAXTBARA_TYPER` är borttagen).
- **Lagringsformat för punkter:** Firestore stödjer inte nästlade arrayer, så
  punkter lagras som `[{x, y}, …]` men är tupler `[x, y]` i appens typer.
  Konverteringen bor i `src/data/kartkonvertering.ts`.
- **`egenTyp`** är ett eget namn på platstypen när standardlistan inte räcker.
  `typ` styr fortfarande ritstilen; `egenTyp` styr bara etiketten. `häck` finns
  kvar som giltig `typ` men erbjuds inte längre i ritläget.
- **`geometri.runda`** är index på de hörn som ska vara MJUKA. Punkterna är
  sanningen, kurvan härleds (`src/lib/form.ts`) — så mått, snap och dragning
  fungerar precis som för raka former. En D-formad rabatt är fyra punkter där
  de två på ena sidan står i `runda`. Tom lista lagras inte.
- **`status: 'finns' | 'planerad'`** på både plats och växt. Planerat ritas
  streckat och listas separat på Hem. `Planterad`-knappen sätter `finns` och
  skriver en `planterat`-händelse med dagens datum.
- **`vetterMot` / `vaderstreck`** erbjuds bara på platser utan geometri —
  så får "Köksfönstret" ett läge ("vetter mot Baksidan, norr").
- **Foton är händelser.** Det finns ingen `photoRefs`-array. Ett foto =
  `{ typ: 'foto', datum, vaxtId?, platsId?, fotoRef }`. Det är detta som gör
  fototidslinjen möjlig: varje bild har ett datum.
- **`datumOkant: true`** sätts av migreringen på foton vars datum inte gick att
  återskapa. UI:t visar då `≈ maj 2026` i stället för att ljuga.
- **Flytt** är `{ typ: 'flyttat', franPlatsId?, tillPlatsId? }`. Ingen
  `moveHistory`.
- **Växtprickar:** växt med `position` ritas där; växt utan `position` vars
  plats har geometri autoplaceras i formen (deterministisk spiral).
- **id-fältet** i TS-typerna är dokument-id:t, ifyllt vid läsning.
- **Foton:** `fotoRef` pekar på en `photoStore`-nyckel. Molnläge:
  `users/{uid}/photos/{id}.jpg` i Storage. Lokalt läge: IndexedDB. Klienten
  komprimerar till max 1600 px före lagring.
- **uid:** i lokalt läge alltid `agare`.

## Migrering v1 → v2

Ren funktion i `src/data/migrering.ts` (`migreraV1TillV2`), testad mot fixtures
i `migrering.test.ts`. Drivs av `korMigrering` som läser gamla kollektioner,
skriver nya och stämplar `meta/migrering { version: 2 }`. Körs en gång per
datamängd — **lokalt läge och molnläge är skilda datamängder** och migreras
var för sig.

| v1 | v2 | Not |
|---|---|---|
| `garden/map` | `tradgardar/baksidan` (+ framsidan, inomhus) | mått följer med |
| `map.objects[]` | `platser/{samma id}` | id återanvänds |
| `areas` med `mapObjectId` | slås ihop i platsen | ytans namn vinner |
| `areas` utan `mapObjectId` | plats utan geometri i Baksidan | |
| `plants.areaId` | `platsId` via id-tabell | |
| `plants.photoRefs[]` | `foto`-händelser | datum saknas ⇒ `datumOkant` |
| `plants.moveHistory[]` | `flyttat`-händelser | datum finns, blir exakta |
| `logEntries` | `handelser` | typvärdena oförändrade |

Gamla kollektioner **raderas inte** av migreringen. Det är hela rollbacken.
