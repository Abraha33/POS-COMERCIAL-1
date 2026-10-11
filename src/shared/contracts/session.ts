import { z } from 'zod';

export const permissionSchema = z.enum([
  'pos.sell', 'pos.refund',
  'products.view', 'products.edit',
  'inventory.view', 'inventory.adjust',
  'purchases.view', 'purchases.create',
  'customers.view', 'receivables.view', 'payables.view',
  'reports.view', 'admin.manage',
]);
export type Permission = z.infer<typeof permissionSchema>;

export const roleSchema = z.enum(['cajero', 'bodeguero', 'comprador', 'cartera', 'admin', 'propietario']);
export type Role = z.infer<typeof roleSchema>;

export const sessionSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), role: roleSchema }),
  company: z.object({ id: z.string(), name: z.string() }),
  branch: z.object({ id: z.string(), name: z.string() }),
  register: z.object({ id: z.string(), name: z.string() }),
});
export type Session = z.infer<typeof sessionSchema>;
