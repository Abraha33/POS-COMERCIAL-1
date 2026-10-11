import type { ReactNode } from 'react';
import type { Permission } from '@/shared/contracts';
import { useSession } from '@/app/providers/SessionProvider';

export const AccessDenied = () => (
  <section role="alert" className="p-4" data-testid="access-denied">
    <h1 className="text-2xl m-0 mb-2">Acceso denegado</h1>
    <p className="m-0">Tu rol no tiene permiso para ver esta pantalla.</p>
  </section>
);

export const RouteGuard = ({ permission, children }: { permission: Permission; children: ReactNode }) => {
  const { can } = useSession();
  return can(permission) ? <>{children}</> : <AccessDenied />;
};

/** Oculta UI (botones, acciones) cuando falta el permiso. */
export const Can = ({ permission, children }: { permission: Permission; children: ReactNode }) => {
  const { can } = useSession();
  return can(permission) ? <>{children}</> : null;
};
