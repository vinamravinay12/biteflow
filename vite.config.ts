/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
      // firebase.ts is excluded because it is pure SDK bootstrapping with no
      // branching logic of our own. database.ts IS included: it is the largest
      // util and excluding it would inflate the headline number rather than
      // reflect real coverage.
      exclude: ['src/utils/**/*.test.ts', 'src/utils/firebase.ts'],
      // Two-tier thresholds. The pure domain modules carry the business rules
      // and are held to a near-total bar. The global floor reflects the real
      // number including database.ts, which is largely Firestore I/O wrappers
      // whose fallback paths are tested but whose SDK passthroughs are not.
      // The floor is deliberately the honest figure, not a flattering one.
      thresholds: {
        lines: 40,
        statements: 40,
        functions: 45,
        branches: 40,
        'src/utils/aiActions.ts': { lines: 100, statements: 95, branches: 90 },
        'src/utils/cart.ts': { lines: 100, statements: 100, branches: 85 },
        'src/utils/crypto.ts': { lines: 100, statements: 100, branches: 85 },
        'src/utils/useDocumentLanguage.ts': { lines: 100, statements: 90, branches: 75 },
      },
    },
  },
});
