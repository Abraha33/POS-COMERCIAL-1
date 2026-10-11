import { http, HttpResponse } from 'msw';
import { employeeInputSchema } from '@/shared/contracts';
import { db } from '../db';
import { authenticate, forbidden, notFound, unauthorized, validationError } from '../http';

const isAdmin = (role: string) => role === 'admin' || role === 'propietario';

export const adminHandlers = [
  http.get('/api/v1/branches', () => HttpResponse.json(db.branches)),

  http.post('/api/v1/employees', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    const parsed = employeeInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Empleado con formato inválido');
    if (!db.branches.some((b) => b.id === parsed.data.branchId)) return validationError('Sede inexistente');
    const employee = { id: `emp-${String(db.employees.length + 1).padStart(3, '0')}`, ...parsed.data };
    db.employees.push(employee);
    return HttpResponse.json(employee, { status: 201 });
  }),

  http.put('/api/v1/employees/:id', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    const parsed = employeeInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Empleado con formato inválido');
    const index = db.employees.findIndex((e) => e.id === params.id);
    if (index === -1) return notFound('Empleado');
    const employee = { id: String(params.id), ...parsed.data };
    db.employees[index] = employee;
    return HttpResponse.json(employee);
  }),
];
