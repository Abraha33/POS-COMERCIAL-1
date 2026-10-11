import { HttpResponse } from 'msw';
import type { Employee, ApiErrorBody, Role } from '@/shared/contracts';
import { db } from './db';
import { tokenForEmployee, testUsers } from './test-users';

/** Respuesta de error con el formato único del contrato (BR-GEN-09). */
export const failure = (status: number, code: string, message: string, details?: Record<string, unknown>) => {
  const body: ApiErrorBody = { code, message, ...(details ? { details } : {}) };
  return HttpResponse.json(body, { status });
};

export const unauthorized = () => failure(401, 'UNAUTHORIZED', 'Falta sesión o es inválida');
export const forbidden = (message = 'Tu rol no tiene permiso para esta operación') =>
  failure(403, 'FORBIDDEN', message);
export const notFound = (what: string) => failure(404, 'NOT_FOUND', `${what} no encontrado`);
export const validationError = (message: string, details?: Record<string, unknown>) =>
  failure(422, 'VALIDATION_ERROR', message, details);

/** Empleado autenticado por `Authorization: Bearer mock-token-<employeeId>`, o null. */
export const authenticate = (request: Request): Employee | null => {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const user = testUsers.find((u) => tokenForEmployee(u.employeeId) === token);
  if (!user) return null;
  return db.employees.find((e) => e.id === user.employeeId) ?? null;
};

const SELL_ROLES: Role[] = ['cajero', 'admin', 'propietario'];
const REFUND_ROLES: Role[] = ['admin', 'propietario'];
const SUPERVISOR_ROLES: Role[] = ['admin', 'propietario'];

export const canSell = (role: Role) => SELL_ROLES.includes(role);
export const canRefund = (role: Role) => REFUND_ROLES.includes(role);
export const isSupervisor = (role: Role) => SUPERVISOR_ROLES.includes(role);

/** Tope de descuento por rol, como fracción (BR-VEN-04). */
export const discountCap = (role: Role): number => {
  if (role === 'propietario') return 1;
  if (role === 'admin') return 0.15;
  if (role === 'cajero') return 0.05;
  return 0;
};

export const branchName = (branchId: string): string => (branchId === 'br-002' ? 'Sede Norte' : 'Sede Principal');
