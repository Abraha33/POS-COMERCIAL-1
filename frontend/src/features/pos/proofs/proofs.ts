/**
 * Captura móvil de comprobantes vinculada al cobro (PROPUESTA).
 * Una foto es EVIDENCIA, no confirmación: el pago solo queda confirmado por una decisión humana trazable
 * (o una excepción autorizada). Funciones puras; el tiempo y los actores entran por parámetro.
 */
export type ProofStatus = 'esperando' | 'recibido' | 'verificando' | 'confirmado' | 'rechazado';

export const proofStatusLabel: Record<ProofStatus, string> = {
  esperando: 'Esperando comprobante',
  recibido: 'Comprobante recibido',
  verificando: 'Verificando',
  confirmado: 'Pago confirmado',
  rechazado: 'Rechazado / No coincide',
};

export type ProofEvent = { at: string; by: string; status: ProofStatus; note?: string };

export type ProofRequest = {
  id: string;
  /** Token de un solo propósito para el teléfono; no da acceso a nada más que a esta solicitud. */
  token: string;
  /** Operación de venta a la que pertenece (clientOperationId): evita adjuntar la foto a otra venta. */
  operationId: string;
  method: string;
  channelId: string;
  channelLabel: string;
  amount: number;
  destination: string;
  employee: string;
  createdAt: string;
  expiresAt: string;
  status: ProofStatus;
  /** Evidencia (data URL JPEG/PNG). Se envía al servidor solo en la decisión del cajero, no al teléfono. */
  image: string | null;
  receivedAt: string | null;
  attempts: number;
  /** Excepción autorizada: permite cerrar la venta sin pago confirmado. */
  exception: { authorizedBy: string; reason: string; at: string } | null;
  history: ProofEvent[];
};

export type Result<T> = { ok: true; value: T } | { ok: false; code: ProofError; message: string };
export type ProofError =
  | 'EXPIRED' | 'INVALID_STATE' | 'REASON_REQUIRED' | 'IMAGE_REQUIRED' | 'IMAGE_TOO_LARGE'
  | 'IMAGE_TYPE' | 'AMOUNT_INVALID' | 'NOT_FOUND' | 'ACTOR_REQUIRED';

export const PROOF_TTL_MS = 15 * 60 * 1000;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_PREFIX = /^data:image\/(jpeg|png|webp);base64,/;

const fail = (code: ProofError, message: string): { ok: false; code: ProofError; message: string } => ({ ok: false, code, message });
const push = (p: ProofRequest, at: Date, by: string, status: ProofStatus, note?: string): ProofRequest => ({
  ...p,
  status,
  history: [...p.history, { at: at.toISOString(), by, status, ...(note ? { note } : {}) }],
});

export const isExpired = (p: ProofRequest, now: Date): boolean => now.getTime() > Date.parse(p.expiresAt);

export type NewProofInput = {
  id: string; token: string; operationId: string; method: string; channelId: string; channelLabel: string;
  amount: number; destination: string; employee: string;
};

export const createProof = (input: NewProofInput, now: Date): Result<ProofRequest> => {
  if (!Number.isInteger(input.amount) || input.amount <= 0) return fail('AMOUNT_INVALID', 'El monto debe ser un entero COP mayor que cero.');
  if (input.employee.trim() === '') return fail('ACTOR_REQUIRED', 'Falta el empleado responsable.');
  return {
    ok: true,
    value: {
      ...input,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + PROOF_TTL_MS).toISOString(),
      status: 'esperando', image: null, receivedAt: null, attempts: 0, exception: null,
      history: [{ at: now.toISOString(), by: input.employee, status: 'esperando' }],
    },
  };
};

