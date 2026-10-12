import { defineConfig } from '@playwright/test';

// Cada worktree usa su propio puerto (DEV_PORT) para correr en paralelo sin colisiones.
// Puerto propio de las pruebas (8090): no choca con `pnpm dev` (8082) que puede estar abierto.
const port = Number(process.env.DEV_PORT ?? 8090);

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: 'pnpm dev',
    env: { DEV_PORT: String(port) },
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
