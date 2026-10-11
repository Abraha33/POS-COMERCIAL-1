import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { getResponse } from 'msw';
import { handlers } from '@/mocks/handlers';

const readBody = async (req: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array));
  return Buffer.concat(chunks);
};

/**
 * Expone los handlers MSW como un servidor HTTP real. Sirve para (1) comprobar el camino
 * "suite por HTTP" sin backend y (2) que quien desarrolla el backend compare su comportamiento.
 */
export const startMockHttpServer = async (): Promise<{ url: string; close: () => Promise<void> }> => {
  const server: Server = createServer((req, res) => {
    void (async () => {
      const body = await readBody(req);
      // Los handlers MSW usan rutas relativas: se resuelven contra el origen de `location` (jsdom).
      const origin = globalThis.location?.origin ?? 'http://localhost';
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(name, value);
      }
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && body.length > 0;
      const request = new Request(`${origin}${req.url ?? '/'}`, {
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

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/api/v1`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
