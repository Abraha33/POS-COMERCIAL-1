import type { Payment, PaymentMethod, Product } from '@/shared/contracts';

export type CartLine = { productId: string; quantity: number; discount: number };

/** Modo de pago elegido en el panel (el contrato solo conoce `PaymentMethod`; "mixto" son varias filas). */
export type PayMode = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto' | 'credito';
/** Canales digitales que se agrupan bajo "Transferencia" en el selector. */
export type DigitalChannel = Extract<PaymentMethod, 'transferencia' | 'nequi' | 'daviplata'>;

export const payModeOptions: { value: PayMode; label: string; icon: string }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: 'pi pi-money-bill' },
  { value: 'tarjeta', label: 'Tarjeta', icon: 'pi pi-credit-card' },
  { value: 'transferencia', label: 'Transferencia', icon: 'pi pi-arrow-right-arrow-left' },
  { value: 'mixto', label: 'Mixto', icon: 'pi pi-clone' },
  { value: 'credito', label: 'Crédito', icon: 'pi pi-book' },
];

export const allMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'credito', label: 'Crédito' },
];

export const digitalChannels: { value: DigitalChannel; label: string }[] = [
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
];

/** Estimación del IVA incluido en el precio (BR-PRO-03 / BR-VEN-03). El servidor es la autoridad (BR-GEN-06). */
export const estimateIncludedVat = (
  lines: readonly { product: Product; quantity: number; discount: number }[],
): number =>
  Math.round(
    lines.reduce((sum, { product, quantity, discount }) => {
      const net = product.price * quantity - discount;
      return sum + (net - net / (1 + product.taxRate));
    }, 0),
  );

/** Importes sugeridos de efectivo recibido: el total y los redondeos hacia arriba más comunes (billetes). */
export const suggestCashAmounts = (total: number): number[] => {
  if (total <= 0) return [];
  const steps = [1000, 5000, 10000, 20000, 50000, 100000];
  const values = new Set<number>([total]);
  for (const step of steps) values.add(Math.ceil(total / step) * step);
  return [...values].sort((a, b) => a - b).slice(0, 4);
};

export const paymentsTotal = (payments: readonly Payment[]): number => payments.reduce((sum, p) => sum + p.amount, 0);
