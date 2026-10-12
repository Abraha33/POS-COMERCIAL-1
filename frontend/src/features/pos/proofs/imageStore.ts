/**
 * Transporte de la foto de evidencia. El contrato guarda solo metadatos; la imagen viaja por el relay de la LAN
 * (dev, en memoria del servidor de desarrollo) hasta el computador, y nunca se persiste en el navegador.
 * En pruebas se usa la versión en memoria.
 */
export type ImageStore = {
  put: (token: string, image: string) => Promise<void>;
  get: (token: string) => Promise<string | null>;
};

const BASE = '/dev-relay/images';

export const createHttpImageStore = (): ImageStore => ({
  put: async (token, image) => {
    const res = await fetch(`${BASE}/${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
    if (!res.ok) throw new Error('No se pudo transferir la imagen del comprobante.');
  },
  get: async (token) => {
    const res = await fetch(`${BASE}/${token}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { image: string | null };
    return json.image;
  },
});

export const createMemoryImageStore = (): ImageStore => {
  const images = new Map<string, string>();
  return {
    put: async (token, image) => {
      images.set(token, image);
    },
    get: async (token) => images.get(token) ?? null,
  };
};

let current: ImageStore = createHttpImageStore();
export const getImageStore = (): ImageStore => current;
export const setImageStore = (store: ImageStore): void => {
  current = store;
};
