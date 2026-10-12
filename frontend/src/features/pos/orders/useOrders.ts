import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Order } from './orders';
import { emptyReport, syncOrders, type OrdersGateway, type SyncReport } from './ordersSync';

/**
 * Pedidos del POS guardados en el dispositivo, por sede (PROPUESTA: no hay backend de pedidos).
 * Cualquier componente que use este hook ve los cambios al instante (y los de otras pestañas, por el evento `storage`).
 * Un fallo de escritura (cuota, modo privado) se devuelve en `saved: false`: el llamador NO debe dar la acción por hecha.
 */
const keyOf = (branchId: string) => `pos.orders.v1.${branchId}`;
const dirtyKeyOf = (branchId: string) => `pos.orders.dirty.v1.${branchId}`;
const listeners = new Set<() => void>();
const memory = new Map<string, string>();

const readRaw = (branchId: string): string => {
  try {
    return window.localStorage.getItem(keyOf(branchId)) ?? memory.get(branchId) ?? '[]';
  } catch {
    return memory.get(branchId) ?? '[]';
  }
};

const writeRaw = (branchId: string, raw: string): boolean => {
  memory.set(branchId, raw);
  try {
    window.localStorage.setItem(keyOf(branchId), raw);
    listeners.forEach((l) => l());
    return true;
  } catch {
    listeners.forEach((l) => l());
    return false;
  }
};

const readDirty = (branchId: string): string[] => {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(dirtyKeyOf(branchId)) ?? '[]');
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};
const writeDirty = (branchId: string, ids: string[]) => {
  try {
    window.localStorage.setItem(dirtyKeyOf(branchId), JSON.stringify([...new Set(ids)]));
  } catch {
    /* sin almacenamiento: se reintentará con el estado en memoria */
  }
};

const parse = (raw: string): Order[] => {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as Order[]) : [];
  } catch {
    return [];
  }
};

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  window.addEventListener('storage', notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener('storage', notify);
  };
};

export const useOrders = (branchId: string) => {
  const raw = useSyncExternalStore(subscribe, () => readRaw(branchId), () => '[]');
  const orders = useMemo(() => parse(raw), [raw]);

  /** Aplica un cambio sobre la lista más reciente y guarda. Devuelve si quedó guardado. */
  const mutate = useCallback(
    (fn: (current: Order[]) => Order[]): boolean => {
      const before = parse(readRaw(branchId));
      const after = fn(before);
      // Lo que cambió (o es nuevo) queda pendiente de enviar al servidor.
      const prev = new Map(before.map((o) => [o.id, JSON.stringify(o)]));
      const changed = after.filter((o) => prev.get(o.id) !== JSON.stringify(o)).map((o) => o.id);
      if (changed.length > 0) writeDirty(branchId, [...readDirty(branchId), ...changed]);
      const saved = writeRaw(branchId, JSON.stringify(after));
      if (changed.length > 0) scheduleSync(branchId, 250);
      return saved;
    },
    [branchId],
  );
  const replace = useCallback(
    (order: Order): boolean => mutate((all) => all.map((o) => (o.id === order.id ? order : o))),
    [mutate],
  );
  const add = useCallback((order: Order): boolean => mutate((all) => [...all, order]), [mutate]);

  return { orders, mutate, replace, add };
};

/** Solo para pruebas: vacía los pedidos de una sede. */
export const clearOrders = (branchId: string): void => {
  memory.delete(branchId);
  try {
    window.localStorage.removeItem(keyOf(branchId));
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((l) => l());
};

// ---------- Sincronización con el servidor (PROPUESTA v0.6.0) ----------
export type OrdersSyncState = {
  /** `sincronizado`: nada pendiente; `pendiente`: hay cambios por enviar; `sin-conexion`; `conflicto`: el servidor ganó. */
  status: 'sincronizado' | 'sincronizando' | 'pendiente' | 'sin-conexion' | 'conflicto';
  pending: number;
  report: SyncReport;
};

let syncState: OrdersSyncState = { status: 'sincronizado', pending: 0, report: emptyReport() };
const syncListeners = new Set<() => void>();
const setSync = (next: OrdersSyncState) => {
  syncState = next;
  syncListeners.forEach((l) => l());
};

let gatewayRef: OrdersGateway | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

const scheduleSync = (branchId: string, delayMs: number) => {
  if (!gatewayRef) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void runSync(branchId), delayMs);
};

/** Un ciclo de sincronización. Seguro de llamar varias veces: no se solapa. */
export const runSync = async (branchId: string): Promise<void> => {
  const gateway = gatewayRef;
  if (!gateway || running) return;
  running = true;
  const wasPending = readDirty(branchId).length;
  setSync({ ...syncState, status: 'sincronizando', pending: wasPending });
  try {
    const snapshot = parse(readRaw(branchId));
    const before = new Map(snapshot.map((o) => [o.id, JSON.stringify(o)]));
    const result = await syncOrders(branchId, snapshot, readDirty(branchId), gateway);
    // Lo que el usuario cambió MIENTRAS se sincronizaba no se pisa: se conserva, con la versión nueva, y sigue pendiente.
    const merged = new Map(result.orders.map((o) => [o.id, o]));
    const dirty = new Set(result.dirty);
    for (const now of parse(readRaw(branchId))) {
      if (before.get(now.id) === JSON.stringify(now)) continue;
      const synced = merged.get(now.id);
      merged.set(now.id, synced?.version !== undefined ? { ...now, version: synced.version } : now);
      dirty.add(now.id);
    }
    writeRaw(branchId, JSON.stringify([...merged.values()]));
    writeDirty(branchId, [...dirty]);
    result.dirty = [...dirty];
    const { report } = result;
    setSync({
      report,
      pending: result.dirty.length,
      status: report.offline ? 'sin-conexion' : report.conflicts > 0 ? 'conflicto' : result.dirty.length > 0 ? 'pendiente' : 'sincronizado',
    });
  } finally {
    running = false;
  }
};

/** Monta la sincronización de una sede mientras el componente viva (consulta cada 5 s y al recuperar la conexión). */
export const useOrdersSync = (branchId: string, gateway: OrdersGateway): OrdersSyncState => {
  useEffect(() => {
    gatewayRef = gateway;
    void runSync(branchId);
    const interval = window.setInterval(() => void runSync(branchId), 5000);
    const online = () => void runSync(branchId);
    window.addEventListener('online', online);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', online);
      if (timer) clearTimeout(timer);
      gatewayRef = null;
    };
  }, [branchId, gateway]);

  return useSyncExternalStore(
    (notify) => {
      syncListeners.add(notify);
      return () => syncListeners.delete(notify);
    },
    () => syncState,
    () => syncState,
  );
};
