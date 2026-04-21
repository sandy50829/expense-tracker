import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: '分帳記帳本',
        short_name: '記帳本',
        description: '多人分帳記帳 PWA 應用',
        theme_color: '#C9B1A1',
        background_color: '#F5F0EB',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.frankfurter\.dev\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'exchange-rates',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 86400, // 1 day
              },
            },
          },
        ],
      },
    }),
  ],
})
