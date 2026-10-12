import { beforeEach, describe, expect, it } from 'vitest';
import { posSyncApi } from '@/shared/api/sync';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { db } from '@/mocks/db';
import { createHttpTransport } from '@/features/pos-ops/httpTransport';
import type { QueuedOperation } from '@/features/pos-ops/types';

const op = (key: string, over: Partial<QueuedOperation> = {}): QueuedOperation => ({
  id: key, idempotencyKey: key, kind: 'movimiento-efectivo',
  scope: { companyId: 'co-001', branchId: 'br-001', registerId: 'reg-001', terminalId: 'term-1' },
  shiftId: 'sh-open', cashierId: 'emp-001', payload: { amount: 5000 },
  createdAt: '2026-10-11T14:00:00Z', lastAttemptAt: null, attempts: 0, status: 'pendiente', lastError: null,
  remoteRef: null, dependsOn: [], version: 1, ...over,
});

describe('pos-ops contra la API de capa 5', () => {
  const transport = createHttpTransport(posSyncApi);
  beforeEach(() => {
    db.shifts.push({
      id: 'sh-open', registerId: 'reg-001', branchId: 'br-001', cashierId: 'emp-001', openedAt: '2026-10-11T13:00:00Z',
      closedAt: null, openingCash: 100000, expectedCash: 100000, countedCash: null, difference: null, closingNote: null,
      status: 'open',
    });
  });

  it('confirma, y reenviar la misma clave devuelve la misma referencia sin duplicar', async () => {
    setAccessToken(mockTokenForRole('cajero'));
    const first = await transport.send(op('k-1'));
    const again = await transport.send(op('k-1'));
    expect(first.kind).toBe('ok');
    expect(again).toEqual(first);
  });

  it('lookup: aplicada tras enviar; no aplicada si nunca llegó', async () => {
    setAccessToken(mockTokenForRole('cajero'));
    await transport.send(op('k-2'));
    expect((await transport.lookup('k-2')).kind).toBe('applied');
    expect((await transport.lookup('nunca')).kind).toBe('not-applied');
  });

  it('el servidor rechaza datos sensibles y una dependencia pendiente no se aplica', async () => {
    setAccessToken(mockTokenForRole('cajero'));
    const bad = await transport.send(op('k-3', { payload: { pin: '1234' } }));
    expect(bad).toMatchObject({ kind: 'rejected', code: 'SENSITIVE_DATA' });
    const dep = await transport.send(op('k-4', { dependsOn: ['k-nunca'] }));
    expect(dep.kind).toBe('network'); // reintentable
  });

  it('sin sesión la API responde con error y la operación no se da por aplicada', async () => {
    setAccessToken(null);
    const r = await transport.send(op('k-5'));
    expect(r.kind).toBe('rejected');
  });
});

describe('pos-ops: turno del servidor', () => {
  it('usa el turno real del servidor aunque el registro local tenga otro id', async () => {
    db.shifts.push({
      id: 'sh-real', registerId: 'reg-001', branchId: 'br-001', cashierId: 'emp-001', openedAt: '2026-10-11T13:00:00Z',
      closedAt: null, openingCash: 0, expectedCash: 0, countedCash: null, difference: null, closingNote: null, status: 'open',
    });
    setAccessToken(mockTokenForRole('cajero'));
    const t = createHttpTransport(posSyncApi, () => 'sh-real');
    const r = await t.send(op('k-6', { shiftId: 'shift-local-demo' }));
    expect(r.kind).toBe('ok');
  });
  it('sin turno en el servidor la operación se rechaza (no se inventa)', async () => {
    setAccessToken(mockTokenForRole('cajero'));
    const r = await createHttpTransport(posSyncApi).send(op('k-7', { shiftId: 'no-existe' }));
    expect(r).toMatchObject({ kind: 'rejected', code: 'SHIFT_NOT_FOUND' });
  });
});
