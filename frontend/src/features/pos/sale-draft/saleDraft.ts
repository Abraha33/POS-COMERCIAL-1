import { z } from 'zod';

const draftVersion = 1 as const;

export const saleDraftContextSchema = z.object({
  registerId: z.string().trim().min(1),
  shiftId: z.string().trim().min(1),
});
export type SaleDraftContext = z.infer<typeof saleDraftContextSchema>;

export const saleDraftLineSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().positive(),
  discount: z.number().finite().nonnegative(),
  /** Referencia visual para alertar cambios; el servidor siempre calcula el precio definitivo. */
  quotedUnitPrice: z.number().finite().nonnegative().optional(),
});
export type SaleDraftLine = z.infer<typeof saleDraftLineSchema>;

export const saleDraftSchema = z.object({
  version: z.literal(draftVersion),
  id: z.uuid(),
  registerId: z.string().trim().min(1),
  shiftId: z.string().trim().min(1),
  revision: z.number().int().nonnegative(),
  customerId: z.string().trim().min(1).nullable(),
  lines: z.array(saleDraftLineSchema),
  note: z.string().max(1000),
  updatedAt: z.iso.datetime(),
});
export type SaleDraft = z.infer<typeof saleDraftSchema>;

export type SaleDraftUpdate = Partial<Pick<SaleDraft, 'customerId' | 'lines' | 'note'>>;

const storagePrefix = 'pos.sale-draft.v1';

export const saleDraftStorageKey = (context: SaleDraftContext): string => {
  const parsed = saleDraftContextSchema.parse(context);
  return `${storagePrefix}.${parsed.registerId}.${parsed.shiftId}`;
};

const now = (): string => new Date().toISOString();
const newId = (): string => globalThis.crypto.randomUUID();

const storage = (): Storage | null => typeof window === 'undefined' ? null : window.sessionStorage;

const persistableDraft = (draft: SaleDraft): SaleDraft => ({
  version: draft.version,
  id: draft.id,
  registerId: draft.registerId,
  shiftId: draft.shiftId,
  revision: draft.revision,
  customerId: draft.customerId,
  lines: draft.lines.map(({ productId, quantity, discount, quotedUnitPrice }) => ({
    productId,
    quantity,
    discount,
    ...(quotedUnitPrice === undefined ? {} : { quotedUnitPrice }),
  })),
  note: draft.note,
  updatedAt: draft.updatedAt,
});

export const createSaleDraft = (context: SaleDraftContext): SaleDraft => {
  const parsed = saleDraftContextSchema.parse(context);
  return {
    version: draftVersion,
    id: newId(),
    registerId: parsed.registerId,
    shiftId: parsed.shiftId,
    revision: 0,
    customerId: null,
    lines: [],
    note: '',
    updatedAt: now(),
  };
};

/** Actualiza el borrador local; no autoriza precios ni valida inventario. */
export const updateSaleDraft = (draft: SaleDraft, update: SaleDraftUpdate): SaleDraft => {
  const current = saleDraftSchema.parse(draft);
  const next = saleDraftSchema.parse({
    ...current,
    ...(update.customerId === undefined ? {} : { customerId: update.customerId }),
    ...(update.lines === undefined ? {} : { lines: update.lines }),
    ...(update.note === undefined ? {} : { note: update.note }),
    revision: current.revision + 1,
    updatedAt: now(),
  });
  return persistableDraft(next);
};

export const saveSaleDraft = (draft: SaleDraft): void => {
  const parsed = saleDraftSchema.parse(draft);
  try {
    storage()?.setItem(saleDraftStorageKey(parsed), JSON.stringify(persistableDraft(parsed)));
  } catch {
    // El checkout conserva el estado montado si sessionStorage no está disponible.
  }
};

/** Restaura sólo el borrador del contexto activo; cualquier dato inválido se descarta. */
export const loadSaleDraft = (context: SaleDraftContext): SaleDraft => {
  const parsedContext = saleDraftContextSchema.parse(context);
  const key = saleDraftStorageKey(parsedContext);
  try {
    const raw = storage()?.getItem(key);
    if (raw === null || raw === undefined) return createSaleDraft(parsedContext);
    const restored = saleDraftSchema.safeParse(JSON.parse(raw));
    if (!restored.success || restored.data.registerId !== parsedContext.registerId || restored.data.shiftId !== parsedContext.shiftId) {
      storage()?.removeItem(key);
      return createSaleDraft(parsedContext);
    }
    return persistableDraft(restored.data);
  } catch {
    try { storage()?.removeItem(key); } catch { /* storage unavailable */ }
    return createSaleDraft(parsedContext);
  }
};

export const clearSaleDraft = (context: SaleDraftContext): void => {
  try { storage()?.removeItem(saleDraftStorageKey(context)); } catch { /* storage unavailable */ }
};