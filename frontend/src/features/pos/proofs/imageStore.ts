/**
 * Transporte de las fotos de evidencia. El contrato guarda solo metadatos; cada imagen viaja por el relay de la LAN
 * (dev, en memoria del servidor de desarrollo) hasta el computador, y nunca se persiste en el navegador.
 * Las fotos se guardan por token del comprobante y por id de evidencia (varias fotos por transferencia, D-005).
 * En pruebas se usa la versión en memoria.
 */
export type ImageStore = {
  put: (token: string, evidenceId: string, image: string) => Promise<void>;
  /** Imágenes del comprobante por id de evidencia. Las que no estén disponibles simplemente faltan. */
  list: (token: string) => Promise<Record<string, string>>;
  remove: (token: string, evidenceId: string) => Promise<void>;
};

const BASE = '/dev-relay/images';

export const createHttpImageStore = (): ImageStore => ({
  put: async (token, evidenceId, image) => {
    const res = await fetch(`${BASE}/${token}/${evidenceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
    if (!res.ok) throw new Error('No se pudo transferir la imagen del comprobante.');
  },
  list: async (token) => {
    const res = await fetch(`${BASE}/${token}`);
    if (!res.ok) return {};
    const json = (await res.json()) as { images?: Record<string, string> };
    return json.images ?? {};
  },
  remove: async (token, evidenceId) => {
    await fetch(`${BASE}/${token}/${evidenceId}`, { method: 'DELETE' });
  },
});

export const createMemoryImageStore = (): ImageStore => {
  const images = new Map<string, Map<string, string>>();
  return {
    put: async (token, evidenceId, image) => {
      const forToken = images.get(token) ?? new Map<string, string>();
      forToken.set(evidenceId, image);
      images.set(token, forToken);
    },
    list: async (token) => Object.fromEntries(images.get(token) ?? []),
    remove: async (token, evidenceId) => {
      images.get(token)?.delete(evidenceId);
    },
  };
};

let current: ImageStore = createHttpImageStore();
export const getImageStore = (): ImageStore => current;
export const setImageStore = (store: ImageStore): void => {
  current = store;
};
