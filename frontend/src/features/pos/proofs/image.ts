const MAX_SIDE = 1280;

const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });

/**
 * Reduce la foto del teléfono (≈ 4–10 MB) a un JPEG de máx. 1280 px antes de enviarla.
 * Sin canvas (pruebas, navegadores antiguos) devuelve el archivo tal cual y el dominio valida el tamaño.
 */
export const fileToEvidence = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');
  const original = await readAsDataUrl(file);
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return original;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return original;
  }
};
