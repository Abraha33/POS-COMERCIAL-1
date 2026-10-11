import { z } from 'zod';

export const permissionSchema = z.enum([
  'pos.sell', 'pos.refund',
  'products.view', 'products.edit',
  'inventory.view', 'inventory.adjust',
  'purchases.view', 'purchases.create', 'purchases.receive',
  'customers.view', 'customers.edit',
  'receivables.view', 'receivables.pay',
  'payables.view', 'payables.pay',
  'reports.view', 'admin.manage',
]);
export type Permission = z.infer<typeof permissionSchema>;

export const roleSchema = z.enum(['cajero', 'bodeguero', 'comprador', 'cartera', 'admin', 'propietario']);
export type Role = z.infer<typeof roleSchema>;

/**
 * Matriz rol -> permisos. Fuente única para la UI (`can`) y para los mocks que autorizan
 * (el servidor real debe aplicar la misma). PROPUESTA en lo añadido en v0.5.0
 * (`customers.edit`, `receivables.pay`, `payables.pay`, `purchases.receive`).
 */
const allPermissions = permissionSchema.options;

export const rolePermissions: Record<Role, readonly Permission[]> = {
  propietario: allPermissions,
  admin: allPermissions,
  cajero: ['pos.sell', 'products.view', 'customers.view'],
  // BR-COM-01: el bodeguero recibe órdenes; ve /purchases en lectura (no crea ni envía).
  bodeguero: ['products.view', 'inventory.view', 'inventory.adjust', 'purchases.view', 'purchases.receive'],
  comprador: [
    'products.view', 'inventory.view', 'purchases.view', 'purchases.create', 'purchases.receive',
    'payables.view', 'payables.pay',
  ],
  cartera: [
    'customers.view', 'customers.edit', 'receivables.view', 'receivables.pay', 'payables.view', 'payables.pay',
    'reports.view',
  ],
};

export const roleHasPermission = (role: Role, permission: Permission): boolean =>
  rolePermissions[role].includes(permission);

export const sessionSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), role: roleSchema }),
  company: z.object({ id: z.string(), name: z.string() }),
  branch: z.object({ id: z.string(), name: z.string() }),
  register: z.object({ id: z.string(), name: z.string() }),
});
export type Session = z.infer<typeof sessionSchema>;
