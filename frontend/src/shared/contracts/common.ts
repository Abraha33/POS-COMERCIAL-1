import { z } from 'zod';

export const isoDate = z.string().min(10);
export const money = z.number().nonnegative();

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number().int().nonnegative() });

export type Contract<T extends z.ZodType> = {
  /** Nombre del DocType equivalente en Frappe/ERPNext. */
  doctype: string;
  schema: T;
  example: z.infer<T>;
};
