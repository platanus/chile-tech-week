import { defineConfig } from '@playwright/test';

// End-to-end checks against a running dev stack (`bin/dev`; PORT is the checkout's Rails
// port, see bin/dev-env). `PLAYWRIGHT_BASE_URL=http://localhost:20123 npm run e2e`.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    screenshot: 'only-on-failure',
  },
});
