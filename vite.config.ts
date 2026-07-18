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
      exclude: ['src/utils/**/*.test.ts', 'src/utils/firebase.ts', 'src/utils/database.ts'],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 75
      }
    },
  },
})
