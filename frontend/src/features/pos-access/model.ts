import type { Role, Shift } from '@/shared/contracts';

/**
 * Modelo de la interfaz de acceso y apertura de caja (POS-F01/F02).
 * Distingue tres cosas que NO deben mezclarse: la sesión del usuario, la caja física (y su terminal) y el turno.
 * El turno es `Shift` del contrato; aquí solo se referencia, no se duplica su estado.
 */

/** Moneda y billete del mismo valor son denominaciones distintas ($1.000 moneda ≠ $1.000 billete). */
export type DenominationKind = 'moneda' | 'billete';
export type CashDenomination = { id: string; kind: DenominationKind; value: number };

export type Terminal = { id: string; name: string; branchId: string };

export type CashRegister = {
  id: string;
  name: string;
  terminalId: string;
  branchId: string;
  /** Base esperada configurada para abrir (null = sin base configurada). */
  expectedOpening: number | null;
  /** Nombre de quien tiene el turno abierto en esta caja, si es otra persona. */
  occupiedBy: string | null;
};

export type CashierSession = {
  userId: string;
  name: string;
  role: Role;
  branchName: string;
  canSell: boolean;
  online: boolean;
};

/** Conteo de apertura: cantidades por denominación y su resultado. */
export type OpeningCount = {
  quantities: Record<string, number>;
  total: number;
  expected: number | null;
  /** total − esperado; null si no hay base esperada. */
  difference: number | null;
  note: string;
};

export type AccessStatus =
  | 'loading' | 'error' | 'sin-caja' | 'sin-permiso' | 'sin-conexion' | 'caja-ocupada' | 'turno-propio' | 'caja-cerrada';

export type AccessScenario = {
  id: string;
  label: string;
  session: CashierSession;
  terminal: Terminal | null;
  register: CashRegister | null;
  /** Turno propio abierto (contrato `Shift`); null = caja cerrada. */
  activeShift: Shift | null;
  /** Simula que la carga de acceso falla. */
  loadError?: boolean;
};
