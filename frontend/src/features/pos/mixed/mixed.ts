import { canCloseSale, type ProofRequest } from '../proofs/proofs';
import { missingFields, type PaymentChannel } from '../proofs/channels';
import type { ChannelState } from '../proofs/ChannelSection';

/**
 * Pago mixto como componentes independientes (PROPUESTA): cada uno tiene su canal, monto, campos, comprobante y estado.
 * Un componente confirmado no se borra en silencio: se reversa con motivo y queda a la vista.
 */
export type MixedComponent = {
  id: string;
  state: ChannelState;
  amount: number;
  reversed: { by: string; reason: string; at: string } | null;
};

export type ComponentStatus = 'recibido' | 'por-verificar' | 'confirmado' | 'sujeto-a-autorizacion';

export const componentStatusLabel: Record<ComponentStatus, string> = {
  recibido: 'Recibido',
  'por-verificar': 'Por verificar',
  confirmado: 'Confirmado',
  'sujeto-a-autorizacion': 'Sujeto a autorización',
};

export const componentStatus = (
  channel: PaymentChannel,
  values: Record<string, string>,
  proof: ProofRequest | null,
): ComponentStatus => {
  if (channel.kind === 'credito') return 'sujeto-a-autorizacion';
  if (!channel.requiresProof) return missingFields(channel, values).length === 0 ? 'recibido' : 'por-verificar';
  if (proof?.status === 'confirmado') return 'confirmado';
  if (proof?.exception) return 'sujeto-a-autorizacion';
  return 'por-verificar';
};

/** ¿Puede cerrar la venta? Efectivo/datáfono con campos completos; digital con pago confirmado o excepción. */
export const componentReady = (
  channel: PaymentChannel,
  values: Record<string, string>,
  proof: ProofRequest | null,
  duplicate: boolean,
): boolean => {
  if (missingFields(channel, values).length > 0) return false;
  if (duplicate && proof?.exception == null) return false;
  if (channel.requiresProof) return canCloseSale(proof);
  return true;
};

export const reverseComponent = (
  c: MixedComponent, by: string, reason: string, now: Date,
): { ok: true; value: MixedComponent } | { ok: false; message: string } => {
  if (c.reversed) return { ok: false, message: 'El componente ya fue reversado.' };
  if (by.trim() === '') return { ok: false, message: 'Falta quién reversa.' };
  if (reason.trim().length < 3) return { ok: false, message: 'Escribe el motivo de la reversa.' };
  return { ok: true, value: { ...c, reversed: { by, reason: reason.trim(), at: now.toISOString() } } };
};
