import type { LookupResult, SendResult, Transport } from './offline';
import type { QueuedOperation } from './types';

export type SimulatedOutcome = 'ok' | 'rejected' | 'conflict' | 'network' | 'lost';

export const outcomeLabels: Record<SimulatedOutcome, string> = {
  ok: 'El servidor confirma',
  rejected: 'El servidor rechaza',
  conflict: 'Conflicto con el servidor',
  network: 'Falla de red (no llega)',
  lost: 'Se aplica pero se pierde la respuesta',
};

/**
 * Servidor remoto SIMULADO con un libro por clave de idempotencia. No es un endpoint: sirve para demostrar
 * y probar que reenviar con la misma clave no duplica el efecto.
 */
export const createSimulatedRemote = () => {
  const ledger = new Map<string, string>();
  const script: SimulatedOutcome[] = [];
  let sequence = 0;
  let reachable = true;
  const sentLog: { key: string; outcome: SimulatedOutcome | 'duplicate' }[] = [];

  const applyOnce = (op: QueuedOperation): string => {
    const existing = ledger.get(op.idempotencyKey);
    if (existing) return existing;
    sequence += 1;
    const ref = `REM-${String(sequence).padStart(4, '0')}`;
    ledger.set(op.idempotencyKey, ref);
    return ref;
  };

  const transport: Transport = {
    send: async (op): Promise<SendResult> => {
      if (!reachable) return { kind: 'network' };
      if (ledger.has(op.idempotencyKey)) {
        // Reenvío de algo ya aplicado: el servidor responde lo mismo y NO vuelve a aplicar.
        sentLog.push({ key: op.idempotencyKey, outcome: 'duplicate' });
        return { kind: 'ok', remoteRef: ledger.get(op.idempotencyKey)! };
      }
      const outcome = script.shift() ?? 'ok';
      sentLog.push({ key: op.idempotencyKey, outcome });
      switch (outcome) {
        case 'ok': return { kind: 'ok', remoteRef: applyOnce(op) };
        case 'rejected': return { kind: 'rejected', code: 'TURNO_CERRADO', message: 'El turno ya fue cerrado en el servidor.' };
        case 'conflict': return { kind: 'conflict', code: 'STOCK_CAMBIO', message: 'El inventario cambió y la venta ya no cabe.' };
        case 'network': return { kind: 'network' };
        case 'lost':
          applyOnce(op);
          return { kind: 'lost' };
      }
    },
    lookup: async (key): Promise<LookupResult> => {
      if (!reachable) return { kind: 'unavailable' };
      const ref = ledger.get(key);
      return ref ? { kind: 'applied', remoteRef: ref } : { kind: 'not-applied' };
    },
  };

  return {
    transport,
    /** Programa el resultado de los próximos envíos, en orden. */
    script: (...outcomes: SimulatedOutcome[]) => void script.push(...outcomes),
    clearScript: () => void (script.length = 0),
    setReachable: (value: boolean) => void (reachable = value),
    isReachable: () => reachable,
    /** Cuántas veces se APLICÓ cada clave: para comprobar que no hay duplicados. */
    appliedCount: () => ledger.size,
    appliedKeys: () => [...ledger.keys()],
    sentLog: () => [...sentLog],
  };
};

export type SimulatedRemote = ReturnType<typeof createSimulatedRemote>;
