import { z } from 'zod';
import {
  authorizationRequestSchema, type AuthorizationCreate, type AuthorizationDecision, type AuthorizationRequest,
} from '@/shared/contracts';
import { api } from './client';

/** Autorizaciones del POS en el servidor (PROPUESTA v0.6.0, capa 5). Sin hooks: la UI de pos-ops sincroniza por ciclos. */
export const posAuthorizationsApi = {
  list: (): Promise<AuthorizationRequest[]> => api.get('/pos/authorizations', z.array(authorizationRequestSchema)),
  create: (input: AuthorizationCreate): Promise<AuthorizationRequest> =>
    api.post('/pos/authorizations', input, authorizationRequestSchema),
  decide: (id: string, input: AuthorizationDecision): Promise<AuthorizationRequest> =>
    api.post(`/pos/authorizations/${encodeURIComponent(id)}/decision`, input, authorizationRequestSchema),
};
export type PosAuthorizationsApi = typeof posAuthorizationsApi;
