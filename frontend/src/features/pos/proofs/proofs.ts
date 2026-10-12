/**
 * Captura móvil de comprobantes vinculada al cobro (PROPUESTA).
 * Una foto es EVIDENCIA, no confirmación: el pago solo queda confirmado por una decisión humana trazable
 * (o una excepción autorizada). El servidor decide las transiciones (contrato `/pos/payment-proofs`); aquí solo
 * están los tipos de la vista, el mapeo de estados y la validación previa de la imagen.
 */
export type ProofStatus = 'esperando' | 'recibido' | 'verificando' | 'confirmado' | 'rechazado' | 'excepcion' | 'vencido';

export const proofStatusLabel: Record<ProofStatus, string> = {
  esperando: 'Esperando comprobante',
  recibido: 'Comprobante recibido',
  verificando: 'Verificando',
  confirmado: 'Pago confirmado',
  rechazado: 'Rechazado / No coincide',
  excepcion: 'Excepción autorizada (sin verificación bancaria)',
  vencido: 'Vencido',
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
  /** Vista previa de la evidencia. Vive solo en memoria: nunca se persiste ni va al contrato. */
  image: string | null;
  receivedAt: string | null;
  attempts: number;
  /** Excepción autorizada: permite cerrar la venta sin pago confirmado. */
  exception: { authorizedBy: string; reason: string; at: string } | null;
  /** Bitácora de esta sesión de la pantalla; el servidor guarda estado y metadatos. */
  history: ProofEvent[];
};

export type Result<T> = { ok: true; value: T } | { ok: false; code: ProofError; message: string };
export type ProofError = 'IMAGE_TYPE' | 'IMAGE_TOO_LARGE';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_PREFIX = /^data:image\/(jpeg|png|webp);base64,/;

/** Valida la foto antes de enviarla. El servidor vuelve a validar; esto evita subir archivos que sabemos inválidos. */
export const validateEvidenceImage = (image: string): Result<{ mimeType: string; bytes: number }> => {
  const match = IMAGE_PREFIX.exec(image);
  if (!match) return { ok: false, code: 'IMAGE_TYPE', message: 'El archivo debe ser una imagen JPG, PNG o WEBP.' };
  const bytes = Math.floor(((image.length - image.indexOf(',') - 1) * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) return { ok: false, code: 'IMAGE_TOO_LARGE', message: 'La imagen supera 3 MB.' };
  return { ok: true, value: { mimeType: `image/${match[1]}`, bytes } };
};

/** El botón "Confirmar venta" solo se habilita con pago confirmado o excepción autorizada. */
export const canCloseSale = (p: ProofRequest | null): boolean => p !== null && (p.status === 'confirmado' || p.exception !== null);

/** Vista pública para el teléfono: nada de imagen, historial ni datos de otras ventas. */
export type PublicProof = Pick<ProofRequest, 'channelLabel' | 'amount' | 'destination' | 'employee' | 'status' | 'expiresAt' | 'operationId'>;