/** El teléfono (o el cajero adjuntando en el computador) entrega la imagen. Permitido en esperando o tras un rechazo. */
export const submitEvidence = (p: ProofRequest, image: string, by: string, now: Date): Result<ProofRequest> => {
  if (isExpired(p, now)) return fail('EXPIRED', 'El enlace venció. Genera una solicitud nueva.');
  if (p.status !== 'esperando' && p.status !== 'rechazado') {
    return fail('INVALID_STATE', 'Esta solicitud ya tiene comprobante o fue resuelta.');
  }
  if (!IMAGE_PREFIX.test(image)) return fail('IMAGE_TYPE', 'El archivo debe ser una imagen JPG, PNG o WEBP.');
  const bytes = Math.floor(((image.length - image.indexOf(',') - 1) * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) return fail('IMAGE_TOO_LARGE', 'La imagen supera 3 MB.');
  return {
    ok: true,
    value: { ...push(p, now, by, 'recibido'), image, receivedAt: now.toISOString(), attempts: p.attempts + 1 },
  };
};

export const startVerification = (p: ProofRequest, by: string, now: Date): Result<ProofRequest> => {
  if (by.trim() === '') return fail('ACTOR_REQUIRED', 'Falta quién verifica.');
  if (p.status !== 'recibido') return fail('INVALID_STATE', 'Solo se verifica un comprobante recibido.');
  return { ok: true, value: push(p, now, by, 'verificando') };
};

/** Confirmar exige haber visto evidencia y dejar quién lo hizo. */
export const confirmPayment = (p: ProofRequest, by: string, now: Date): Result<ProofRequest> => {
  if (by.trim() === '') return fail('ACTOR_REQUIRED', 'Falta quién confirma.');
  if (p.status !== 'recibido' && p.status !== 'verificando') return fail('INVALID_STATE', 'Primero debe llegar un comprobante.');
  if (p.image === null) return fail('IMAGE_REQUIRED', 'No hay comprobante que respalde la confirmación.');
  return { ok: true, value: push(p, now, by, 'confirmado') };
};

export const rejectPayment = (p: ProofRequest, by: string, reason: string, now: Date): Result<ProofRequest> => {
  if (by.trim() === '') return fail('ACTOR_REQUIRED', 'Falta quién rechaza.');
  if (reason.trim().length < 3) return fail('REASON_REQUIRED', 'Escribe el motivo del rechazo.');
  if (p.status !== 'recibido' && p.status !== 'verificando') return fail('INVALID_STATE', 'Solo se rechaza un comprobante recibido.');
  return { ok: true, value: push(p, now, by, 'rechazado', reason.trim()) };
};

/** Excepción autorizada y trazable: cierra la venta sin pago confirmado. No cambia el estado del pago. */
export const authorizeException = (p: ProofRequest, authorizedBy: string, reason: string, now: Date): Result<ProofRequest> => {
  if (authorizedBy.trim() === '') return fail('ACTOR_REQUIRED', 'Falta quién autoriza la excepción.');
  if (reason.trim().length < 5) return fail('REASON_REQUIRED', 'Escribe el motivo de la excepción.');
  if (p.status === 'confirmado') return fail('INVALID_STATE', 'El pago ya está confirmado.');
  return {
    ok: true,
    value: {
      ...p,
      exception: { authorizedBy, reason: reason.trim(), at: now.toISOString() },
      history: [...p.history, { at: now.toISOString(), by: authorizedBy, status: p.status, note: `Excepción: ${reason.trim()}` }],
    },
  };
};

/** El botón "Confirmar venta" solo se habilita con pago confirmado o excepción autorizada. */
export const canCloseSale = (p: ProofRequest | null): boolean => p !== null && (p.status === 'confirmado' || p.exception !== null);

/** Vista pública para el teléfono: nada de imagen, historial ni datos de otras ventas. */
export type PublicProof = Pick<ProofRequest, 'channelLabel' | 'amount' | 'destination' | 'employee' | 'status' | 'expiresAt' | 'operationId'>;
export const toPublic = (p: ProofRequest): PublicProof => ({
  channelLabel: p.channelLabel, amount: p.amount, destination: p.destination, employee: p.employee,
  status: p.status, expiresAt: p.expiresAt, operationId: p.operationId,
});
