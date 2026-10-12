import type { PaymentMethod } from '@/shared/contracts';

/**
 * Catálogo de canales de cobro (PROPUESTA, configurable por empresa). El formulario se deriva del TIPO de canal,
 * no del banco: agregar "Davivienda" es agregar una fila de configuración, no un formulario nuevo.
 */
export type ChannelKind = 'efectivo' | 'cuenta' | 'billetera' | 'llave' | 'qr' | 'datafono' | 'pasarela' | 'credito';

export type FieldSpec = {
  key: 'reference' | 'payer' | 'bank' | 'authCode' | 'terminal' | 'last4' | 'phone' | 'key';
  label: string;
  required: boolean;
  /** `digits` limita la entrada a números (referencias, teléfonos). */
  input: 'text' | 'digits';
};

export type PaymentChannel = {
  id: string;
  label: string;
  kind: ChannelKind;
  /** Medio del contrato vigente al que se registra el pago (el contrato aún no distingue canal). */
  method: PaymentMethod;
  fields: FieldSpec[];
  /** ¿Exige evidencia y verificación antes de cerrar la venta? */
  requiresProof: boolean;
  /** Cuentas/llaves/terminales de destino habilitadas (en producción las trae la configuración de la empresa). */
  destinations: { id: string; label: string }[];
};

const reference: FieldSpec = { key: 'reference', label: 'Número de referencia o aprobación', required: true, input: 'text' };
const payer: FieldSpec = { key: 'payer', label: 'Nombre del pagador', required: false, input: 'text' };

export const defaultChannels: PaymentChannel[] = [
  { id: 'efectivo', label: 'Efectivo', kind: 'efectivo', method: 'efectivo', fields: [], requiresProof: false, destinations: [] },
  {
    id: 'nequi', label: 'Nequi', kind: 'billetera', method: 'nequi', requiresProof: true,
    fields: [reference, { key: 'phone', label: 'Celular de origen', required: false, input: 'digits' }, payer],
    destinations: [{ id: 'nequi-1', label: 'Nequi del negocio · 300 ••• 4567' }],
  },
  {
    id: 'daviplata', label: 'DaviPlata', kind: 'billetera', method: 'daviplata', requiresProof: true,
    fields: [reference, { key: 'phone', label: 'Celular de origen', required: false, input: 'digits' }, payer],
    destinations: [{ id: 'dp-1', label: 'DaviPlata del negocio · 310 ••• 8821' }],
  },
  {
    id: 'bancolombia', label: 'Bancolombia', kind: 'cuenta', method: 'transferencia', requiresProof: true,
    fields: [reference, payer],
    destinations: [{ id: 'bc-ah', label: 'Ahorros Bancolombia ••• 1234' }],
  },
  {
    id: 'otros-bancos', label: 'Otros bancos', kind: 'cuenta', method: 'transferencia', requiresProof: true,
    fields: [reference, { key: 'bank', label: 'Banco de origen', required: true, input: 'text' }, payer],
    destinations: [{ id: 'bc-ah', label: 'Ahorros Bancolombia ••• 1234' }],
  },
  {
    id: 'bre-b', label: 'Bre-B', kind: 'llave', method: 'transferencia', requiresProof: true,
    fields: [reference, { key: 'key', label: 'Llave usada', required: false, input: 'text' }, payer],
    destinations: [{ id: 'breb-1', label: 'Llave Bre-B del negocio' }],
  },
  {
    id: 'datafono', label: 'Tarjeta / datáfono', kind: 'datafono', method: 'tarjeta', requiresProof: false,
    fields: [
      { key: 'authCode', label: 'Código de aprobación', required: true, input: 'text' },
      { key: 'last4', label: 'Últimos 4 dígitos', required: false, input: 'digits' },
      { key: 'terminal', label: 'Terminal', required: false, input: 'text' },
    ],
    destinations: [],
  },
  {
    id: 'pse', label: 'PSE / pasarela', kind: 'pasarela', method: 'transferencia', requiresProof: true,
    fields: [{ key: 'reference', label: 'Código de transacción (CUS)', required: true, input: 'text' }, payer],
    destinations: [{ id: 'pse-1', label: 'Pasarela de la empresa' }],
  },
];

export const channelById = (channels: readonly PaymentChannel[], id: string): PaymentChannel | undefined =>
  channels.find((c) => c.id === id);

/** Campos obligatorios vacíos. La referencia duplicada la valida `isDuplicateReference` con el historial local. */
export const missingFields = (channel: PaymentChannel, values: Record<string, string>): string[] =>
  channel.fields.filter((f) => f.required && (values[f.key] ?? '').trim() === '').map((f) => f.label);

export const digitsOnly = (value: string): string => value.replace(/\D+/g, '');

/** Referencias ya usadas (por canal): reutilizar una es señal de comprobante reciclado. */
export const isDuplicateReference = (used: readonly string[], reference: string): boolean => {
  const norm = reference.trim().toLowerCase();
  return norm !== '' && used.some((u) => u.trim().toLowerCase() === norm);
};
