import { afterEach, describe, expect, it, vi } from 'vitest';
import { uuid } from '@/shared/utils/uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('uuid (contexto no seguro, p. ej. http://IP-LAN)', () => {
  it('usa crypto.randomUUID cuando existe', () => {
    expect(uuid()).toMatch(V4);
  });

  it('funciona sin crypto.randomUUID (regresión: "crypto.randomUUID is not a function" al abrir caja por LAN)', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    const a = uuid();
    expect(a).toMatch(V4);
    expect(uuid()).not.toBe(a);
  });

  it('funciona incluso sin crypto', () => {
    vi.stubGlobal('crypto', undefined);
    expect(uuid()).toMatch(V4);
  });
});
