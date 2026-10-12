import { http, HttpResponse } from 'msw';
import type { Register } from '@/shared/contracts';
import { db } from '../db';
import { authenticate, canSell, forbidden, unauthorized } from '../http';

export const registerHandlers = [
  // v0.7.0 (aprobado): cajas con su terminal, base esperada y ocupación derivada de los turnos abiertos.
  http.get('/api/v1/pos/registers', ({ request }) => {
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (!canSell(user.role)) return forbidden();
    const branchId = new URL(request.url).searchParams.get('branchId') || null;
    const registers: Register[] = db.registers
      .filter((r) => !branchId || r.branchId === branchId)
      .map((r) => {
        const open = db.shifts.find((s) => s.registerId === r.id && s.status === 'open');
        const cashier = open ? db.employees.find((e) => e.id === open.cashierId) : undefined;
        return {
          ...r,
          status: open ? 'occupied' : 'free',
          occupiedBy: open ? { id: open.cashierId, name: cashier?.name ?? open.cashierId } : null,
        };
      });
    return HttpResponse.json(registers);
  }),
];
