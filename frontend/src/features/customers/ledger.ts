import type { Receivable } from '@/shared/contracts';

/**
 * Fecha de referencia de cartera. SUP: mientras responde MSW (reloj fijo `mockNow`) se usa una constante;
 * con backend real la fecha la fija el servidor (la mora la calcula el servidor, que es la autoridad).
 */
export const LEDGER_REFERENCE_DATE = '2026-10-11';
/** BR-CLI-06: 3 días de gracia sobre el vencimiento. */
export const GRACE_DAYS = 3;
/** BR-CLI-01: documento del consumidor final (no es un cliente identificado). */
export const COUNTER_CUSTOMER_TAX_ID = '222222222222';

const DAY_MS = 86_400_000;
const toUtc = (iso: string): number => {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Días transcurridos desde el vencimiento (negativo si aún no vence). */
export const daysPastDue = (due: string, today: string = LEDGER_REFERENCE_DATE): number =>
  Math.round((toUtc(today) - toUtc(due)) / DAY_MS);

export type ReceivableStatus = 'pagada' | 'vigente' | 'en-gracia' | 'vencida';

export const balanceOf = (r: Pick<Receivable, 'amount' | 'paid'>): number => r.amount - r.paid;

export const receivableStatus = (r: Receivable, today: string = LEDGER_REFERENCE_DATE): ReceivableStatus => {
  if (balanceOf(r) <= 0) return 'pagada';
  const late = daysPastDue(r.due, today);
  if (late <= 0) return 'vigente';
  return late <= GRACE_DAYS ? 'en-gracia' : 'vencida';
};

export const statusLabels: Record<ReceivableStatus, string> = {
  pagada: 'Pagada', vigente: 'Vigente', 'en-gracia': 'En gracia', vencida: 'Vencida',
};

export type CustomerAccount = { balance: number; overdue: number; overdueCount: number; openCount: number };

/** Saldo pendiente y mora (facturas vencidas fuera del periodo de gracia) de un conjunto de facturas del cliente. */
export const accountOf = (rows: Receivable[], today: string = LEDGER_REFERENCE_DATE): CustomerAccount => {
  const open = rows.filter((r) => balanceOf(r) > 0);
  const late = open.filter((r) => receivableStatus(r, today) === 'vencida');
  return {
    balance: open.reduce((sum, r) => sum + balanceOf(r), 0),
    overdue: late.reduce((sum, r) => sum + balanceOf(r), 0),
    overdueCount: late.length,
    openCount: open.length,
  };
};
