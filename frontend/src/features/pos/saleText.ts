import type { PaymentMethod, Sale } from '@/shared/contracts';
import type { ApiError } from '@/shared/api/client';
import { formatMoney } from '@/shared/utils/format';

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

export type CheckoutMessage = { title: string; detail: string };

const money = (value: unknown): string | null => (typeof value === 'number' ? formatMoney(value) : null);

/**
 * Mensaje accionable (F-03/F-14) para los errores de negocio al cobrar. Nunca usa `error.code` como título:
 * dice qué pasó y qué puede hacer el cajero. Los códigos de aprobación se resuelven con el PIN, no aquí.
 */
export const describeCheckoutError = (error: ApiError): CheckoutMessage => {
  switch (error.code) {
    case 'CREDIT_LIMIT_EXCEEDED': {
      const limit = money(error.details?.creditLimit);
      const outstanding = money(error.details?.outstanding);
      const requested = money(error.details?.requested);
      const figures = [
        limit ? `Cupo: ${limit}` : null,
        outstanding ? `saldo pendiente: ${outstanding}` : null,
        requested ? `esta venta: ${requested}` : null,
      ].filter(Boolean).join(' · ');
      return {
        title: 'La venta supera el cupo de crédito del cliente',
        detail: `${figures ? `${figures}. ` : ''}Cobra una parte con otro medio de pago (Mixto), elige otro cliente o pide aumentar el cupo.`,
      };
    }
    case 'CUSTOMER_BLOCKED_OVERDUE':
      return {
        title: 'El cliente tiene facturas vencidas',
        detail: 'No se puede vender a crédito hasta que pague lo vencido. Cobra de contado o recibe el abono en Cartera.',
      };
    case 'PAYMENT_INSUFFICIENT':
      return {
        title: 'Los pagos no cubren el total',
        detail: 'Ajusta los montos para que sumen el total de la venta y vuelve a confirmar.',
      };
    case 'DISCOUNT_NOT_ALLOWED':
      return {
        title: 'El descuento supera lo que se puede autorizar',
        detail: 'Reduce el porcentaje de descuento o pide autorización al propietario.',
      };
    case 'SHIFT_NOT_OPEN':
      return {
        title: 'El turno de caja está cerrado',
        detail: 'Abre el turno desde Caja para poder vender.',
      };
    case 'FORBIDDEN':
      return { title: 'Tu rol no puede registrar ventas', detail: 'Pide a un administrador que lo haga o que revise tus permisos.' };
    case 'VALIDATION_ERROR':
      return { title: 'Revisa los datos de la venta', detail: error.message };
    default:
      return { title: 'No se pudo registrar la venta', detail: error.message };
  }
};
