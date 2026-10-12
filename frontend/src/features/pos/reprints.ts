const KEY = 'pos.reprints.v1';

const read = (): Record<string, number> => {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    return raw && typeof raw === 'object' ? (raw as Record<string, number>) : {};
  } catch {
    return {};
  }
};

export const reprintCount = (saleNumber: string): number => read()[saleNumber] ?? 0;

/** Reimprimir es una copia del mismo documento: cuenta copias, no crea venta, ni stock, ni caja. */
export const registerReprint = (saleNumber: string): number => {
  const next = { ...read(), [saleNumber]: reprintCount(saleNumber) + 1 };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sin almacenamiento: la copia se imprime igual */
  }
  return next[saleNumber] ?? 1;
};
