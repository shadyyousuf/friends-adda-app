import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [viteReact() as never],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'test-results/**', '.output/**', 'node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
    environmentMatchGlobs: [['src/**/*.test.tsx', 'jsdom']],
  },
})
