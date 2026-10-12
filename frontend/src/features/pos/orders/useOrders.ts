import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { Order } from './orders';

/**
 * Pedidos del POS guardados en el dispositivo, por sede (PROPUESTA: no hay backend de pedidos).
 * Cualquier componente que use este hook ve los cambios al instante (y los de otras pestañas, por el evento `storage`).
 * Un fallo de escritura (cuota, modo privado) se devuelve en `saved: false`: el llamador NO debe dar la acción por hecha.
 */
const keyOf = (branchId: string) => `pos.orders.v1.${branchId}`;
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
    (fn: (current: Order[]) => Order[]): boolean => writeRaw(branchId, JSON.stringify(fn(parse(readRaw(branchId))))),
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
