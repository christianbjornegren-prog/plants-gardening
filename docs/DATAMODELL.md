# Datamodell — Firestore

Hålls alltid i synk med `src/data/types.ts`. Appen handlar om **platser och
individer**, inte arter.

```
users/{uid}/
  garden/map              ← ETT dokument: hela kartan
    { widthM, heightM, objects: [ {id, type, name, points: [[x,y],...], note?} ] }
  areas/{areaId}          ← ytor som kan innehålla växter
    { name, mapObjectId?, sunExposure?, soil?, note? }
  plants/{plantId}
    { name, areaId, position?: {x,y}, photoRefs: [], note?,
      moveHistory: [ {fromAreaId, toAreaId, date} ] }
  logEntries/{entryId}
    { plantId?, areaId?, type: 'vattnat'|'gödslat'|'beskuret'|'planterat'|'anteckning',
      date, note?, photoRef? }
```

## Konventioner

- **Koordinater är verkliga meter**, origo i tomtens ena hörn (`PunktM`).
  `widthM`/`heightM` är tomtens mått. Snap vid redigering: 0,1 m.
- **Datum lagras som ISO-strängar** (`date`), inte Firestore Timestamp —
  enklare, serialiserbart och räcker för en användare.
- **Kartobjekt** (`objects[]`) är polygoner + typ. Typer:
  `bod | altan | rabatt | gräsmatta | pallkrage | häck | träd | staket | annat`.
  Typer i `VAXTBARA_TYPER` kan kopplas till en yta.
- **Yta ≠ kartobjekt.** En yta kan sakna kartposition (t.ex. "Köksfönstret").
  Ett kartobjekt kan sakna yta (t.ex. staketet). Koppling via `mapObjectId`.
- **id-fältet** i TS-typerna är dokument-id:t, ifyllt vid läsning (lagras inte
  som fält i dokumentet, utom för kartobjekt som ligger i en array).
- **Foton:** `photoRefs`/`photoRef` pekar på `photoStore`-nycklar. I molnläge:
  `users/{uid}/photos/{id}.jpg` i Storage. I lokalt läge: IndexedDB. Klienten
  komprimerar till max 1600 px före lagring.
- **uid:** i lokalt läge alltid `agare`.
