import type { PaymentProof } from '@/shared/contracts';
import { state } from './db';

/**
 * Almacén de comprobantes del mock. En pruebas vive en memoria (como el resto de la base de mocks). En el navegador
 * de desarrollo apunta al servidor de Vite, para que el computador y el teléfono vean el mismo comprobante.
 */
export type ProofStore = {
  get: (id: string) => Promise<PaymentProof | undefined>;
  getByToken: (token: string) => Promise<PaymentProof | undefined>;
  findByOperation: (operationId: string, channelId: string, amount: number) => Promise<PaymentProof | undefined>;
  put: (proof: PaymentProof) => Promise<void>;
};

export const memoryProofStore = (): ProofStore => ({
  get: async (id) => state.paymentProofs.get(id),
  getByToken: async (token) => [...state.paymentProofs.values()].find((item) => item.token === token),
  findByOperation: async (operationId, channelId, amount) =>
    [...state.paymentProofs.values()].find((item) => item.operationId === operationId && item.channelId === channelId && item.amount === amount),
  put: async (proof) => {
    state.paymentProofs.set(proof.id, proof);
  },
});

let current: ProofStore = memoryProofStore();
export const getProofStore = (): ProofStore => current;
export const setProofStore = (store: ProofStore): void => {
  current = store;
};
