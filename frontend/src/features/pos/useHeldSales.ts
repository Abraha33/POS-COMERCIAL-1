import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { uuid } from '@/shared/utils/uuid';

export type HeldLine = { productId: string; quantity: number; discount: number };
export type HeldSale = {
  id: string;
  heldAt: string;
  customerId: string | null;
  lines: HeldLine[];
};

const storageKey = (registerId: string) => `pos.held.${registerId}`;
const listeners = new Set<() => void>();
const memory = new Map<string, string>();

const readRaw = (registerId: string): string => {
  try {
    return window.localStorage.getItem(storageKey(registerId)) ?? memory.get(registerId) ?? '[]';
  } catch {
    return memory.get(registerId) ?? '[]';
  }
};

const writeRaw = (registerId: string, raw: string) => {
  memory.set(registerId, raw);
  try {
    window.localStorage.setItem(storageKey(registerId), raw);
  } catch {
    /* sin almacenamiento: las suspendidas viven solo en memoria durante la sesión */
  }
  listeners.forEach((l) => l());
};

const parse = (raw: string): HeldSale[] => {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as HeldSale[]) : [];
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

/**
 * Ventas suspendidas (PROPUESTA, docs/business-rules/06-suspendidas.md): son carritos locales por caja.
 * No reservan stock ni mueven caja; el servidor no las conoce hasta que se cobran.
 * El estado es compartido: la barra de navegación y la venta rápida ven el mismo contador.
 */
export const useHeldSales = (registerId: string) => {
  const raw = useSyncExternalStore(subscribe, () => readRaw(registerId), () => '[]');
  const held = useMemo(() => parse(raw), [raw]);

  const hold = useCallback(
    (lines: HeldLine[], customerId: string | null) =>
      writeRaw(
        registerId,
        JSON.stringify([...parse(readRaw(registerId)), { id: uuid(), heldAt: new Date().toISOString(), customerId, lines }]),
      ),
    [registerId],
  );

  const remove = useCallback(
    (id: string) => writeRaw(registerId, JSON.stringify(parse(readRaw(registerId)).filter((sale) => sale.id !== id))),
    [registerId],
  );

  return { held, hold, remove };
};
