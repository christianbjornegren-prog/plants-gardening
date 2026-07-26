import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5273',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobil',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: {
    // Egen port så vi aldrig krockar med andra dev-servrar på 5173.
    // dev:lokal tvingar lokalt läge — annars fastnar testerna på
    // inloggningsskärmen på en maskin som har .env.local ifylld.
    command: 'npm run dev:lokal -- --port 5273 --strictPort',
    url: 'http://localhost:5273',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
