import { z } from 'zod';
import { money } from './common';

/**
 * Plataforma (v0.7.0): recursos de referencia de solo lectura. Espejo de `components.schemas` en
 * contracts/openapi.yaml; la igualdad la verifica `tests/contract-types.ts`.
 */

// ---------- Cajas y terminales (aprobado por el dueño, 2026-10-12) ----------
export const registerStatusSchema = z.enum(['free', 'occupied']);
export type RegisterStatus = z.infer<typeof registerStatusSchema>;

export const registerSchema = z.object({
  id: z.string(),
  name: z.string(),
  branchId: z.string(),
  terminal: z.object({ id: z.string(), name: z.string() }),
  /** Base esperada de apertura; `null` = sin base configurada (abrir sigue siendo posible). */
  expectedOpening: money.nullable(),
  status: registerStatusSchema,
  /** Quien tiene el turno abierto en esta caja; `null` si está libre. */
  occupiedBy: z.object({ id: z.string(), name: z.string() }).nullable(),
});
export type Register = z.infer<typeof registerSchema>;
