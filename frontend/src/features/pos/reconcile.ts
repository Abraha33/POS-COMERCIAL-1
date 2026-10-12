import type { Sale } from '@/shared/contracts';
import { methodLabels } from './saleText';

/** Canal del CountryPack: solo necesitamos su id y su nombre legible. */
export type ChannelLabel = { id: string; label: string };

/**
 * Conciliación de cobros no efectivos del turno (PROPUESTA). "Reportado" = lo que las ventas dicen que entró;
 * "recibido" lo digita una persona mirando el extracto o la billetera. No hay conexión bancaria.
 */
export type ReconRow = {
  key: string;
  label: string;
  destination: string;
  count: number;
  reported: number;
  /** Parte del reportado respaldada por un comprobante confirmado (`proofId`) o un código de aprobación de datáfono. */
  verified: number;
  withoutProof: number;
};

export type ReconStatus = 'sin-registro' | 'conciliado' | 'falta' | 'sobrante';

export type ReconSummary = {
  rows: ReconRow[];
  cash: number;
  bank: number;
  credit: number;
};

/** `channels` viene del CountryPack de la empresa; sin canal conocido se muestra el nombre del medio. */
export const summarize = (sales: readonly Sale[], shiftId: string, channels: readonly ChannelLabel[]): ReconSummary => {
  const rows = new Map<string, ReconRow>();
  let cash = 0;
  let bank = 0;
  let credit = 0;
  for (const sale of sales) {
    if (sale.status === 'anulada' || sale.shiftId !== shiftId) continue;
    for (const p of sale.payments) {
      if (p.method === 'efectivo') {
        cash += p.amount;
        continue;
      }
      if (p.method === 'credito') {
        credit += p.amount;
        continue;
      }
      bank += p.amount;
      const channel = p.channel ?? p.method;
      const destination = p.destination ?? '—';
      const key = `${channel}|${destination}`;
      const label = channels.find((c) => c.id === channel)?.label ?? methodLabels[p.method];
      const row = rows.get(key) ?? { key, label, destination, count: 0, reported: 0, verified: 0, withoutProof: 0 };
      row.count += 1;
      row.reported += p.amount;
      // Datáfono: el código de aprobación de la terminal es el respaldo; digitales: el comprobante confirmado.
      const backed = Boolean(p.proofId) || (channel === 'datafono' && Boolean(p.reference));
      if (backed) row.verified += p.amount;
      else row.withoutProof += p.amount;
      rows.set(key, row);
    }
  }
  return { rows: [...rows.values()].sort((a, b) => a.label.localeCompare(b.label)), cash, bank, credit };
};

export const reconStatus = (row: ReconRow, received: number | undefined): ReconStatus => {
  if (received === undefined) return 'sin-registro';
  if (received === row.reported) return 'conciliado';
  return received < row.reported ? 'falta' : 'sobrante';
};

export const reconLabels: Record<ReconStatus, string> = {
  'sin-registro': 'Sin recibido registrado',
  conciliado: 'Conciliado',
  falta: 'Falta ingreso',
  sobrante: 'Sobrante',
};
