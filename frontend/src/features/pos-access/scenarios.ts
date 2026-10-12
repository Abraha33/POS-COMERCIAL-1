import type { Shift } from '@/shared/contracts';
import type { AccessScenario, CashDenomination, CashRegister, CashierSession, Terminal } from './model';

/** Denominaciones COP configurables. El billete de $1.000 existe como entrada propia (valor y tipo). */
export const defaultDenominations: CashDenomination[] = [
  { id: 'billete-100000', kind: 'billete', value: 100000 },
  { id: 'billete-50000', kind: 'billete', value: 50000 },
  { id: 'billete-20000', kind: 'billete', value: 20000 },
  { id: 'billete-10000', kind: 'billete', value: 10000 },
  { id: 'billete-5000', kind: 'billete', value: 5000 },
  { id: 'billete-2000', kind: 'billete', value: 2000 },
  { id: 'billete-1000', kind: 'billete', value: 1000 },
  { id: 'moneda-1000', kind: 'moneda', value: 1000 },
  { id: 'moneda-500', kind: 'moneda', value: 500 },
  { id: 'moneda-200', kind: 'moneda', value: 200 },
  { id: 'moneda-100', kind: 'moneda', value: 100 },
  { id: 'moneda-50', kind: 'moneda', value: 50 },
];

const terminal: Terminal = { id: 'ter-001', name: 'Terminal 1', branchId: 'br-001' };

const register: CashRegister = {
  id: 'reg-001', name: 'Caja 1', terminalId: terminal.id, branchId: 'br-001', expectedOpening: 200000, occupiedBy: null,
};

const cashier: CashierSession = {
  userId: 'emp-001', name: 'Laura Gómez', role: 'cajero', branchName: 'Sede Principal', canSell: true, online: true,
};

/** Turno de ejemplo con la forma del contrato; solo existe en los escenarios simulados. */
const ownShift: Shift = {
  id: 'sim-shift-001', registerId: register.id, branchId: 'br-001', cashierId: cashier.userId,
  openedAt: '2026-10-11T13:00:00.000Z', closedAt: null, openingCash: 200000, expectedCash: 200000,
  countedCash: null, difference: null, closingNote: null, status: 'open',
};

export const scenarios: AccessScenario[] = [
  { id: 'caja-cerrada', label: '1. Cajero válido, caja cerrada', session: cashier, terminal, register, activeShift: null },
  { id: 'turno-propio', label: '2. Cajero válido, turno propio activo', session: cashier, terminal, register, activeShift: ownShift },
  {
    id: 'caja-ocupada', label: '3. Caja ocupada por otro usuario', session: cashier, terminal,
    register: { ...register, occupiedBy: 'Andrés Rojas' }, activeShift: null,
  },
  {
    id: 'sin-permiso', label: '4. Usuario sin permiso', terminal, register, activeShift: null,
    session: { ...cashier, name: 'Pedro Compras', role: 'comprador', canSell: false },
  },
  {
    id: 'sin-conexion', label: '12. Sin conexión: estado no verificable', terminal, register, activeShift: null,
    session: { ...cashier, online: false },
  },
  { id: 'sin-caja', label: 'Sin caja asignada', session: cashier, terminal, register: null, activeShift: null },
  { id: 'error-carga', label: 'Error al cargar el acceso', session: cashier, terminal, register, activeShift: null, loadError: true },
];
