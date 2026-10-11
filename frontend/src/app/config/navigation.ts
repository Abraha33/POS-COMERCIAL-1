import type { ModuleId } from './modules';

export type NavGroup = { id: string; title: string; modules: readonly ModuleId[] };

/**
 * Agrupación del menú lateral (maqueta ref-2). Solo presenta los módulos de `modules.ts`: no define rutas ni permisos.
 * Un módulo que no aparezca aquí se muestra al final en "Otros", así no desaparece del menú.
 * Proveedores aún no tiene ruta propia: `payables` (cuentas por pagar) cubre ese caso hoy.
 */
export const navGroups: readonly NavGroup[] = [
  { id: 'operation', title: 'Operación', modules: ['pos'] },
  { id: 'catalog', title: 'Catálogo', modules: ['products', 'inventory', 'purchases', 'payables'] },
  { id: 'customers', title: 'Clientes y cartera', modules: ['customers', 'receivables'] },
  { id: 'reports', title: 'Reportes', modules: ['reports'] },
  { id: 'admin', title: 'Administración', modules: ['administration'] },
];

/** Acciones de la barra inferior móvil (Más abre el menú completo). */
export const bottomBarModules: readonly ModuleId[] = ['pos', 'products'];
