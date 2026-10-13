import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { api, setAccessToken } from '@/shared/api/client';
import { inventoryAlertSchema, stockLevelSchema } from '@/shared/contracts';
import { mockTokenForRole } from '@/mocks/test-users';

/** Carril inventory · operaciones APROBADAS del contrato: existencias y alertas responden con la forma publicada. */
describe('inventario · contrato aprobado', () => {
  it('existencias: cada nivel cumple el esquema y hay datos por sede', async () => {
    setAccessToken(mockTokenForRole('propietario'));
    const levels = await api.get('/stock/levels', z.array(stockLevelSchema));
    expect(levels.length).toBeGreaterThan(0);
    expect(levels.every((level) => level.branchId.length > 0)).toBe(true);
  });

  it('alertas: la respuesta cumple el esquema (puede estar vacía)', async () => {
    setAccessToken(mockTokenForRole('propietario'));
    const alerts = await api.get('/inventory/alerts', z.array(inventoryAlertSchema));
    expect(Array.isArray(alerts)).toBe(true);
  });
});
