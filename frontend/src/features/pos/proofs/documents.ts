/**
 * Documento a emitir (selección, NO emisión). Tipos DIAN vigentes; las series internas ("A2", "3") son
 * configuración de la empresa, no tipos fiscales, y no se modelan aquí. La emisión real depende del backend/DIAN.
 */
export type DocumentType = 'factura-electronica' | 'documento-equivalente-pos';

export const documentOptions: { value: DocumentType; label: string; hint: string }[] = [
  { value: 'factura-electronica', label: 'Factura electrónica de venta', hint: 'Requiere cliente con datos fiscales validados.' },
  { value: 'documento-equivalente-pos', label: 'Documento equivalente electrónico POS', hint: 'Para ventas de mostrador sin factura.' },
];

const KEY = 'pos.documentType.v1';

export const loadDocumentType = (): DocumentType => {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw === 'factura-electronica' || raw === 'documento-equivalente-pos' ? raw : 'documento-equivalente-pos';
  } catch {
    return 'documento-equivalente-pos';
  }
};

export const saveDocumentType = (value: DocumentType): void => {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    /* sin almacenamiento: no se recuerda la preferencia */
  }
};
