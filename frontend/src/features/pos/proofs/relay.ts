import { uuid } from '@/shared/utils/uuid';
import {
  authorizeException, confirmPayment, createProof, rejectPayment, startVerification, submitEvidence, toPublic,
  type NewProofInput, type ProofRequest, type Result,
} from './proofs';

/**
 * SIMULADOR de servidor para comprobantes (NO es un endpoint del contrato). Lo sirve el middleware de Vite en
 * `/dev-relay/proofs` para que el teléfono y el computador compartan estado en la LAN. El contrato real
 * (PROPUESTA) está descrito en docs/qa/POS_COMPROBANTES_MOVILES.md.
 */
export type RelayReply = { status: number; body: unknown };

const store = new Map<string, ProofRequest>();
export const resetRelay = (): void => store.clear();

const reply = (status: number, body: unknown): RelayReply => ({ status, body });
const fromResult = <T,>(r: Result<T>, save: (value: T) => void): RelayReply => {
  if (r.ok) {
    save(r.value);
    return reply(200, r.value);
  }
  const status = r.code === 'EXPIRED' ? 410 : r.code === 'NOT_FOUND' ? 404 : r.code === 'INVALID_STATE' ? 409 : 422;
  return reply(status, { code: r.code, message: r.message });
};
const byToken = (token: string): ProofRequest | undefined => [...store.values()].find((p) => p.token === token);

type Body = Record<string, unknown>;
const str = (b: Body, key: string): string => (typeof b[key] === 'string' ? (b[key] as string) : '');

export const handleRelay = (method: string, path: string, body: Body, now: Date = new Date()): RelayReply => {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

  if (method === 'POST' && parts.length === 0) {
    const input: NewProofInput = {
      id: uuid(), token: uuid().replace(/-/g, ''),
      operationId: str(body, 'operationId'), method: str(body, 'method'), channelId: str(body, 'channelId'),
      channelLabel: str(body, 'channelLabel'), amount: Number(body.amount), destination: str(body, 'destination'),
      employee: str(body, 'employee'),
    };
    // Una solicitud viva por operación y canal: se reutiliza, no se duplica.
    const live = [...store.values()].find(
      (p) => p.operationId === input.operationId && p.channelId === input.channelId && p.amount === input.amount && p.status !== 'rechazado',
    );
    if (live) return reply(200, live);
    return fromResult(createProof(input, now), (p) => store.set(p.id, p));
  }

  if (parts[0] === 'public' && parts[1]) {
    const proof = byToken(parts[1]);
    if (!proof) return reply(404, { code: 'NOT_FOUND', message: 'El enlace no existe o ya no es válido.' });
    if (method === 'GET') return reply(200, toPublic(proof));
    if (method === 'POST' && parts[2] === 'evidence') {
      return fromResult(submitEvidence(proof, str(body, 'image'), 'teléfono', now), (p) => store.set(p.id, p));
    }
  }

  const proof = parts[0] ? store.get(parts[0]) : undefined;
  if (parts[0] && parts[0] !== 'public') {
    if (!proof) return reply(404, { code: 'NOT_FOUND', message: 'Solicitud no encontrada.' });
    if (method === 'GET' && parts.length === 1) return reply(200, proof);
    const save = (p: ProofRequest) => store.set(p.id, p);
    if (method === 'POST' && parts[1] === 'evidence') return fromResult(submitEvidence(proof, str(body, 'image'), str(body, 'actor') || 'cajero', now), save);
    if (method === 'POST' && parts[1] === 'verify') return fromResult(startVerification(proof, str(body, 'actor'), now), save);
    if (method === 'POST' && parts[1] === 'confirm') return fromResult(confirmPayment(proof, str(body, 'actor'), now), save);
    if (method === 'POST' && parts[1] === 'reject') return fromResult(rejectPayment(proof, str(body, 'actor'), str(body, 'reason'), now), save);
    if (method === 'POST' && parts[1] === 'exception') {
      return fromResult(authorizeException(proof, str(body, 'actor'), str(body, 'reason'), now), save);
    }
  }
  return reply(404, { code: 'NOT_FOUND', message: 'Ruta sin handler' });
};
