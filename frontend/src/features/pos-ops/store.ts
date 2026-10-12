import { scopeKey, type Scope } from './types';

/** Almacén clave-valor mínimo. `localStorage` en el navegador; memoria en pruebas o si no hay almacenamiento. */
export type KeyValueStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export class StorageUnavailableError extends Error {
  constructor(message = 'No hay espacio o permiso para guardar datos locales.') {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

export const memoryStorage = (): KeyValueStorage & { fail: boolean } => {
  const data = new Map<string, string>();
  const self = {
    fail: false,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (self.fail) throw new StorageUnavailableError();
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
  };
  return self;
};

const browserStorage = (): KeyValueStorage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

type Listener = () => void;

/**
 * Persistencia local de turnos, autorizaciones y cola, aislada por empresa + sede + caja.
 * Guarda JSON versionado. Un fallo de escritura (cuota, modo privado) lanza `StorageUnavailableError`:
 * quien llama debe BLOQUEAR la operación en vez de asumir que quedó guardada.
 * ponytail: localStorage; IndexedDB cuando haya volumen real o se necesiten transacciones.
 */
export const createOpsStore = (scope: Scope, storage: KeyValueStorage | null = browserStorage()) => {
  const fallback = memoryStorage();
  const backend = storage ?? fallback;
  const listeners = new Set<Listener>();
  const key = (domain: string) => `pos.ops.v1.${scopeKey(scope)}.${domain}`;

  const read = <T>(domain: string): T[] => {
    try {
      const raw = backend.getItem(key(domain));
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  };

  const write = <T>(domain: string, items: T[]): void => {
    try {
      backend.setItem(key(domain), JSON.stringify(items));
    } catch (error) {
      throw error instanceof StorageUnavailableError ? error : new StorageUnavailableError();
    }
    listeners.forEach((l) => l());
  };

  return {
    scope,
    read,
    write,
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    /** Versión: cambia con cada escritura; sirve como snapshot para `useSyncExternalStore`. */
    snapshotKey: (domain: string) => backend.getItem(key(domain)) ?? '',
  };
};

export type OpsStore = ReturnType<typeof createOpsStore>;
