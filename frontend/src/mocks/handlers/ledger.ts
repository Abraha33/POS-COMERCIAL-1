import { http, HttpResponse } from 'msw';
import { customerInputSchema, ledgerPaymentSchema, type Role } from '@/shared/contracts';
import { db } from '../db';
import { authenticate, failure, forbidden, notFound, unauthorized, validationError } from '../http';

const LEDGER_ROLES: Role[] = ['cartera', 'admin', 'propietario'];

export const ledgerHandlers = [
  http.post('/api/v1/customers', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!LEDGER_ROLES.includes(user.role) && user.role !== 'cajero') return forbidden();
    const parsed = customerInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Cliente con formato inválido');
    // BR-CLI-01: documentType + taxId únicos.
    if (db.customers.some((c) => c.taxId === parsed.data.taxId && c.documentType === parsed.data.documentType)) {
      return failure(409, 'CUSTOMER_DUPLICATED', 'Ya existe un cliente con ese documento');
    }
    const customer = { id: `cus-${String(db.customers.length + 1).padStart(3, '0')}`, ...parsed.data };
    db.customers.push(customer);
    return HttpResponse.json(customer, { status: 201 });
  }),

  http.put('/api/v1/customers/:id', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!LEDGER_ROLES.includes(user.role)) return forbidden();
    const parsed = customerInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Cliente con formato inválido');
    const index = db.customers.findIndex((c) => c.id === params.id);
    if (index === -1) return notFound('Cliente');
    const customer = { id: String(params.id), ...parsed.data };
    db.customers[index] = customer;
    return HttpResponse.json(customer);
  }),

  http.post('/api/v1/receivables/:id/payments', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!LEDGER_ROLES.includes(user.role)) return forbidden();
    const receivable = db.receivables.find((r) => r.id === params.id);
    if (!receivable) return notFound('Cuenta por cobrar');
    const parsed = ledgerPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Abono con formato inválido');
    const balance = receivable.amount - receivable.paid;
    if (parsed.data.amount > balance) {
      return failure(409, 'PAYMENT_EXCEEDS_BALANCE', 'El abono supera el saldo', { balance, requested: parsed.data.amount });
    }
    receivable.paid += parsed.data.amount;
    return HttpResponse.json(receivable);
  }),

  http.post('/api/v1/payables/:id/payments', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!LEDGER_ROLES.includes(user.role) && user.role !== 'comprador') return forbidden();
    const payable = db.payables.find((p) => p.id === params.id);
    if (!payable) return notFound('Cuenta por pagar');
    const parsed = ledgerPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Pago con formato inválido');
    const balance = payable.amount - payable.paid;
    if (parsed.data.amount > balance) {
      return failure(409, 'PAYMENT_EXCEEDS_BALANCE', 'El pago supera el saldo', { balance, requested: parsed.data.amount });
    }
    payable.paid += parsed.data.amount;
    return HttpResponse.json(payable);
  }),
];
