/**
 * SIMULADOR de transporte de imágenes para comprobantes (NO es un endpoint del contrato). Lo sirve el middleware de
 * Vite en `/dev-relay/images/{token}[/{evidenceId}]`. Solo guarda las fotos en memoria del servidor de desarrollo; el
 * estado del comprobante vive en el contrato `/pos/payment-proofs`.
 */
export type ImageReply = { status: number; body: unknown };

const images = new Map<string, Map<string, string>>();
export const resetImageRelay = (): void => images.clear();

export const handleImageRelay = (method: string, path: string, body: Record<string, unknown>): ImageReply => {
  const [token, evidenceId] = path.split('/').filter(Boolean);
  if (!token) return { status: 404, body: { code: 'NOT_FOUND', message: 'Falta el token.' } };

  if (method === 'GET' && !evidenceId) {
    return { status: 200, body: { images: Object.fromEntries(images.get(token) ?? []) } };
  }
  if (method === 'PUT' && evidenceId) {
    if (typeof body.image !== 'string' || body.image.length === 0) {
      return { status: 422, body: { code: 'IMAGE_REQUIRED', message: 'Falta la imagen.' } };
    }
    const forToken = images.get(token) ?? new Map<string, string>();
    forToken.set(evidenceId, body.image);
    images.set(token, forToken);
    return { status: 200, body: { ok: true } };
  }
  if (method === 'DELETE' && evidenceId) {
    images.get(token)?.delete(evidenceId);
    return { status: 200, body: { ok: true } };
  }
  return { status: 405, body: { code: 'METHOD_NOT_ALLOWED', message: 'Método o ruta no permitidos.' } };
};
