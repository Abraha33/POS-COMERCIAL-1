import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5188' },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5188',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
