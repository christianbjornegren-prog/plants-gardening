# Ripvägen 11

Personlig trädgårdsjournal för tomten på Ripvägen 11 — platser och individer,
inte arter. Se [CLAUDE.md](CLAUDE.md) för hela visionen och
[docs/](docs/) för arkitektur, datamodell, testplan, backlog och designlogg.

## Kom igång

```bash
npm install
npm run dev
```

Utan Firebase-config körs appen i **lokalt läge**: all data sparas i
webbläsaren (Firestores beständiga cache) och ingen inloggning behövs.
För molnläge: kopiera `.env.example` till `.env.local` och fyll i värdena
från Firebase-konsolen.

## Kommandon

| Kommando | Gör |
|---|---|
| `npm run dev` | Dev-server |
| `npm run test` | Enhetstester (Vitest) |
| `npm run e2e` | Flödestester (Playwright, desktop + mobil 390×844) |
| `npm run typecheck` | TypeScript |
| `npm run build` | Produktionsbygge inkl. PWA |
| `node scripts/skarmdump.mjs <katalog>` | Skärmdumpar för designgranskning |
