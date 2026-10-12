import { http, HttpResponse } from 'msw';
import { approvalRequestSchema, loginSchema, type Approval, type AuthSession, type Session } from '@/shared/contracts';
import { db, mockNow, nextId, state } from '../db';
import { authenticate, branchName, failure, forbidden, isSupervisor, unauthorized, validationError } from '../http';
import { TEST_PASSWORD, testUsers, tokenForEmployee } from '../test-users';

const APPROVAL_TTL_MS = 5 * 60 * 1000;

export const sessionFor = (employeeId: string): Session | null => {
  const employee = db.employees.find((e) => e.id === employeeId);
  if (!employee) return null;
  return {
    user: { id: employee.id, name: employee.name, role: employee.role },
    company: { id: db.company.id, name: db.company.name },
    branch: { id: employee.branchId, name: branchName(employee.branchId) },
    // Una caja por sede en el seed: reg-00N para br-00N.
    register: { id: `reg-${employee.branchId.slice(-3)}`, name: 'Caja 1' },
    regional: { countryCode: 'CO', locale: 'es-CO', currency: 'COP', direction: 'ltr' },
  };
};

export const authHandlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Credenciales con formato inválido');
    const user = testUsers.find((u) => u.username === parsed.data.username);
    if (!user || parsed.data.password !== TEST_PASSWORD) {
      return failure(401, 'UNAUTHORIZED', 'Usuario o contraseña incorrectos');
    }
    const session = sessionFor(user.employeeId);
    if (!session) return unauthorized();
    const body: AuthSession = {
      accessToken: tokenForEmployee(user.employeeId),
      expiresAt: new Date(mockNow().getTime() + 8 * 3600 * 1000).toISOString(),
      session,
    };
    return HttpResponse.json(body);
  }),

  http.get('/api/v1/auth/session', ({ request }) => {
    const employee = authenticate(request);
    if (!employee) return unauthorized();
    const session = sessionFor(employee.id);
    return session ? HttpResponse.json(session) : unauthorized();
  }),

  // BR-VEN-04/05/14: el PIN se canjea por un token de un solo uso; nunca viaja dentro de la venta.
  http.post('/api/v1/auth/supervisor-approvals', async ({ request }) => {
    const requester = authenticate(request);
    if (!requester) return unauthorized();
    const parsed = approvalRequestSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Solicitud de aprobación inválida');

    const supervisor = testUsers.find((u) => u.pin !== undefined && u.pin === parsed.data.pin);
    const employee = supervisor && db.employees.find((e) => e.id === supervisor.employeeId);
    if (!supervisor || !employee || !isSupervisor(employee.role)) {
      return forbidden('PIN de supervisor inválido');
    }
    if (parsed.data.action === 'below_cost' && employee.role !== 'propietario') {
      return forbidden('Solo el propietario autoriza ventas bajo el costo');
    }

    if (parsed.data.action === 'credit_exception' && employee.role !== 'propietario' && employee.role !== 'admin') {
      return forbidden('Solo el propietario o un administrador autoriza excepciones de crédito');
    }

    const approval: Approval = {
      approvalToken: nextId('appr'),
      action: parsed.data.action,
      supervisorId: employee.id,
      expiresAt: new Date(mockNow().getTime() + APPROVAL_TTL_MS).toISOString(),
    };
    state.approvals.set(approval.approvalToken, { ...approval, used: false, supervisorRole: employee.role });
    return HttpResponse.json(approval);
  }),
];
