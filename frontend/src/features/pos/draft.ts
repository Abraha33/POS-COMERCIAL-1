import type { CartLine } from './cart';

/**
 * Borrador de la venta en curso por caja. Vive en sessionStorage: sobrevive a cambiar de módulo dentro de la
 * pestaña, sin datos de pago ni credenciales. Al cobrar o vaciar, se guarda vacío.
 */
export type SaleDraft = { lines: CartLine[]; customerId: string | null };

const EMPTY: SaleDraft = { lines: [], customerId: null };
const keyOf = (registerId: string) => `pos.draft.${registerId}`;

const isLine = (value: unknown): value is CartLine =>
  typeof value === 'object' && value !== null &&
  typeof (value as CartLine).productId === 'string' &&
  typeof (value as CartLine).quantity === 'number' &&
  typeof (value as CartLine).discount === 'number';

export const loadDraft = (registerId: string): SaleDraft => {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(keyOf(registerId)) ?? 'null');
    if (typeof value !== 'object' || value === null) return EMPTY;
    const { lines, customerId } = value as Partial<SaleDraft>;
    return {
      lines: Array.isArray(lines) ? lines.filter(isLine) : [],
      customerId: typeof customerId === 'string' ? customerId : null,
    };
  } catch {
    return EMPTY;
  }
};

export const saveDraft = (registerId: string, draft: SaleDraft): void => {
  try {
    window.sessionStorage.setItem(keyOf(registerId), JSON.stringify(draft));
  } catch {
    /* sin almacenamiento: el borrador vive solo mientras la pantalla esté montada */
  }
};
