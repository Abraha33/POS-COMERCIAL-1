import { http, HttpResponse } from 'msw';
import {
  customerInputSchema, ledgerPaymentSchema, type CustomerPaymentResult, type LedgerPayment, type ReceivablePayment,
  type ReceivableRecord,
} from '@/shared/contracts';
import { today } from '@/shared/utils/clock';
import { db, nextId } from '../db';
import { toCustomer, toPayable, toReceivable } from '../derive';
import { authenticate, failure, forbidden, hasPermission, notFound, unauthorized, validationError } from '../http';

const recordPayment = (
  receivable: ReceivableRecord, input: LedgerPayment, amount: number,
): ReceivablePayment => {
  const payment: ReceivablePayment = {
    id: nextId('rpay'), receivableId: receivable.id, customerId: receivable.customerId, date: today(), amount,
    method: input.method, ...(input.note ? { note: input.note } : {}),
  };
  receivable.paid += amount;
  db.receivablePayments.push(payment);
  return payment;
};

export const ledgerHandlers = [
  http.post('/api/v1/customers', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    // El cajero da de alta clientes desde el POS (pos.sell); editar exige customers.edit.
    if (!hasPermission(user, 'customers.edit') && !hasPermission(user, 'pos.sell')) return forbidden();
    const parsed = customerInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Cliente con formato inválido');
    // BR-CLI-01: documentType + taxId únicos.
    if (db.customers.some((c) => c.taxId === parsed.data.taxId && c.documentType === parsed.data.documentType)) {
      return failure(409, 'CUSTOMER_DUPLICATED', 'Ya existe un cliente con ese documento');
    }
    const customer = { id: `cus-${String(db.customers.length + 1).padStart(3, '0')}`, ...parsed.data };
    db.customers.push(customer);
    return HttpResponse.json(toCustomer(customer), { status: 201 });
  }),

  http.put('/api/v1/customers/:id', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!hasPermission(user, 'customers.edit')) return forbidden();
    const parsed = customerInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Cliente con formato inválido');
    const index = db.customers.findIndex((c) => c.id === params.id);
    if (index === -1) return notFound('Cliente');
    const customer = { id: String(params.id), ...parsed.data };
    db.customers[index] = customer;
    return HttpResponse.json(toCustomer(customer));
  }),

  // Historial de abonos de una cuenta por cobrar (más reciente primero).
  http.get('/api/v1/receivables/:id/payments', ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!hasPermission(user, 'receivables.view')) return forbidden();
    if (!db.receivables.some((r) => r.id === params.id)) return notFound('Cuenta por cobrar');
    const history = db.receivablePayments.filter((p) => p.receivableId === params.id).reverse();
    return HttpResponse.json(history);
  }),

  // BR-CAR-01: abono a la factura indicada.
  http.post('/api/v1/receivables/:id/payments', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!hasPermission(user, 'receivables.pay')) return forbidden();
    const receivable = db.receivables.find((r) => r.id === params.id);
    if (!receivable) return notFound('Cuenta por cobrar');
    const parsed = ledgerPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Abono con formato inválido');
    const balance = receivable.amount - receivable.paid;
    if (parsed.data.amount > balance) {
      return failure(409, 'PAYMENT_EXCEEDS_BALANCE', 'El abono supera el saldo', { balance, requested: parsed.data.amount });
    }
    recordPayment(receivable, parsed.data, parsed.data.amount);
    return HttpResponse.json(toReceivable(receivable));
  }),

  // BR-CLI-05: abono del cliente imputado a las facturas más antiguas primero.
  http.post('/api/v1/customers/:id/payments', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!hasPermission(user, 'receivables.pay')) return forbidden();
    const customer = db.customers.find((c) => c.id === params.id);
    if (!customer) return notFound('Cliente');
    const parsed = ledgerPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Abono con formato inválido');

    const open = db.receivables
      .filter((r) => r.customerId === customer.id && r.amount - r.paid > 0)
      .sort((a, b) => a.issued.localeCompare(b.issued) || a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
    const balance = open.reduce((sum, r) => sum + (r.amount - r.paid), 0);
    if (parsed.data.amount > balance) {
      return failure(409, 'PAYMENT_EXCEEDS_BALANCE', 'El abono supera el saldo del cliente', {
        balance, requested: parsed.data.amount,
      });
    }

    let remaining = parsed.data.amount;
    const payments: ReceivablePayment[] = [];
    for (const receivable of open) {
      if (remaining === 0) break;
      const applied = Math.min(remaining, receivable.amount - receivable.paid);
      payments.push(recordPayment(receivable, parsed.data, applied));
      remaining -= applied;
    }
    const result: CustomerPaymentResult = {
      customerId: customer.id,
      amount: parsed.data.amount,
      payments,
      balanceAfter: balance - parsed.data.amount,
    };
    return HttpResponse.json(result);
  }),

  http.post('/api/v1/payables/:id/payments', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!hasPermission(user, 'payables.pay')) return forbidden();
    const payable = db.payables.find((p) => p.id === params.id);
    if (!payable) return notFound('Cuenta por pagar');
    const parsed = ledgerPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Pago con formato inválido');
    const balance = payable.amount - payable.paid;
    if (parsed.data.amount > balance) {
      return failure(409, 'PAYMENT_EXCEEDS_BALANCE', 'El pago supera el saldo', { balance, requested: parsed.data.amount });
    }
    payable.paid += parsed.data.amount;
    return HttpResponse.json(toPayable(payable));
  }),
];
