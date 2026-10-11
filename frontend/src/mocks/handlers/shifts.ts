import { http, HttpResponse } from 'msw';
import { shiftCloseSchema, shiftMovementSchema, shiftOpenSchema, type Shift } from '@/shared/contracts';
import { db, mockNow, nextId } from '../db';
import { authenticate, canSell, failure, forbidden, notFound, unauthorized, validationError } from '../http';

const INCOME_CATEGORIES = ['base', 'sencillo'];

export const shiftHandlers = [
  http.get('/api/v1/pos/shifts/current', ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    const shift = db.shifts.find((s) => s.cashierId === user.id && s.status === 'open');
    return shift ? HttpResponse.json(shift) : notFound('Turno abierto');
  }),

  // BR-CAJ-01/02
  http.post('/api/v1/pos/shifts', async ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!canSell(user.role)) return forbidden();
    const parsed = shiftOpenSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Datos de apertura inválidos');

    if (db.shifts.some((s) => s.registerId === parsed.data.registerId && s.status === 'open')) {
      return failure(409, 'SHIFT_ALREADY_OPEN', 'La caja ya tiene un turno abierto');
    }
    const shift: Shift = {
      id: nextId('sh'),
      registerId: parsed.data.registerId,
      branchId: user.branchId,
      cashierId: user.id,
      openedAt: mockNow().toISOString(),
      closedAt: null,
      openingCash: parsed.data.openingCash,
      expectedCash: parsed.data.openingCash,
      countedCash: null,
      difference: null,
      closingNote: null,
      status: 'open',
    };
    db.shifts.push(shift);
    return HttpResponse.json(shift, { status: 201 });
  }),

  // BR-CAJ-09
  http.post('/api/v1/pos/shifts/:id/movements', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    const shift = db.shifts.find((s) => s.id === params.id);
    if (!shift) return notFound('Turno');
    const parsed = shiftMovementSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Movimiento de caja inválido');
    if (shift.status === 'closed') return failure(409, 'SHIFT_CLOSED', 'El turno está cerrado');

    const { type, category, amount } = parsed.data;
    const isIncomeCategory = INCOME_CATEGORIES.includes(category);
    if ((type === 'ingreso') !== isIncomeCategory) {
      return validationError('La categoría no corresponde al tipo de movimiento', { type, category });
    }
    shift.expectedCash += type === 'ingreso' ? amount : -amount;
    return HttpResponse.json(shift);
  }),

  // BR-CAJ-05..07
  http.post('/api/v1/pos/shifts/:id/close', async ({ request, params }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    const shift = db.shifts.find((s) => s.id === params.id);
    if (!shift) return notFound('Turno');
    const parsed = shiftCloseSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Datos de cierre inválidos');
    if (shift.status === 'closed') return failure(409, 'SHIFT_CLOSED', 'El turno ya está cerrado');

    const difference = parsed.data.countedCash - shift.expectedCash;
    const note = parsed.data.note?.trim();
    if (difference !== 0 && !note) {
      return failure(422, 'CASH_NOTE_REQUIRED', 'Toda diferencia de caja exige nota de justificación', { difference });
    }
    shift.countedCash = parsed.data.countedCash;
    shift.difference = difference;
    shift.closingNote = note ?? null;
    shift.closedAt = mockNow().toISOString();
    shift.status = 'closed';
    return HttpResponse.json(shift);
  }),
];
