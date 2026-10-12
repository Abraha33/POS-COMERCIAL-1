import { syncBatchResultSchema, syncOperationResultSchema, type SyncBatch, type SyncOperationResult } from '@/shared/contracts';
import { ApiError, api } from './client';

/** Cola offline del POS contra el servidor (PROPUESTA v0.6.0, capa 5). Reenviar una clave nunca duplica el efecto. */
export const posSyncApi = {
  send: async (batch: SyncBatch): Promise<SyncOperationResult[]> =>
    (await api.post('/pos/sync/batches', batch, syncBatchResultSchema)).results,
  /** `null` = el servidor nunca la recibió. */
  lookup: async (idempotencyKey: string): Promise<SyncOperationResult | null> => {
    try {
      return await api.get(`/pos/sync/operations/${encodeURIComponent(idempotencyKey)}`, syncOperationResultSchema);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
};
export type PosSyncApi = typeof posSyncApi;
