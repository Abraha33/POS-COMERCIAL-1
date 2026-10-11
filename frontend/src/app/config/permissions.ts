import type { Role } from '@/shared/contracts';

/** La matriz vive en el contrato (la comparten UI y mocks); se reexporta aquí para las features. */
export { rolePermissions } from '@/shared/contracts';

export const roleLabels: Record<Role, string> = {
  propietario: 'Propietario',
  admin: 'Administrador',
  cajero: 'Cajero',
  bodeguero: 'Bodeguero',
  comprador: 'Comprador',
  cartera: 'Cartera',
};
