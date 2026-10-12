import { handleRelay } from './relay';
import type { NewProofInput, ProofRequest, PublicProof } from './proofs';

/** Acceso a las solicitudes de comprobante. Dos implementaciones: HTTP (relay de la LAN) y en memoria (pruebas). */
export type ProofGateway = {
  create: (input: Omit<NewProofInput, 'id' | 'token'>) => Promise<ProofRequest>;
  get: (id: string) => Promise<ProofRequest>;
  getPublic: (token: string) => Promise<PublicProof>;
  submitPublic: (token: string, image: string) => Promise<ProofRequest>;
  submitLocal: (id: string, image: string, actor: string) => Promise<ProofRequest>;
  verify: (id: string, actor: string) => Promise<ProofRequest>;
  confirm: (id: string, actor: string) => Promise<ProofRequest>;
  reject: (id: string, actor: string, reason: string) => Promise<ProofRequest>;
  authorizeException: (id: string, actor: string, reason: string) => Promise<ProofRequest>;
};

export class ProofGatewayError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

const BASE = '/dev-relay/proofs';

const http = async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ProofGatewayError('NETWORK', 'No hay conexión con el servidor de comprobantes.', 0);
  }
  const json = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
  if (!res.ok) throw new ProofGatewayError(json.code ?? 'ERROR', json.message ?? 'No se pudo completar la operación.', res.status);
  return json as T;
};

const wire = (call: <T>(method: string, path: string, body?: unknown) => Promise<T>): ProofGateway => ({
  create: (input) => call('POST', '', input),
  get: (id) => call('GET', `/${id}`),
  getPublic: (token) => call('GET', `/public/${token}`),
  submitPublic: (token, image) => call('POST', `/public/${token}/evidence`, { image }),
  submitLocal: (id, image, actor) => call('POST', `/${id}/evidence`, { image, actor }),
  verify: (id, actor) => call('POST', `/${id}/verify`, { actor }),
  confirm: (id, actor) => call('POST', `/${id}/confirm`, { actor }),
  reject: (id, actor, reason) => call('POST', `/${id}/reject`, { actor, reason }),
  authorizeException: (id, actor, reason) => call('POST', `/${id}/exception`, { actor, reason }),
});

export const createHttpGateway = (): ProofGateway => wire(http);

/** Misma lógica de servidor, en el proceso: pruebas y modo sin servidor de desarrollo. */
export const createMemoryGateway = (): ProofGateway =>
  wire(async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
    const r = handleRelay(method, path, (body ?? {}) as Record<string, unknown>);
    if (r.status >= 400) {
      const e = r.body as { code: string; message: string };
      throw new ProofGatewayError(e.code, e.message, r.status);
    }
    return r.body as T;
  });

let current: ProofGateway = createHttpGateway();
export const getProofGateway = (): ProofGateway => current;
export const setProofGateway = (gateway: ProofGateway): void => {
  current = gateway;
};
