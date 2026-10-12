import path from 'node:path';
import type { IncomingMessage } from 'node:http';
import react from '@vitejs/plugin-react';
import { getResponse } from 'msw';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const readBody = async (req: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array));
  return Buffer.concat(chunks);
};

/**
 * Sirve `/api/v1` con los mismos handlers MSW desde el servidor de desarrollo.
 * Hace falta en la LAN: por http://<IP>:<puerto> el navegador no permite service workers (contexto no seguro),
 * así que MSW no puede interceptar en el cliente. En localhost sigue mandando el service worker (llega antes).
 * El estado simulado queda en el servidor y lo comparten todos los equipos de la red; se reinicia con el servidor.
 */
// Los handlers MSW usan rutas relativas y MSW las resuelve contra `location`; en Node no existe, así que se fija una base.
const MOCK_ORIGIN = 'http://lan-mocks.local';

const apiMocksForLan = (): Plugin => ({
  name: 'api-mocks-lan',
  apply: 'serve',
  configureServer(server) {
    (globalThis as { location?: unknown }).location ??= new URL(`${MOCK_ORIGIN}/`);
    server.middlewares.use('/api/v1', (req, res) => {
      void (async () => {
        const { handlers } = (await server.ssrLoadModule('/src/mocks/handlers/index.ts')) as {
          handlers: Parameters<typeof getResponse>[0];
        };
        const body = await readBody(req);
        const headers = new Headers();
        for (const [name, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(name, value);
        const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && body.length > 0;
        const request = new Request(`${MOCK_ORIGIN}${req.originalUrl ?? req.url ?? '/'}`, {
          method: req.method,
          headers,
          body: hasBody ? new Uint8Array(body) : undefined,
        });
        const response = await getResponse(handlers, request);
        if (!response) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Ruta sin handler' }));
          return;
        }
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      })();
    });
  },
});

export default defineConfig({
  plugins: [react(), apiMocksForLan()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // host: true expone el dev server en la LAN -> abrir desde otro equipo: http://<IP-LAN>:<puerto>/pos
  // (usa DEV_HOST=localhost para volver a restringirlo a esta máquina).
  server: {
    host: process.env.DEV_HOST ?? true,
    port: Number(process.env.DEV_PORT ?? 5188),
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    testTimeout: 20_000,
  },
});
