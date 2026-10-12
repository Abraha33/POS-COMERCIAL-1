import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { registerSchema, type Register } from '@/shared/contracts';
import { api, type ApiError } from './client';

/** Cajas y terminales de la sede (v0.7.0, aprobado). Solo lectura. */
export const useRegisters = (branchId?: string) =>
  useQuery<Register[], ApiError>({
    queryKey: ['registers', branchId ?? null],
    queryFn: () => api.get(`/pos/registers${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`, z.array(registerSchema)),
  });
