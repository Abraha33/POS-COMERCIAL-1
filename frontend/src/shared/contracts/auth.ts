import { z } from 'zod';
import { isoDate, type Contract } from './common';
import { sessionSchema } from './session';

export const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
export type Login = z.infer<typeof loginSchema>;
export const loginContract: Contract<typeof loginSchema> = {
  doctype: 'User',
  schema: loginSchema,
  example: { username: 'laura.gomez', password: 'cambiar-en-desarrollo' },
};

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: isoDate,
  session: sessionSchema,
});
export type AuthSession = z.infer<typeof authSessionSchema>;
export const authSessionContract: Contract<typeof authSessionSchema> = {
  doctype: 'User',
  schema: authSessionSchema,
  example: {
    accessToken: 'token-de-ejemplo',
    expiresAt: '2026-10-01T21:00:00Z',
    session: {
      user: { id: 'emp-001', name: 'Laura Gómez', role: 'cajero' },
      company: { id: 'co-001', name: 'Comercial Demo S.A.S.' },
      branch: { id: 'br-001', name: 'Sede Principal' },
      register: { id: 'reg-001', name: 'Caja 1' },
    },
  },
};

/** Acciones que exigen PIN de supervisor (BR-VEN-04/05/14). `below_cost` solo lo autoriza el propietario. */
export const approvalActionSchema = z.enum(['discount', 'negative_stock', 'below_cost']);

export const approvalRequestSchema = z.object({ action: approvalActionSchema, pin: z.string().min(4) });
export type ApprovalRequest = z.infer<typeof approvalRequestSchema>;
export const approvalRequestContract: Contract<typeof approvalRequestSchema> = {
  doctype: 'User (PIN)',
  schema: approvalRequestSchema,
  example: { action: 'negative_stock', pin: '0000' },
};

export const approvalSchema = z.object({
  approvalToken: z.string().min(1),
  action: approvalActionSchema,
  supervisorId: z.string(),
  expiresAt: isoDate,
});
export type Approval = z.infer<typeof approvalSchema>;
export const approvalContract: Contract<typeof approvalSchema> = {
  doctype: 'User (PIN)',
  schema: approvalSchema,
  example: {
    approvalToken: 'aprobacion-de-ejemplo', action: 'negative_stock', supervisorId: 'emp-003',
    expiresAt: '2026-10-01T13:05:00Z',
  },
};
