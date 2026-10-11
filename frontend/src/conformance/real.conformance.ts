import { afterAll, beforeAll } from 'vitest';
import { startMockHttpServer } from './mock-http-server';
import { registerConformance } from './scenarios';

/**
 * Con `API_BASE_URL` corre contra el backend indicado (cargado con contracts/fixtures).
 * Sin ella, levanta el mock como servidor HTTP y corre contra él (verifica el camino por HTTP real).
 */
let baseUrl = process.env.API_BASE_URL?.replace(/\/$/, '') ?? '';
let closeMock: (() => Promise<void>) | undefined;

beforeAll(async () => {
  if (baseUrl) return;
  const mock = await startMockHttpServer();
  baseUrl = mock.url;
  closeMock = mock.close;
});

afterAll(async () => {
  await closeMock?.();
});

registerConformance(() => baseUrl);
