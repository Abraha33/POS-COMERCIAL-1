import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { roleSchema, type Permission, type Role, type Session } from '@/shared/contracts';
import { roleLabels, rolePermissions } from '@/app/config/permissions';

type SessionContextValue = {
  session: Session;
  can: (permission: Permission) => boolean;
  switchRole: (role: Role) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const buildSession = (role: Role): Session => ({
  user: { id: `emp-${role}`, name: `Usuario ${roleLabels[role]}`, role },
  company: { id: 'co-001', name: 'Comercial Demo S.A.S.' },
  branch: { id: 'br-001', name: 'Sede Principal' },
  register: { id: 'reg-001', name: 'Caja 1' },
});

const STORAGE_KEY = 'pos.simulatedRole';

const storedRole = (): Role | null => {
  try {
    const parsed = roleSchema.safeParse(window.sessionStorage.getItem(STORAGE_KEY));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

type SessionProviderProps = {
  children: ReactNode;
  initialRole?: Role;
  /** Se invoca al montar y en cada cambio de rol simulado (p. ej. para fijar el token de los mocks). */
  onRoleChange?: (role: Role) => void;
  /**
   * Sesión real del usuario simulado para ese rol (sede, caja, id de empleado), p. ej. la que devuelve
   * `GET /auth/session`. Sin ella se usa una sesión sintética con la sede principal.
   */
  sessionFor?: (role: Role) => Session | null;
};

export const SessionProvider = ({ children, initialRole, onRoleChange, sessionFor }: SessionProviderProps) => {
  const [role, setRole] = useState<Role>(() => initialRole ?? storedRole() ?? 'propietario');
  const switchRole = useCallback((next: Role) => {
    setRole(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* sin almacenamiento: el rol vive solo en memoria */
    }
  }, []);

  useEffect(() => {
    onRoleChange?.(role);
  }, [role, onRoleChange]);

  const value = useMemo<SessionContextValue>(() => {
    const granted = new Set<Permission>(rolePermissions[role]);
    return { session: sessionFor?.(role) ?? buildSession(role), can: (p) => granted.has(p), switchRole };
  }, [role, switchRole, sessionFor]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider');
  return ctx;
};
