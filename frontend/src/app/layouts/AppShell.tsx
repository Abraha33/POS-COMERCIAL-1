import { useEffect, useState } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { modules } from '@/app/config/modules';
import { roleLabels } from '@/app/config/permissions';
import { roleSchema, type Role } from '@/shared/contracts';
import { useSession } from '@/app/providers/SessionProvider';
import { ErrorBoundary } from './ErrorBoundary';
import './app-shell.css';

const roleOptions = roleSchema.options.map((value) => ({ value, label: roleLabels[value] }));

export const AppShell = () => {
  const { session, can, switchRole } = useSession();
  const [navOpen, setNavOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const visible = modules.filter((m) => can(m.permission));

  // Al navegar, el drawer se cierra (en escritorio no tiene efecto visual).
  useEffect(() => setNavOpen(false), [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <button
          type="button"
          className="p-button p-button-text p-button-icon-only app-shell__menu-button"
          aria-label="Abrir menú de módulos"
          aria-expanded={navOpen}
          aria-controls="app-nav"
          onClick={() => setNavOpen((open) => !open)}
        >
          <i className="pi pi-bars" aria-hidden="true" />
        </button>
        <strong className="app-shell__title">{session.company.name}</strong>
        <span className="app-shell__meta app-shell__meta--branch">
          {session.branch.name} · {session.register.name}
        </span>
        <div className="app-shell__spacer" />
        {import.meta.env.DEV ? (
          <>
            <label htmlFor="role-switcher" className="app-shell__meta app-only-desktop">Rol simulado</label>
            <select
              id="role-switcher"
              className="p-inputtext"
              aria-label="Rol simulado"
              value={session.user.role}
              onChange={(e) => switchRole(e.target.value as Role)}
            >
              {roleOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </>
        ) : null}
      </header>
      <nav id="app-nav" className={`app-shell__nav${navOpen ? ' is-open' : ''}`} aria-label="Módulos">
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
      <div
        className={`app-shell__backdrop${navOpen ? ' is-open' : ''}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
      <main className="app-shell__main">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
};
