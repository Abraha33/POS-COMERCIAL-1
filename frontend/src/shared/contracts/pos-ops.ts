import { z } from 'zod';
import { approvalActionSchema } from './auth';
import { money } from './common';

/**
 * Capa 5 (PROPUESTA v0.6.0): turnos con relevo, autorizaciones, sincronización idempotente y pedidos del POS.
 * Espejo de `components.schemas` en contracts/openapi.yaml; la igualdad la verifica `tests/contract-types.ts`.
 */

// ---------- Turnos: relevo ----------
export const shiftHandoverRequestSchema = z.object({
  toEmployeeId: z.string(),
  countedCash: money,
  note: z.string().optional(),
  /** PROPUESTA v0.7.0: `approvalToken` de la acción `shift_handover`; obligatorio si hay diferencia. */
  approvalToken: z.string().optional(),
});
export type ShiftHandoverRequest = z.infer<typeof shiftHandoverRequestSchema>;

export const custodyEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  fromId: z.string(),
  toId: z.string(),
  expectedCash: money,
  countedCash: money,
  difference: z.number().int(),
  note: z.string().optional(),
  /** Token de aprobación consumido por el relevo (si hubo diferencia). */
  approvalId: z.string().nullable().optional(),
});
export type CustodyEntry = z.infer<typeof custodyEntrySchema>;

// ---------- Aprobaciones: modo `request` del mecanismo único (PROPUESTA v0.7.0) ----------
export const approvalTicketStatusSchema = z.enum(['pending', 'approved', 'rejected', 'expired', 'cancelled', 'executed']);
export type ApprovalTicketStatus = z.infer<typeof approvalTicketStatusSchema>;

export const approvalTicketCreateSchema = z.object({
  action: approvalActionSchema,
  resource: z.object({ kind: z.string(), id: z.string() }),
  amount: money,
  reason: z.string().min(3),
  fingerprint: z.string(),
});
export type ApprovalTicketCreate = z.infer<typeof approvalTicketCreateSchema>;

export const approvalTicketSchema = approvalTicketCreateSchema.extend({
  id: z.string(),
  status: approvalTicketStatusSchema,
  requesterId: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  decidedById: z.string().nullable().optional(),
  decidedAt: z.string().nullable().optional(),
  decisionNote: z.string().optional(),
  validUntil: z.string().nullable().optional(),
  executedAt: z.string().nullable().optional(),
  /** Presente solo cuando está aprobada y aún no se ejecutó; se usa como el token del modo `pin`. */
  approvalToken: z.string().optional(),
});
export type ApprovalTicket = z.infer<typeof approvalTicketSchema>;

export const approvalTicketDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().optional(),
});
export type ApprovalTicketDecision = z.infer<typeof approvalTicketDecisionSchema>;

// ---------- Sincronización ----------
export const syncOperationSchema = z.object({
  idempotencyKey: z.string(),
  kind: z.string(),
  shiftId: z.string(),
  createdAt: z.string(),
  payload: z.record(z.string(), z.union([z.string(), z.number()])),
  dependsOn: z.array(z.string()).optional(),
});
export type SyncOperation = z.infer<typeof syncOperationSchema>;

export const syncBatchSchema = z.object({
  deviceId: z.string(),
  operations: z.array(syncOperationSchema).min(1),
});
export type SyncBatch = z.infer<typeof syncBatchSchema>;

export const syncOperationResultSchema = z.object({
  idempotencyKey: z.string(),
  status: z.enum(['confirmada', 'rechazada', 'revision', 'reintentable']),
  remoteRef: z.string().nullable().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
});
export type SyncOperationResult = z.infer<typeof syncOperationResultSchema>;

export const syncBatchResultSchema = z.object({ results: z.array(syncOperationResultSchema) });
export type SyncBatchResult = z.infer<typeof syncBatchResultSchema>;

// ---------- Pedidos ----------
export const posOrderStatusSchema = z.enum(['pendiente', 'en-proceso', 'problema', 'listo', 'despachado', 'entregado', 'cancelado']);
export type PosOrderStatus = z.infer<typeof posOrderStatusSchema>;

export const posOrderLineSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: money,
  packed: z.number().nonnegative(),
  missing: z.number().nonnegative(),
  missingNote: z.string().optional(),
  name: z.string().optional(),
  sku: z.string().optional(),
});
export type PosOrderLine = z.infer<typeof posOrderLineSchema>;

export const posOrderCreateSchema = z.object({
  customerId: z.string().nullable(),
  fulfillment: z.enum(['domicilio', 'recogida', 'acordada']),
  address: z.string().optional(),
  scheduledFor: z.string().optional(),
  slot: z.enum(['manana', 'tarde', 'noche']).optional(),
  shippingCost: money.optional(),
  notes: z.string().optional(),
  saleId: z.string().nullable().optional(),
  lines: z.array(posOrderLineSchema).min(1),
});
export type PosOrderCreate = z.infer<typeof posOrderCreateSchema>;

export const posOrderSchema = posOrderCreateSchema.extend({
  id: z.string(),
  number: z.string(),
  status: posOrderStatusSchema,
  total: money,
  paymentState: z.enum(['sin-pago', 'abono', 'pagado', 'credito']),
  paidAmount: money,
  qualityChecked: z.boolean().optional(),
  branchId: z.string().optional(),
  version: z.number().int().nonnegative().optional(),
  customerName: z.string().optional(),
  createdAt: z.string().optional(),
  createdById: z.string().optional(),
  createdByName: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  assigneeName: z.string().optional(),
  priority: z.enum(['normal', 'alta']).optional(),
  history: z
    .array(z.object({ at: z.string(), actorId: z.string(), actorName: z.string(), event: z.string(), detail: z.string().optional() }))
    .optional(),
});
export type PosOrder = z.infer<typeof posOrderSchema>;

export const savePosOrderRequestSchema = z.object({
  order: posOrderSchema,
  expectedVersion: z.number().int().nonnegative(),
});
export type SavePosOrderRequest = z.infer<typeof savePosOrderRequestSchema>;

export const posOrderTransitionSchema = z.object({
  action: z.enum([
    'tomar', 'empacar', 'reportar-faltante', 'resolver-faltante', 'verificar', 'registrar-pago', 'despachar', 'entregar',
    'cancelar',
  ]),
  reason: z.string().optional(),
  amount: money.optional(),
});
export type PosOrderTransition = z.infer<typeof posOrderTransitionSchema>;
