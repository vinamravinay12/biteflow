/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: true,
  },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Focus coverage on the testable business/domain logic. UI components are
      // exercised through the app; the pure utils below carry the core rules.
      include: ['src/utils/**/*.ts'],
      exclude: ['src/utils/**/*.test.ts', 'src/utils/firebase.ts'],
      thresholds: {
        lines: 35,
        statements: 35,
        functions: 40,
        branches: 35
      }
    },
  },
})
