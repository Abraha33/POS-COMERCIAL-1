/**
 * SIMULADOR de transporte de imágenes para comprobantes (NO es un endpoint del contrato). Lo sirve el middleware de
 * Vite en `/dev-relay/images/{token}`. Solo guarda la foto en memoria del servidor de desarrollo; el estado del
 * comprobante vive en el contrato `/pos/payment-proofs`.
 */
export type ImageReply = { status: number; body: unknown };

const images = new Map<string, string>();
export const resetImageRelay = (): void => images.clear();

export const handleImageRelay = (method: string, token: string, body: Record<string, unknown>): ImageReply => {
  if (!token) return { status: 404, body: { code: 'NOT_FOUND', message: 'Falta el token.' } };
  if (method === 'PUT') {
    if (typeof body.image !== 'string' || body.image.length === 0) {
      return { status: 422, body: { code: 'IMAGE_REQUIRED', message: 'Falta la imagen.' } };
    }
    images.set(token, body.image);
    return { status: 200, body: { ok: true } };
  }
  if (method === 'GET') return { status: 200, body: { image: images.get(token) ?? null } };
  return { status: 405, body: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' } };
};
