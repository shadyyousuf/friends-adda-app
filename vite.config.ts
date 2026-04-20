import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { VitePWA } from 'vite-plugin-pwa'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    VitePWA({
      outDir: '.output/public',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        id: '/',
        short_name: 'Friends Adda',
        name: 'Friends Adda',
        description: 'Plan hangouts, track money, and keep every member in sync.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#08111e',
        background_color: '#08111e',
        categories: ['productivity', 'social', 'events'],
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
          },
          {
            src: '/logo192.png',
            type: 'image/png',
            sizes: '192x192',
            purpose: 'any',
          },
          {
            src: '/logo512.png',
            type: 'image/png',
            sizes: '512x512',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' && url.origin === self.location.origin,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-pages',
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ request, url }) =>
              url.origin === self.location.origin &&
              (request.destination === 'script' ||
                request.destination === 'style' ||
                request.destination === 'worker'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-static',
            },
          },
          {
            urlPattern: ({ request, url }) =>
              url.origin === self.location.origin &&
              request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-images',
            },
          },
        ],
      },
    }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
