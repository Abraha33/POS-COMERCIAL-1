import { useMemo } from 'react';
import { useSession } from '@/app/providers/SessionProvider';
import { useCurrentShift, useOpenShift } from '@/shared/api/pos';
import { useRegisters } from '@/shared/api/registers';
import { useCountryPack } from '@/shared/api/countryPack';
import type { Register, Shift } from '@/shared/contracts';
import type { CashDenomination, CashRegister, CashierSession, Terminal } from './model';

/**
 * Fuente REAL del acceso (v0.7.0): caja y turno vienen de `GET /pos/registers` y `GET /pos/shifts/current`, y la
 * apertura va a `POST /pos/shifts`. Los escenarios de `scenarios.ts` ya no son la fuente de verdad; quedan como datos
 * de prueba de la interfaz.
 */
export type AccessData = {
  session: CashierSession;
  terminal: Terminal | null;
  register: CashRegister | null;
  registers: CashRegister[];
  activeShift: Shift | null;
  denominations: CashDenomination[];
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
  openShift: ReturnType<typeof useOpenShift>;
};

const toRegister = (r: Register): CashRegister => ({
  id: r.id,
  name: r.name,
  terminalId: r.terminal.id,
  branchId: r.branchId,
  expectedOpening: r.expectedOpening,
  occupiedBy: r.occupiedBy?.name ?? null,
});

export const useAccessData = (registerId?: string): AccessData => {
  const { session, can } = useSession();
  const registers = useRegisters(session.branch.id);
  const shift = useCurrentShift();
  const pack = useCountryPack(session.regional?.countryCode);
  const openShift = useOpenShift();

  const mapped = useMemo(() => (registers.data ?? []).map(toRegister), [registers.data]);
  const chosen = registerId ? mapped.find((r) => r.id === registerId) : mapped.find((r) => r.id === session.register.id) ?? mapped[0];
  const terminalOf = (id: string): Terminal | null => {
    const raw = registers.data?.find((r) => r.id === id);
    return raw ? { id: raw.terminal.id, name: raw.terminal.name, branchId: raw.branchId } : null;
  };

  const cashier: CashierSession = {
    userId: session.user.id,
    name: session.user.name,
    role: session.user.role,
    branchName: session.branch.name,
    canSell: can('pos.sell'),
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
  };

  return {
    session: cashier,
    terminal: chosen ? terminalOf(chosen.id) : null,
    register: chosen ?? null,
    registers: mapped,
    activeShift: shift.data?.status === 'open' ? shift.data : null,
    denominations: (pack.data?.cashDenominations ?? []).map((d) => ({ id: d.id, kind: d.kind === 'bill' ? 'billete' : 'moneda', value: d.value })),
    isLoading: registers.isLoading || shift.isLoading || pack.isLoading,
    error: (registers.error ?? shift.error ?? pack.error) as Error | null,
    reload: () => {
      void registers.refetch();
      void shift.refetch();
    },
    openShift,
  };
};
