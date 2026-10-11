import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Conformidad por HTTP real: usa fetch de Node y API_BASE_URL. Se ejecuta en jsdom solo para que el
 * servidor mock (sin API_BASE_URL) pueda resolver las rutas relativas de los handlers MSW.
 */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    environment: 'jsdom',
    include: ['src/conformance/*.conformance.ts'],
    testTimeout: 20_000,
    fileParallelism: false,
  },
});
