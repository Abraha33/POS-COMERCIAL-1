import type { Permission } from '@/shared/contracts';

export type ModuleId =
  | 'pos' | 'products' | 'inventory' | 'purchases' | 'customers'
  | 'receivables' | 'payables' | 'reports' | 'administration';

export type ModuleDef = {
  id: ModuleId;
  label: string;
  icon: string;
  path: string;
  /** Permiso mínimo para ver la pantalla ancla del módulo. */
  permission: Permission;
  /** Agente responsable (ver docs/MODULE_OWNERSHIP.md). */
  owner: 1 | 2 | 3 | 4 | 5 | 6;
};

/** Registro único de módulos: de aquí salen menú, rutas, guards y core:check. */
export const modules: readonly ModuleDef[] = [
  { id: 'pos', label: 'Punto de venta', icon: 'pi pi-shopping-cart', path: '/pos', permission: 'pos.sell', owner: 1 },
  { id: 'products', label: 'Productos', icon: 'pi pi-tags', path: '/products', permission: 'products.view', owner: 2 },
  { id: 'inventory', label: 'Inventarios', icon: 'pi pi-box', path: '/inventory', permission: 'inventory.view', owner: 2 },
  { id: 'purchases', label: 'Compras', icon: 'pi pi-truck', path: '/purchases', permission: 'purchases.view', owner: 3 },
  { id: 'customers', label: 'Clientes', icon: 'pi pi-users', path: '/customers', permission: 'customers.view', owner: 4 },
  { id: 'receivables', label: 'Cuentas por cobrar', icon: 'pi pi-wallet', path: '/receivables', permission: 'receivables.view', owner: 4 },
  { id: 'payables', label: 'Cuentas por pagar', icon: 'pi pi-credit-card', path: '/payables', permission: 'payables.view', owner: 4 },
  { id: 'reports', label: 'Reportes', icon: 'pi pi-chart-bar', path: '/reports', permission: 'reports.view', owner: 6 },
  { id: 'administration', label: 'Administración', icon: 'pi pi-cog', path: '/administration', permission: 'admin.manage', owner: 5 },
];
