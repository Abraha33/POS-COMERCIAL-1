import { z } from 'zod';
import { money } from './common';
import { paymentMethodSchema } from './sale';

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

// ---------- Regional (v0.7.0, PROPUESTA): país, idioma y moneda de la sesión ----------
export const textDirectionSchema = z.enum(['ltr', 'rtl']);
export type TextDirection = z.infer<typeof textDirectionSchema>;

export const regionalSchema = z.object({
  /** ISO 3166-1 alfa-2. */
  countryCode: z.string().length(2),
  /** Etiqueta BCP 47 (p. ej. `es-CO`, `hi-IN`). */
  locale: z.string().min(2),
  /** ISO 4217. */
  currency: z.string().length(3),
  direction: textDirectionSchema,
});
export type Regional = z.infer<typeof regionalSchema>;

// ---------- Paquete de país (v0.7.0, PROPUESTA): datos que cambian por mercado ----------
/** Tipo genérico del medio: la UI deriva el formulario del tipo, no del banco (ver DECISIONES_CONTRATOS §3). */
export const paymentChannelTypeSchema = z.enum([
  'cash', 'wallet', 'bank_transfer', 'instant_key', 'qr', 'card_terminal', 'gateway', 'credit',
]);
export type PaymentChannelType = z.infer<typeof paymentChannelTypeSchema>;

export const channelFieldSchema = z.object({
  key: z.enum(['reference', 'payer', 'bank', 'authCode', 'terminal', 'last4', 'phone', 'key']),
  label: z.string(),
  required: z.boolean(),
  input: z.enum(['text', 'digits']),
});
export type ChannelField = z.infer<typeof channelFieldSchema>;

export const paymentChannelSchema = z.object({
  /** Identificador estable; es el valor que viaja en `Payment.channel`. */
  id: z.string().min(1),
  label: z.string(),
  type: paymentChannelTypeSchema,
  /** Clasificación contable derivada del canal (`Payment.method`). */
  method: paymentMethodSchema,
  /** ¿Exige evidencia verificada antes de cerrar la venta? */
  requiresProof: z.boolean(),
  fields: z.array(channelFieldSchema),
  destinations: z.array(z.object({ id: z.string(), label: z.string() })),
});
export type PaymentChannel = z.infer<typeof paymentChannelSchema>;

export const documentTypeOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  hint: z.string().optional(),
  /** Valor por defecto de la empresa/país: el POS lo preselecciona y nunca bloquea. */
  isDefault: z.boolean(),
});
export type DocumentTypeOption = z.infer<typeof documentTypeOptionSchema>;

export const cashDenominationSchema = z.object({
  id: z.string().min(1),
  /** Moneda y billete del mismo valor son denominaciones distintas. */
  kind: z.enum(['coin', 'bill']),
  value: z.number().int().positive(),
});
export type CashDenomination = z.infer<typeof cashDenominationSchema>;

export const countryPackSchema = z.object({
  countryCode: z.string().length(2),
  currency: z.object({ code: z.string().length(3), minorUnits: z.number().int().min(0).max(4) }),
  paymentChannels: z.array(paymentChannelSchema).min(1),
  documentTypes: z.array(documentTypeOptionSchema).min(1),
  cashDenominations: z.array(cashDenominationSchema),
});
export type CountryPack = z.infer<typeof countryPackSchema>;

