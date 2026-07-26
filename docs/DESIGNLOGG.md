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
