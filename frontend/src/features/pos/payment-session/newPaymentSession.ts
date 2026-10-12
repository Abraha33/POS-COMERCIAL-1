import { uuid } from '@/shared/utils/uuid';
import { createPaymentSession, type PaymentMode, type PaymentSession } from './paymentSession';

/**
 * Sesión de cobro nueva para una venta. La clave (`clientOperationId`) nace aquí y se conserva en todos los reintentos;
 * solo cambia cuando la venta se completa o se empieza una venta distinta.
 */
export const newPaymentSession = (input: {
  registerId: string; shiftId: string; documentType: string; mode: PaymentMode; now: string;
}): PaymentSession => createPaymentSession({
  id: uuid(),
  draftId: uuid(),
  clientOperationId: uuid(),
  ...input,
});
