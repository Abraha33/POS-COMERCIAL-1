import { Link, Outlet } from '@tanstack/react-router';
import { modules } from '@/app/config/modules';
import { roleLabels } from '@/app/config/permissions';
import { roleSchema, type Role } from '@/shared/contracts';
import { useSession } from '@/app/providers/SessionProvider';
import { ErrorBoundary } from './ErrorBoundary';
import './app-shell.css';

const roleOptions = roleSchema.options.map((value) => ({ value, label: roleLabels[value] }));

export const AppShell = () => {
  const { session, can, switchRole } = useSession();
  const visible = modules.filter((m) => can(m.permission));

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <strong>{session.company.name}</strong>
        <span className="app-shell__meta">
          {session.branch.name} · {session.register.name}
        </span>
        <div className="app-shell__spacer" />
        <label htmlFor="role-switcher" className="app-shell__meta">Rol simulado</label>
        <select
          id="role-switcher"
          className="p-inputtext"
          value={session.user.role}
          onChange={(e) => switchRole(e.target.value as Role)}
        >
          {roleOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </header>
      <nav className="app-shell__nav" aria-label="Módulos">
        <ul>
          {visible.map((m) => (
            <li key={m.id}>
              <Link to={m.path} activeProps={{ className: 'is-active' }} data-testid={`nav-${m.id}`}>
                <i className={m.icon} aria-hidden="true" /> {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="app-shell__main">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
};
