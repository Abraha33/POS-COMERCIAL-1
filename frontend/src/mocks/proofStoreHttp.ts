import type { PaymentProof } from '@/shared/contracts';
import type { ProofStore } from './proofStore';

/**
 * Cliente del almacén compartido de desarrollo (Vite: `/dev-relay/payment-proofs`). Lo usa solo el navegador de
 * desarrollo; las pruebas usan la versión en memoria. Es un simulador de servidor, no un endpoint del contrato.
 */
const BASE = '/dev-relay/payment-proofs';

const read = async (url: string): Promise<PaymentProof | undefined> => {
  const res = await fetch(url);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('El almacén de comprobantes de desarrollo no responde.');
  return (await res.json()) as PaymentProof;
};

export const createHttpProofStore = (): ProofStore => ({
  get: (id) => read(`${BASE}/id/${encodeURIComponent(id)}`),
  getByToken: (token) => read(`${BASE}/token/${encodeURIComponent(token)}`),
  findByOperation: (operationId, channelId, amount) => {
    const query = new URLSearchParams({ operationId, channelId, amount: String(amount) });
    return read(`${BASE}/operation?${query.toString()}`);
  },
  put: async (proof) => {
    const res = await fetch(`${BASE}/id/${encodeURIComponent(proof.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proof),
    });
    if (!res.ok) throw new Error('No se pudo guardar el comprobante en el almacén de desarrollo.');
  },
});
