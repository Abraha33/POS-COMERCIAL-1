import type { Payable } from '@/shared/contracts';
import { today as clockToday } from '@/shared/utils/clock';

/** PROPUESTA: un pago se destaca como "próximo" si vence en los siguientes 7 días. */
export const SOON_DAYS = 7;

const DAY_MS = 86_400_000;
const toUtc = (iso: string): number => {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const toIso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Días hasta el vencimiento (negativo si ya venció). */
export const daysUntilDue = (due: string, today: string = clockToday()): number =>
  Math.round((toUtc(due) - toUtc(today)) / DAY_MS);

export const balanceOf = (p: Pick<Payable, 'amount' | 'paid'>): number => p.amount - p.paid;

export type PayableStatus = 'pagada' | 'vigente' | 'proxima' | 'vencida';

/** El periodo de gracia (BR-CLI-06) es de clientes; en pagos a proveedores vencida = pasó la fecha. */
type PayableAmounts = Partial<Payable> & Pick<Payable, 'amount' | 'paid' | 'due'>;

export const payableStatus = (p: PayableAmounts, today: string = clockToday()): PayableStatus => {
  if (balanceOf(p) <= 0) return 'pagada';
  const left = daysUntilDue(p.due, today);
  if (left < 0) return 'vencida';
  return left <= SOON_DAYS ? 'proxima' : 'vigente';
};

export const statusLabels: Record<PayableStatus, string> = {
  pagada: 'Pagada', vigente: 'Vigente', proxima: 'Vence pronto', vencida: 'Vencida',
};

/** Lunes de la semana (ISO) de una fecha `YYYY-MM-DD`. */
export const weekStart = (iso: string): string => {
  const ms = toUtc(iso);
  const dow = (new Date(ms).getUTCDay() + 6) % 7; // lunes = 0
  return toIso(ms - dow * DAY_MS);
};

export const weekEnd = (start: string): string => toIso(toUtc(start) + 6 * DAY_MS);

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const shortDate = (iso: string): string => {
  const [, m = '1', d = '1'] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''}`;
};

export type PayableTotals = { balance: number; overdue: number; dueSoon: number; openCount: number };

export const totalsOf = (rows: PayableAmounts[], today: string = clockToday()): PayableTotals => {
  const open = rows.filter((p) => balanceOf(p) > 0);
  const sum = (list: PayableAmounts[]) => list.reduce((acc, p) => acc + balanceOf(p), 0);
  return {
    balance: sum(open),
    overdue: sum(open.filter((p) => payableStatus(p, today) === 'vencida')),
    dueSoon: sum(open.filter((p) => payableStatus(p, today) === 'proxima')),
    openCount: open.length,
  };
};
