import { ApiError } from '@/shared/api/client';
import {
  authorizePaymentProofException, confirmPaymentProof, createPaymentProof, getPaymentProof, getPublicPaymentProof,
  rejectPaymentProof, removePaymentProofEvidence, submitPaymentProofEvidence, submitPaymentProofForVerification,
  submitPublicPaymentProofEvidence, verifyPaymentProof,
} from '@/shared/api/paymentProofs';
import type { PaymentProof, PaymentProofPublic, PaymentProofStatus } from '@/shared/contracts';
import { getImageStore, type ImageStore } from './imageStore';
import { validateEvidenceImage, type ProofEvent, type ProofRequest, type ProofStatus, type PublicProof } from './proofs';

export type ProofCreateInput = {
  operationId: string; method: string; channelId: string; channelLabel: string;
  amount: number; destination: string; employee: string;
};

/** Acceso a las solicitudes de comprobante. El contrato decide el estado; las fotos van por ImageStore. */
export type ProofGateway = {
  create: (input: ProofCreateInput) => Promise<ProofRequest>;
  get: (id: string) => Promise<ProofRequest>;
  getPublic: (token: string) => Promise<PublicProof>;
  /** El teléfono agrega una foto por el enlace del comprobante. */
  submitPublic: (token: string, image: string) => Promise<ProofRequest>;
  /** El cajero agrega una foto desde el computador. Se pueden agregar varias (D-005). */
  submitLocal: (id: string, image: string, actor: string) => Promise<ProofRequest>;
  /** "Repetir": quita una foto antes de enviar. */
  removePhoto: (id: string, evidenceId: string, actor: string) => Promise<ProofRequest>;
  /** "Enviar": pasa la verificación al responsable de la cuenta. */
  send: (id: string, verifierId: string, actor: string) => Promise<ProofRequest>;
  verify: (id: string, actor: string) => Promise<ProofRequest>;
  confirm: (id: string, actor: string) => Promise<ProofRequest>;
  reject: (id: string, actor: string, reason: string) => Promise<ProofRequest>;
  authorizeException: (id: string, actor: string, reason: string) => Promise<ProofRequest>;
};

export class ProofGatewayError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

/** Estados del contrato → vocabulario de la vista. `exception_authorized` no equivale a `confirmado`. */
const STATUS_OF: Record<PaymentProofStatus, ProofStatus> = {
  pending_evidence: 'esperando',
  evidence_received: 'recibido',
  sent_to_verifier: 'enviado',
  verifying: 'verificando',
  confirmed: 'confirmado',
  rejected: 'rechazado',
  exception_authorized: 'excepcion',
  expired: 'vencido',
};

const toGatewayError = (error: unknown): ProofGatewayError => {
  if (error instanceof ProofGatewayError) return error;
  if (error instanceof ApiError) return new ProofGatewayError(error.code, error.message, error.status);
  return new ProofGatewayError('NETWORK', 'No hay conexión con el servidor de comprobantes.', 0);
};

/** Campos que solo existen en esta pantalla (método, bitácora, intentos). Se pierden al recargar; el servidor no los necesita. */
type LocalTrail = { method: string; createdAt: string; attempts: number; history: ProofEvent[] };

const imageFileName = (mimeType: string): string => `comprobante.${mimeType.split('/')[1] ?? 'jpg'}`;

