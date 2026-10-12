import { z } from 'zod';
import {
  approvalTicketSchema, type ApprovalTicket, type ApprovalTicketCreate, type ApprovalTicketDecision,
} from '@/shared/contracts';
import { api } from './client';

/**
 * Aprobaciones de supervisor en modo `request` (PROPUESTA v0.7.0). El modo `pin` es `useRequestApproval`
 * (`POST /auth/supervisor-approvals`, aprobado). Sin hooks: `pos-ops` sincroniza por ciclos.
 */
export const posApprovalsApi = {
  list: (): Promise<ApprovalTicket[]> => api.get('/auth/supervisor-approvals/requests', z.array(approvalTicketSchema)),
  create: (input: ApprovalTicketCreate): Promise<ApprovalTicket> =>
    api.post('/auth/supervisor-approvals/requests', input, approvalTicketSchema),
  decide: (id: string, input: ApprovalTicketDecision): Promise<ApprovalTicket> =>
    api.post(`/auth/supervisor-approvals/requests/${encodeURIComponent(id)}/decision`, input, approvalTicketSchema),
};
export type PosApprovalsApi = typeof posApprovalsApi;
