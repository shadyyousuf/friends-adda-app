import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      exclude: ['tests/e2e/**', 'test-results/**', '.output/**', 'node_modules/**'],
    },
  }),
)
