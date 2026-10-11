import type { Permission, Role } from '@/shared/contracts';

const all: Permission[] = [
  'pos.sell', 'pos.refund', 'products.view', 'products.edit', 'inventory.view', 'inventory.adjust',
  'purchases.view', 'purchases.create', 'customers.view', 'receivables.view', 'payables.view',
  'reports.view', 'admin.manage',
];

export const rolePermissions: Record<Role, readonly Permission[]> = {
  propietario: all,
  admin: all,
  cajero: ['pos.sell', 'products.view', 'customers.view'],
  bodeguero: ['products.view', 'inventory.view', 'inventory.adjust'],
  comprador: ['products.view', 'inventory.view', 'purchases.view', 'purchases.create', 'payables.view'],
  cartera: ['customers.view', 'receivables.view', 'payables.view', 'reports.view'],
};

export const roleLabels: Record<Role, string> = {
  propietario: 'Propietario',
  admin: 'Administrador',
  cajero: 'Cajero',
  bodeguero: 'Bodeguero',
  comprador: 'Comprador',
  cartera: 'Cartera',
};
