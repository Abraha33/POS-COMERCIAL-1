import type { PaymentMethod, Sale } from '@/shared/contracts';
import type { ApiError } from '@/shared/api/client';

export const methodLabels: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  transferencia: 'Transferencia',
  credito: 'Crédito',
};

export const statusLabels: Record<Sale['status'], string> = {
  pagada: 'Pagada',
  credito: 'A crédito',
  anulada: 'Anulada',
};

/** `2026-10-01` -> `01/10/2026` sin pasar por Date (evita el corrimiento por zona horaria). */
export const formatSaleDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
};

export const paymentSummary = (sale: Sale): string =>
  [...new Set(sale.payments.map((p) => methodLabels[p.method]))].join(' + ');

type Operation = 'return' | 'void';

const numberDetail = (value: unknown): number | null => (typeof value === 'number' ? value : null);

/** Mensaje accionable para los errores del contrato de devolución/anulación (BR-DEV-01/02, BR-VEN-10). */
export const describeSaleError = (
  error: ApiError,
  operation: Operation,
  productName?: (productId: string) => string,
): string => {
  switch (error.code) {
    case 'RETURN_EXCEEDS_SOLD': {
      const id = typeof error.details?.productId === 'string' ? error.details.productId : null;
      const available = numberDetail(error.details?.available);
      const name = id && productName ? productName(id) : null;
      const what = name ? ` de «${name}»` : '';
      return available === null
        ? `La devolución supera lo vendido${what}.`
        : `La devolución supera lo vendido${what}: solo quedan ${available} por devolver.`;
    }
    case 'SALE_ALREADY_VOIDED':
      return 'La venta ya está anulada: no admite devoluciones ni una nueva anulación.';
    case 'FORBIDDEN':
      return operation === 'void'
        ? 'No puedes anular esta venta: solo administrador o propietario, o el cajero mientras el turno de la venta siga abierto.'
        : 'Tu rol no puede registrar devoluciones.';
    default:
      return error.message;
  }
};
