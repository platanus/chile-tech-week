import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Frontend unit tests: pure modules under app/frontend (no jsdom). The suite is empty until
// the first *.test.ts lands, and an empty run must not fail bin/ci.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./app/frontend', import.meta.url)),
      '~': fileURLToPath(new URL('./app/frontend', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['app/frontend/**/*.test.ts'],
    passWithNoTests: true,
  },
});
