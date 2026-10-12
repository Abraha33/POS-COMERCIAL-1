import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '@/mocks/server';
import { resetDb } from '@/mocks/db';

// Con varios agentes y workers en paralelo el primer render (rutas lazy) puede tardar más de 1 s.
configure({ asyncUtilTimeout: 5000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetDb();
  // El borrador de venta (draft.ts) vive en sessionStorage: se reinicia con la base de mocks.
  window.sessionStorage.clear();
});
afterAll(() => server.close());

// jsdom no implementa matchMedia (lo usa PrimeReact).
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
