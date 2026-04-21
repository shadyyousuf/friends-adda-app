import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { VitePWA } from 'vite-plugin-pwa'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      outDir: '.output/public',
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      includeAssets: [
        'manifest.json',
        'favicon.ico',
        'install-icon-192.png',
        'install-icon-512.png',
        'install-icon-1024.png',
        'logo.png',
        'logo192.png',
        'logo512.png',
        'logo1024.png',
      ],
      devOptions: {
        enabled: false,
        type: 'module',
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
      },
    }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
