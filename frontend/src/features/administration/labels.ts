import type { Permission } from '@/shared/contracts';

/** Etiquetas legibles de cada permiso del contrato (exhaustivo: si el contrato suma uno, TS lo exige). */
export const permissionLabels: Record<Permission, string> = {
  'pos.sell': 'Vender en el punto de venta',
  'pos.refund': 'Devolver ventas',
  'products.view': 'Ver productos',
  'products.edit': 'Crear y editar productos',
  'inventory.view': 'Ver inventarios',
  'inventory.adjust': 'Ajustar inventarios',
  'purchases.view': 'Ver compras',
  'purchases.create': 'Crear, enviar y cancelar compras',
  'purchases.receive': 'Recibir órdenes de compra',
  'customers.view': 'Ver clientes',
  'customers.edit': 'Crear y editar clientes',
  'receivables.view': 'Ver cuentas por cobrar',
  'receivables.pay': 'Registrar abonos de clientes',
  'payables.view': 'Ver cuentas por pagar',
  'payables.pay': 'Registrar pagos a proveedores',
  'reports.view': 'Ver reportes',
  'admin.manage': 'Administrar usuarios y configuración',
};

export const FORBIDDEN_MESSAGE =
  'Tu rol no tiene permiso para crear ni editar empleados. Solo Administrador y Propietario pueden hacerlo (BR-ADM-01).';
