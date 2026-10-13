import type { z } from 'zod';
import { apiErrorSchema } from '@/shared/contracts';

/** Error de la API con el `code` del contrato (BR-GEN-09), p. ej. `STOCK_INSUFFICIENT`. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string = 'HTTP_ERROR',
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;

/** Token Bearer que se envía en cada petición. Lo fija el login (o el puente de rol simulado en desarrollo). */
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

const url = (path: string) => new URL(`/api/v1${path}`, window.location.origin).toString();

type RequestOptions = { headers?: Record<string, string> };

const send = async (path: string, init?: RequestInit, options?: RequestOptions): Promise<unknown> => {
  const response = await fetch(url(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
  });
  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload);
    if (parsed.success) {
      throw new ApiError(parsed.data.message, response.status, parsed.data.code, parsed.data.details);
    }
    throw new ApiError(`Error ${response.status} en ${path}`, response.status);
  }
  return payload;
};

/** Frontera HTTP: toda respuesta se valida contra su contrato Zod antes de entrar a la app. */
export const api = {
  get: async <S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>> =>
    schema.parse(await send(path)),
  post: async <S extends z.ZodType>(
    path: string, body: unknown, schema: S, options?: RequestOptions,
  ): Promise<z.infer<S>> =>
    schema.parse(await send(path, { method: 'POST', body: JSON.stringify(body) }, options)),
  put: async <S extends z.ZodType>(path: string, body: unknown, schema: S): Promise<z.infer<S>> =>
    schema.parse(await send(path, { method: 'PUT', body: JSON.stringify(body) })),
  delete: async <S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>> =>
    schema.parse(await send(path, { method: 'DELETE' })),
};
