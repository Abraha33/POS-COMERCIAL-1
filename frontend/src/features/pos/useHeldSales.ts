import { useCallback, useState } from 'react';
import { uuid } from '@/shared/utils/uuid';

export type HeldLine = { productId: string; quantity: number; discount: number };
export type HeldSale = {
  id: string;
  heldAt: string;
  customerId: string | null;
  lines: HeldLine[];
};

const storageKey = (registerId: string) => `pos.held.${registerId}`;

const read = (registerId: string): HeldSale[] => {
  try {
    const raw = window.localStorage.getItem(storageKey(registerId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HeldSale[]) : [];
  } catch {
    return [];
  }
};

const write = (registerId: string, sales: HeldSale[]) => {
  try {
    window.localStorage.setItem(storageKey(registerId), JSON.stringify(sales));
  } catch {
    /* sin almacenamiento: las suspendidas viven solo en memoria durante la sesión */
  }
};

/**
 * Ventas suspendidas (PROPUESTA, docs/business-rules/06-suspendidas.md): son carritos locales por caja.
 * No reservan stock ni mueven caja; el servidor no las conoce hasta que se cobran.
 */
export const useHeldSales = (registerId: string) => {
  const [held, setHeld] = useState<HeldSale[]>(() => read(registerId));

  const persist = useCallback(
    (next: HeldSale[]) => {
      setHeld(next);
      write(registerId, next);
    },
    [registerId],
  );

  const hold = useCallback(
    (lines: HeldLine[], customerId: string | null) =>
      persist([...held, { id: uuid(), heldAt: new Date().toISOString(), customerId, lines }]),
    [held, persist],
  );

  const remove = useCallback((id: string) => persist(held.filter((sale) => sale.id !== id)), [held, persist]);

  return { held, hold, remove };
};
