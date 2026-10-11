import { defineConfig } from '@playwright/test';

// Cada worktree usa su propio puerto (DEV_PORT) para correr en paralelo sin colisiones.
const port = Number(process.env.DEV_PORT ?? 5188);

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: 'pnpm dev',
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
