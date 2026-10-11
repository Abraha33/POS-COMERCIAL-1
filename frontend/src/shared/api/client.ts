import type { z } from 'zod';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const url = (path: string) => new URL(`/api${path}`, window.location.origin).toString();

const send = async (path: string, init?: RequestInit): Promise<unknown> => {
  const response = await fetch(url(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) throw new ApiError(`Error ${response.status} en ${path}`, response.status);
  return response.json();
};

/** Frontera HTTP: toda respuesta se valida contra su contrato Zod antes de entrar a la app. */
export const api = {
  get: async <S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>> =>
    schema.parse(await send(path)),
  post: async <S extends z.ZodType>(path: string, body: unknown, schema: S): Promise<z.infer<S>> =>
    schema.parse(await send(path, { method: 'POST', body: JSON.stringify(body) })),
  put: async <S extends z.ZodType>(path: string, body: unknown, schema: S): Promise<z.infer<S>> =>
    schema.parse(await send(path, { method: 'PUT', body: JSON.stringify(body) })),
};
