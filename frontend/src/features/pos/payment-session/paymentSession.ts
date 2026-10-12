/**
 * Estado de cobro independiente del carrito.
 * No persiste archivos ni base64: las evidencias se refieren por proofId y metadatos.
 */
export type PaymentMode = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto' | 'credito';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'nequi' | 'daviplata' | 'credito';
export type PaymentAttemptStatus =
  | 'draft'
  | 'pending_evidence'
  | 'verifying'
  | 'confirmed'
  | 'unknown'
  | 'rejected'
  | 'reversed'
  | 'authorized_exception';
export type PaymentSessionState = 'editing' | 'ready' | 'submitting' | 'unknown' | 'completed' | 'abandoned';

export type PaymentEvidenceMeta = {
  submittedAt: string;
  submittedBy: string;
  attemptCount: number;
};

export type PaymentAttempt = {
  id: string;
  method: PaymentMethod;
  channelId: string | null;
  destinationId: string | null;
  amount: number;
  reference: string | null;
  status: PaymentAttemptStatus;
  proofId: string | null;
  evidence: PaymentEvidenceMeta | null;
};

export type PaymentSession = {
  version: 1;
  id: string;
  draftId: string;
  registerId: string;
  shiftId: string;
  clientOperationId: string;
  documentType: string;
  mode: PaymentMode;
  attempts: PaymentAttempt[];
  state: PaymentSessionState;
  approvalToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentSessionInput = {
  id: string;
  draftId: string;
  registerId: string;
  shiftId: string;
  clientOperationId: string;
  documentType: string;
  mode: PaymentMode;
  now: string;
};

export type AddPaymentAttemptInput = Omit<PaymentAttempt, 'reference' | 'status' | 'proofId' | 'evidence'> & {
  reference?: string | null;
};

export type AttemptUpdate = Partial<Pick<PaymentAttempt, 'proofId' | 'evidence' | 'reference'>>;

const DIGITAL_METHODS: ReadonlySet<PaymentMethod> = new Set(['tarjeta', 'transferencia', 'nequi', 'daviplata']);
const COMPLETE_DIGITAL_STATUSES: ReadonlySet<PaymentAttemptStatus> = new Set(['confirmed', 'authorized_exception']);

const updateSession = (session: PaymentSession, patch: Partial<Pick<PaymentSession, 'state'>>, now: string): PaymentSession => ({
  ...session,
  ...patch,
  updatedAt: now,
});

export const createPaymentSession = (input: CreatePaymentSessionInput): PaymentSession => ({
  version: 1,
  id: input.id,
  draftId: input.draftId,
  registerId: input.registerId,
  shiftId: input.shiftId,
  clientOperationId: input.clientOperationId,
  documentType: input.documentType,
  mode: input.mode,
  attempts: [],
  state: 'editing',
  approvalToken: null,
  createdAt: input.now,
  updatedAt: input.now,
});

export const addAttempt = (session: PaymentSession, input: AddPaymentAttemptInput): PaymentSession => ({
  ...session,
  attempts: [...session.attempts, {
    ...input,
    reference: input.reference ?? null,
    status: 'draft',
    proofId: null,
    evidence: null,
  }],
});

export const markAttempt = (
  session: PaymentSession,
  attemptId: string,
  status: PaymentAttemptStatus,
  now: string,
  update: AttemptUpdate = {},
): PaymentSession => {
  const found = session.attempts.some((attempt) => attempt.id === attemptId);
  if (!found) throw new Error(`PAYMENT_ATTEMPT_NOT_FOUND:${attemptId}`);

  return updateSession({
    ...session,
    attempts: session.attempts.map((attempt) => attempt.id === attemptId ? { ...attempt, ...update, status } : attempt),
  }, {}, now);
};

/** Una respuesta incierta jamás permite crear otra venta equivalente. */
export const markUnknown = (session: PaymentSession, now: string): PaymentSession =>
  updateSession(session, { state: 'unknown' }, now);

/** UNKNOWN conserva la misma clave para reintentar idempotentemente. */
export const retryUnknown = (session: PaymentSession, now: string): PaymentSession => {
  if (session.state !== 'unknown') throw new Error('PAYMENT_SESSION_NOT_UNKNOWN');
  return updateSession(session, { state: 'submitting' }, now);
};

export const canStartNewSale = (session: PaymentSession): boolean => session.state !== 'unknown';

export const canCompletePaymentSession = (session: PaymentSession): boolean => {
  const digitalAttempts = session.attempts.filter((attempt) => DIGITAL_METHODS.has(attempt.method));
  return digitalAttempts.length > 0 && digitalAttempts.every((attempt) => COMPLETE_DIGITAL_STATUSES.has(attempt.status));
};
