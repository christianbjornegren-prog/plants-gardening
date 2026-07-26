import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['ikon-180.png'],
      manifest: {
        name: 'Ripvägen 11',
        short_name: 'Ripvägen 11',
        description: 'Trädgårdsjournal för Ripvägen 11',
        lang: 'sv',
        start_url: '/',
        display: 'standalone',
        // Måste följa den mörka appen — annars blinkar installationen
        // ljusbeige innan appen laddat. botten resp. panel.
        background_color: '#12110B',
        theme_color: '#24231B',
        icons: [
          { src: 'ikon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'ikon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'ikon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
