import type { PosOrder } from '@/shared/contracts';
import type { Order } from './orders';

/**
 * Sincronización offline-first de pedidos con el servidor (PROPUESTA v0.6.0). El dispositivo sigue siendo la fuente
 * mientras no hay conexión; al volver, cada pedido modificado se envía con su `version` (concurrencia optimista).
 * Funciones puras + un gateway inyectable: se prueban sin red.
 */
export type OrdersGateway = {
  list: (branchId: string) => Promise<PosOrder[]>;
  save: (order: PosOrder, expectedVersion: number) => Promise<PosOrder>;
};

export type SyncReport = { pushed: number; pulled: number; conflicts: number; failed: number; offline: boolean };

export const emptyReport = (): SyncReport => ({ pushed: 0, pulled: 0, conflicts: 0, failed: 0, offline: false });

export const toWire = (o: Order, branchId: string): PosOrder => ({
  id: o.id,
  number: o.number,
  status: o.status,
  total: o.total,
  paymentState: o.paymentState,
  paidAmount: o.paidAmount,
  customerId: o.customerId,
  customerName: o.customerName,
  fulfillment: o.fulfillment,
  address: o.address,
  scheduledFor: o.scheduledFor,
  slot: o.slot,
  shippingCost: o.shippingCost,
  notes: o.notes,
  saleId: o.saleId,
  qualityChecked: o.qualityChecked,
  branchId,
  ...(o.version !== undefined ? { version: o.version } : {}),
  createdAt: o.createdAt,
  createdById: o.createdById,
  createdByName: o.createdByName,
  assigneeId: o.assigneeId,
  assigneeName: o.assigneeName,
  priority: o.priority,
  history: o.history.map((h) => ({ at: h.at, actorId: h.actorId, actorName: h.actorName, event: h.event, detail: h.detail })),
  lines: o.lines.map((l) => ({
    productId: l.productId, name: l.name, sku: l.sku, quantity: l.quantity, unitPrice: l.unitPrice,
    packed: l.packed, missing: l.missing, missingNote: l.missingNote,
  })),
});

/** Reconstruye el pedido del dominio. Lo que el servidor no trae (pedidos creados por otro cliente) toma un valor neutro. */
export const fromWire = (w: PosOrder): Order => ({
  id: w.id,
  number: w.number,
  createdAt: w.createdAt ?? new Date(0).toISOString(),
  createdById: w.createdById ?? '',
  createdByName: w.createdByName ?? '',
  customerId: w.customerId,
  customerName: w.customerName ?? '',
  fulfillment: w.fulfillment,
  address: w.address ?? '',
  scheduledFor: w.scheduledFor ?? '',
  slot: w.slot ?? 'manana',
  assigneeId: w.assigneeId ?? null,
  assigneeName: w.assigneeName ?? '',
  shippingCost: w.shippingCost ?? 0,
  notes: w.notes ?? '',
  priority: w.priority ?? 'normal',
  lines: w.lines.map((l) => ({
    productId: l.productId, name: l.name ?? l.productId, sku: l.sku ?? '', quantity: l.quantity, unitPrice: l.unitPrice,
    packed: l.packed, missing: l.missing, missingNote: l.missingNote ?? '',
  })),
  total: w.total,
  paymentState: w.paymentState,
  paidAmount: w.paidAmount,
  saleId: w.saleId ?? null,
  status: w.status,
  qualityChecked: w.qualityChecked ?? false,
  history: (w.history ?? []).map((h) => ({ at: h.at, actorId: h.actorId, actorName: h.actorName, event: h.event, detail: h.detail ?? '' })),
  ...(w.version !== undefined ? { version: w.version } : {}),
});

const codeOf = (e: unknown): string | null =>
  typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'string'
    ? (e as { code: string }).code
    : null;

/**
 * Un ciclo: sube lo modificado y baja lo nuevo. Servidor gana en conflicto (el pedido local se reemplaza y se cuenta).
 * Sin conexión (error que no es de la API) todo queda pendiente.
 */
export const syncOrders = async (
  branchId: string,
  local: Order[],
  dirty: string[],
  gateway: OrdersGateway,
): Promise<{ orders: Order[]; dirty: string[]; report: SyncReport }> => {
  const report = emptyReport();
  let server: PosOrder[];
  try {
    server = await gateway.list(branchId);
  } catch (e) {
    report.offline = codeOf(e) === null || codeOf(e) === 'HTTP_ERROR';
    report.failed = dirty.length;
    return { orders: local, dirty, report };
  }

  const byId = new Map(local.map((o) => [o.id, o]));
  const stillDirty: string[] = [];

  for (const id of dirty) {
    const mine = byId.get(id);
    if (!mine) continue;
    try {
      const saved = await gateway.save(toWire(mine, branchId), mine.version ?? 0);
      byId.set(id, fromWire(saved));
      report.pushed += 1;
    } catch (e) {
      const code = codeOf(e);
      if (code === 'VERSION_CONFLICT' || code === 'ESTADO_INVALIDO') {
        report.conflicts += 1;
        const theirs = server.find((s) => s.id === id);
        if (theirs) byId.set(id, fromWire(theirs));
        else byId.delete(id);
      } else {
        report.failed += 1;
        report.offline = code === null || code === 'HTTP_ERROR';
        stillDirty.push(id);
      }
    }
  }

  const pending = new Set(stillDirty);
  for (const s of server) {
    const mine = byId.get(s.id);
    if (!mine) {
      byId.set(s.id, fromWire(s));
      report.pulled += 1;
    } else if (!pending.has(s.id) && (s.version ?? 0) > (mine.version ?? 0)) {
      byId.set(s.id, fromWire(s));
      report.pulled += 1;
    }
  }
  return { orders: [...byId.values()], dirty: stillDirty, report };
};
