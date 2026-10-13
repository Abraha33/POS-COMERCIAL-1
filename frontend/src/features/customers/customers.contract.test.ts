import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { api, setAccessToken } from '@/shared/api/client';
import { customerSchema, receivableSchema } from '@/shared/contracts';
import { mockTokenForRole } from '@/mocks/test-users';

/** Carril customers · operaciones APROBADAS del contrato: lectura de clientes y de cartera. */
describe('clientes y cartera · contrato aprobado', () => {
  it('clientes: cada cliente cumple el esquema y trae el saldo calculado por el servidor', async () => {
    setAccessToken(mockTokenForRole('propietario'));
    const customers = await api.get('/customers', z.array(customerSchema));
    expect(customers.length).toBeGreaterThan(0);
  });

  it('cartera: cada cuenta cumple el esquema; el saldo y la mora vienen del servidor', async () => {
    setAccessToken(mockTokenForRole('propietario'));
    const receivables = await api.get('/receivables', z.array(receivableSchema));
    expect(receivables.every((r) => typeof r.balance === 'number')).toBe(true);
  });
});
