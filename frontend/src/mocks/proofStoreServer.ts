import type { PaymentProof } from '@/shared/contracts';

/**
 * SIMULADOR de servidor compartido para comprobantes (NO es contrato). Lo sirve el middleware de Vite en
 * `/dev-relay/payment-proofs`. Solo existe en el servidor de desarrollo; las rutas son internas del mock.
 */
export type StoreReply = { status: number; body: unknown };

const proofs = new Map<string, PaymentProof>();
export const resetProofStoreServer = (): void => proofs.clear();

const find = (predicate: (proof: PaymentProof) => boolean): StoreReply => {
  const found = [...proofs.values()].find(predicate);
  return found ? { status: 200, body: found } : { status: 404, body: { code: 'NOT_FOUND', message: 'Comprobante no encontrado' } };
};

export const handleProofStore = (method: string, path: string, query: URLSearchParams, body: Record<string, unknown>): StoreReply => {
  const [kind, value] = path.split('/').filter(Boolean);
  if (method === 'GET' && kind === 'id' && value) return find((proof) => proof.id === decodeURIComponent(value));
  if (method === 'GET' && kind === 'token' && value) return find((proof) => proof.token === decodeURIComponent(value));
  if (method === 'GET' && kind === 'operation') {
    const operationId = query.get('operationId');
    const channelId = query.get('channelId');
    const amount = Number(query.get('amount'));
    return find((proof) => proof.operationId === operationId && proof.channelId === channelId && proof.amount === amount);
  }
  if (method === 'PUT' && kind === 'id' && value) {
    proofs.set(decodeURIComponent(value), body as unknown as PaymentProof);
    return { status: 200, body: { ok: true } };
  }
  return { status: 404, body: { code: 'NOT_FOUND', message: 'Ruta sin handler' } };
};
