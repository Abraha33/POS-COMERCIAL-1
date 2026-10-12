import type {
  Approval, ApprovalTicket, CustodyEntry, PaymentProof, PosOrder, ReprintRecord, Role, SaleReceipt, SyncOperationResult,
} from '@/shared/contracts';
import { setClock } from '@/shared/utils/clock';
import { createSeed, type MockDb } from './seed';

/** Reloj fijo de los mocks: los vencimientos de cartera son deterministas en tests. */
export const mockNow = (): Date => new Date('2026-10-11T15:00:00Z');

// Con mocks, el reloj de la aplicación (`shared/utils/clock`) es el reloj fijo de los mocks.
setClock(mockNow);

type RuntimeState = {
  /** Idempotency-Key -> huella del cuerpo y recibo devuelto (BR-VEN-11). */
  idempotency: Map<string, { fingerprint: string; receipt: SaleReceipt }>;
  /** Aprobaciones de supervisor emitidas (un solo uso). */
  approvals: Map<string, Approval & { used: boolean; supervisorRole: Role }>;
  /** saleId -> shiftId y efectivo neto cobrado, para anulaciones. */
  saleMeta: Map<string, { shiftId: string; cashNet: number; branchId: string }>;
  /** Capa 5 (PROPUESTA v0.6.0). */
  approvalTickets: Map<string, ApprovalTicket>;
  custody: CustodyEntry[];
  syncLedger: Map<string, SyncOperationResult>;
  orders: Map<string, PosOrder>;
  paymentProofs: Map<string, PaymentProof>;
  reprints: ReprintRecord[];
  counter: number;
};

const createState = (): RuntimeState => ({
  idempotency: new Map(),
  approvals: new Map(),
  saleMeta: new Map(),
  approvalTickets: new Map(),
  custody: [],
  syncLedger: new Map(),
  orders: new Map(),
  paymentProofs: new Map(),
  reprints: [],
  counter: 0,
});

/** Base en memoria de los mocks. Los handlers de cada feature la leen y mutan. */
export let db: MockDb = createSeed();
export let state: RuntimeState = createState();

export const resetDb = () => {
  db = createSeed();
  state = createState();
};

/** Identificador secuencial legible, p. ej. nextId('sh') -> 'sh-001'. */
export const nextId = (prefix: string): string => {
  state.counter += 1;
  return `${prefix}-${String(state.counter).padStart(3, '0')}`;
};
