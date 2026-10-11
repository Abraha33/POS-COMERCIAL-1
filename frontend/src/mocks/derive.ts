import type {
  Customer, CustomerRecord, Payable, PayableRecord, Receivable, ReceivableRecord,
} from '@/shared/contracts';
import { today } from '@/shared/utils/clock';
import { db } from './db';

/** BR-CLI-06: 3 días de gracia sobre el vencimiento (solo cuentas por cobrar). */
export const GRACE_DAYS = 3;

const DAY_MS = 86_400_000;
const toUtc = (iso: string): number => {
  const [y = 0, m = 1, d = 1] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Días transcurridos desde el vencimiento (negativo si aún no vence). */
export const daysBetween = (from: string, to: string): number => Math.round((toUtc(to) - toUtc(from)) / DAY_MS);

const derive = (record: { amount: number; paid: number; due: string }, grace: number, asOf: string) => {
  const balance = Math.max(0, record.amount - record.paid);
  const late = daysBetween(record.due, asOf);
  const daysOverdue = balance > 0 ? Math.max(0, late) : 0;
  let status: Receivable['status'] = 'vigente';
  if (balance === 0) status = 'pagada';
  else if (daysOverdue > grace) status = 'vencida';
  else if (daysOverdue > 0) status = 'en_gracia';
  return { balance, status, daysOverdue };
};

/** El servidor es la autoridad de saldo, estado y mora (v0.5.0); los mocks los calculan con el reloj de la app. */
export const toReceivable = (r: ReceivableRecord, asOf: string = today()): Receivable => ({
  ...r, ...derive(r, GRACE_DAYS, asOf),
});

export const toPayable = (p: PayableRecord, asOf: string = today()): Payable => ({
  ...p, ...derive(p, 0, asOf),
});

export const toCustomer = (c: CustomerRecord, asOf: string = today()): Customer => {
  const own = db.receivables.filter((r) => r.customerId === c.id).map((r) => toReceivable(r, asOf));
  return {
    ...c,
    outstandingBalance: own.reduce((sum, r) => sum + r.balance, 0),
    overdueBalance: own.filter((r) => r.status === 'vencida').reduce((sum, r) => sum + r.balance, 0),
  };
};
