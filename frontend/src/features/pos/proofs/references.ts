const KEY = 'pos.paymentReferences.v1';
const MAX = 500;

/** Referencias de pago ya usadas en este dispositivo (señal de comprobante reciclado; el servidor debe validar de verdad). */
export const loadReferences = (): string[] => {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

export const rememberReference = (reference: string): string[] => {
  const value = reference.trim();
  const next = value === '' ? loadReferences() : [...loadReferences(), value].slice(-MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sin almacenamiento */
  }
  return next;
};
