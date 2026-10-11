import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { roleSchema, sessionSchema, type AuthSession, type Permission, type Role, type Session } from '@/shared/contracts';
import { roleLabels, rolePermissions } from '@/app/config/permissions';

type SessionContextValue = {
  session: Session;
  can: (permission: Permission) => boolean;
  /** Selector de rol simulado (solo DEV). Descarta la sesión de login y vuelve a la sesión genérica del rol. */
  switchRole: (role: Role) => void;
  /** Adopta la sesión devuelta por `useLogin` (usuario real, sucursal y caja). */
  signIn: (auth: AuthSession) => void;
  /** Olvida la sesión de login. El token lo limpia quien llama con `setAccessToken(null)` si aplica. */
  signOut: () => void;
  /** true si la sesión viene de un login y no del rol simulado. */
  authenticated: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const buildSession = (role: Role): Session => ({
  user: { id: `emp-${role}`, name: `Usuario ${roleLabels[role]}`, role },
  company: { id: 'co-001', name: 'Comercial Demo S.A.S.' },
  branch: { id: 'br-001', name: 'Sede Principal' },
  register: { id: 'reg-001', name: 'Caja 1' },
});

const STORAGE_KEY = 'pos.simulatedRole';
const SESSION_KEY = 'pos.session';

const storedRole = (): Role | null => {
  try {
    const parsed = roleSchema.safeParse(window.sessionStorage.getItem(STORAGE_KEY));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/** Sesión de login guardada en sessionStorage (sin token ni PIN: solo nombre, rol, sucursal y caja). */
const storedSession = (): Session | null => {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const persist = (key: string, value: string | null) => {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: vive solo en memoria */
  }
};

type SessionProviderProps = {
  children: ReactNode;
  initialRole?: Role;
  /** Se invoca al montar y en cada cambio de rol simulado (p. ej. para fijar el token de los mocks). */
  onRoleChange?: (role: Role) => void;
};

export const SessionProvider = ({ children, initialRole, onRoleChange }: SessionProviderProps) => {
  const [login, setLogin] = useState<Session | null>(() => (initialRole ? null : storedSession()));
  const [role, setRole] = useState<Role>(() => initialRole ?? storedSession()?.user.role ?? storedRole() ?? 'propietario');

  const switchRole = useCallback((next: Role) => {
    setLogin(null);
    persist(SESSION_KEY, null);
    setRole(next);
    persist(STORAGE_KEY, next);
  }, []);

  const signIn = useCallback((auth: AuthSession) => {
    setLogin(auth.session);
    setRole(auth.session.user.role);
    persist(SESSION_KEY, JSON.stringify(auth.session));
  }, []);

  const signOut = useCallback(() => {
    setLogin(null);
    persist(SESSION_KEY, null);
  }, []);

  useEffect(() => {
    // Con sesión de login el token ya lo fijó `useLogin`; el puente de rol simulado no debe pisarlo.
    if (!login) onRoleChange?.(role);
  }, [role, login, onRoleChange]);

  const value = useMemo<SessionContextValue>(() => {
    const granted = new Set<Permission>(rolePermissions[role]);
    return {
      session: login ?? buildSession(role),
      can: (p) => granted.has(p),
      switchRole,
      signIn,
      signOut,
      authenticated: login !== null,
    };
  }, [role, login, switchRole, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider');
  return ctx;
};
