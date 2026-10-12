import type { PosSyncApi } from '@/shared/api/sync';
import type { LookupResult, SendResult, Transport } from './offline';
import type { QueuedOperation } from './types';

/**
 * Transporte de la cola offline contra la API de capa 5 (`/pos/sync/batches`). Mapea el resultado del servidor a los
 * del dominio: confirmada→ok, rechazada→rejected, revision→conflict, reintentable/red→network.
 */
export const createHttpTransport = (api: PosSyncApi, serverShiftId?: () => string | undefined): Transport => ({
  send: async (op: QueuedOperation): Promise<SendResult> => {
    try {
      const [result] = await api.send({
        deviceId: op.scope.terminalId,
        operations: [{
          idempotencyKey: op.idempotencyKey, kind: op.kind,
          // El turno de pos-ops puede ser un registro local de demostración; el servidor solo conoce su turno real.
          shiftId: serverShiftId?.() ?? op.shiftId, createdAt: op.createdAt,
          payload: op.payload, ...(op.dependsOn.length > 0 ? { dependsOn: op.dependsOn } : {}),
        }],
      });
      if (!result) return { kind: 'lost' };
      switch (result.status) {
        case 'confirmada': return { kind: 'ok', remoteRef: result.remoteRef ?? op.idempotencyKey };
        case 'rechazada': return { kind: 'rejected', code: result.code ?? 'RECHAZADA', message: result.message ?? 'El servidor rechazó la operación.' };
        case 'revision': return { kind: 'conflict', code: result.code ?? 'REVISION', message: result.message ?? 'Requiere revisión.' };
        case 'reintentable': return { kind: 'network' };
      }
    } catch (e) {
      // Un error de la API (4xx/5xx con código) es un rechazo; sin respuesta de la API, la red falló.
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : null;
      if (code && code !== 'HTTP_ERROR') return { kind: 'rejected', code, message: e instanceof Error ? e.message : code };
      return { kind: 'network' };
    }
  },
  lookup: async (idempotencyKey: string): Promise<LookupResult> => {
    try {
      const found = await api.lookup(idempotencyKey);
      if (!found) return { kind: 'not-applied' };
      return found.status === 'confirmada'
        ? { kind: 'applied', remoteRef: found.remoteRef ?? idempotencyKey }
        : { kind: 'not-applied' };
    } catch {
      return { kind: 'unavailable' };
    }
  },
});