export const createContractGateway = (images: ImageStore = getImageStore()): ProofGateway => {
  const trails = new Map<string, LocalTrail>();
  const trailOf = (id: string, method = ''): LocalTrail => {
    const existing = trails.get(id);
    if (existing) return existing;
    const created: LocalTrail = { method, createdAt: new Date().toISOString(), attempts: 0, history: [] };
    trails.set(id, created);
    return created;
  };
  const record = (id: string, by: string, status: ProofStatus, note?: string): void => {
    trailOf(id).history.push({ at: new Date().toISOString(), by, status, ...(note ? { note } : {}) });
  };

  const view = async (proof: PaymentProof): Promise<ProofRequest> => {
    const trail = trailOf(proof.id);
    // La foto pudo llegar desde el teléfono: la bitácora local debe mostrar esa recepción aunque no la hayamos hecho nosotros.
    const first = proof.evidences[0];
    if (first && !trail.history.some((event) => event.status === 'recibido')) {
      const received = { at: first.submittedAt, by: first.submittedBy, status: 'recibido' as const };
      const firstDecision = trail.history.findIndex((event) => event.status !== 'esperando');
      trail.history.splice(firstDecision === -1 ? trail.history.length : firstDecision, 0, received);
    }
    const exceptionEvent = [...trail.history].reverse().find((event) => event.status === 'excepcion');
    const stored = proof.evidences.length > 0 ? await images.list(proof.token) : {};
    const last = proof.evidences[proof.evidences.length - 1];
    return {
      id: proof.id,
      token: proof.token,
      operationId: proof.operationId,
      method: trail.method,
      channelId: proof.channelId,
      channelLabel: proof.channelLabel,
      amount: proof.amount,
      destination: proof.destination,
      employee: proof.requestedBy,
      createdAt: trail.createdAt,
      expiresAt: proof.expiresAt,
      status: STATUS_OF[proof.status],
      photos: proof.evidences.map((evidence) => ({ id: evidence.id, fileName: evidence.fileName, image: stored[evidence.id] ?? null })),
      verifierId: proof.verifierId,
      reason: proof.reason,
      receivedAt: last?.submittedAt ?? null,
      attempts: trail.attempts,
      exception: proof.status === 'exception_authorized'
        ? { authorizedBy: proof.reviewedBy ?? '', reason: proof.reason ?? '', at: exceptionEvent?.at ?? '' }
        : null,
      history: trail.history,
    };
  };

  const toPublic = (proof: PaymentProofPublic): PublicProof => ({
    channelLabel: proof.channelLabel,
    amount: proof.amount,
    destination: proof.destination,
    employee: proof.requestedBy,
    status: STATUS_OF[proof.status],
    expiresAt: proof.expiresAt,
    operationId: proof.operationId,
  });

  /** Valida la foto antes de subirla; el servidor la vuelve a validar. */
  const evidenceMeta = (image: string) => {
    const checked = validateEvidenceImage(image);
    if (!checked.ok) throw new ProofGatewayError(checked.code, checked.message, 422);
    return { fileName: imageFileName(checked.value.mimeType), mimeType: checked.value.mimeType };
  };

  /** La foto nueva es la última de la lista del servidor. */
  const storeLastPhoto = async (proof: PaymentProof, image: string): Promise<void> => {
    const added = proof.evidences[proof.evidences.length - 1];
    if (added) await images.put(proof.token, added.id, image);
  };

  const call = async <T,>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      throw toGatewayError(error);
    }
  };

  return {
    create: (input) => call(async () => {
      const proof = await createPaymentProof({
        operationId: input.operationId, channelId: input.channelId, channelLabel: input.channelLabel,
        amount: input.amount, destination: input.destination,
      });
      const trail = trailOf(proof.id, input.method);
      if (trail.history.length === 0) record(proof.id, input.employee, 'esperando');
      return view(proof);
    }),
    get: (id) => call(async () => view(await getPaymentProof(id))),
    getPublic: (token) => call(async () => toPublic(await getPublicPaymentProof(token))),
    submitPublic: (token, image) => call(async () => {
      const proof = await submitPublicPaymentProofEvidence(token, evidenceMeta(image));
      await storeLastPhoto(proof, image);
      return view(proof);
    }),
    submitLocal: (id, image, actor) => call(async () => {
      const proof = await submitPaymentProofEvidence(id, evidenceMeta(image));
      await storeLastPhoto(proof, image);
      trailOf(id).attempts += 1;
      record(id, actor, 'recibido');
      return view(proof);
    }),
    removePhoto: (id, evidenceId, actor) => call(async () => {
      const before = await getPaymentProof(id);
      const proof = await removePaymentProofEvidence(id, evidenceId);
      await images.remove(before.token, evidenceId);
      record(id, actor, STATUS_OF[proof.status], 'Foto quitada antes de enviar');
      return view(proof);
    }),
    send: (id, verifierId, actor) => call(async () => {
      const proof = await submitPaymentProofForVerification(id, { verifierId });
      record(id, actor, 'enviado', `Responsable: ${verifierId}`);
      return view(proof);
    }),
    verify: (id, actor) => call(async () => {
      const proof = await verifyPaymentProof(id);
      record(id, actor, 'verificando');
      return view(proof);
    }),
    confirm: (id, actor) => call(async () => {
      const proof = await confirmPaymentProof(id);
      record(id, actor, 'confirmado');
      return view(proof);
    }),
    reject: (id, actor, reason) => call(async () => {
      const proof = await rejectPaymentProof(id, { reason });
      record(id, actor, 'rechazado', reason);
      return view(proof);
    }),
    authorizeException: (id, actor, reason) => call(async () => {
      const proof = await authorizePaymentProofException(id, { reason });
      record(id, actor, 'excepcion', `Excepción: ${reason}`);
      return view(proof);
    }),
  };
};

let current: ProofGateway = createContractGateway();
export const getProofGateway = (): ProofGateway => current;
export const setProofGateway = (gateway: ProofGateway): void => {
  current = gateway;
};
