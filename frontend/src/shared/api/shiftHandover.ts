import { custodyEntrySchema, type CustodyEntry, type ShiftHandoverRequest } from '@/shared/contracts';
import { api } from './client';

/** Entrega de turno en el servidor (PROPUESTA v0.6.0, capa 5). Sin hooks: pos-ops la invoca tras registrar el relevo local. */
export const posShiftsApi = {
  handover: (shiftId: string, input: ShiftHandoverRequest): Promise<CustodyEntry> =>
    api.post(`/pos/shifts/${encodeURIComponent(shiftId)}/handover`, input, custodyEntrySchema),
};
export type PosShiftsApi = typeof posShiftsApi;
