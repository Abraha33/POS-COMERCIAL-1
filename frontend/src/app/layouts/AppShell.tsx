import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Menu } from 'primereact/menu';
import type { MenuItem } from 'primereact/menuitem';
import { bottomBarModules, navGroups } from '@/app/config/navigation';
import { modules, type ModuleDef } from '@/app/config/modules';
import { roleLabels } from '@/app/config/permissions';
import { useSession } from '@/app/providers/SessionProvider';
import { setAccessToken } from '@/shared/api/client';
import { useCurrentShift } from '@/shared/api/pos';
import { roleSchema, type Role } from '@/shared/contracts';
import { useHotkey } from '@/shared/keyboard/useHotkey';
import { ErrorBoundary } from './ErrorBoundary';
import { useOnlineStatus } from './useOnlineStatus';
import { useI18n } from '@/app/i18n/I18nProvider';
import { localeDefs, supportedLocales, type LocaleId } from '@/app/i18n/locales';
import './app-shell.css';

const roleOptions = roleSchema.options.map((value) => ({ value, label: roleLabels[value] }));

const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');

const currentModuleLabel = (pathname: string): string => {
  if (pathname === '/') return 'Inicio';
  return modules.find((m) => pathname === m.path || pathname.startsWith(`${m.path}/`))?.label ?? '';
};

const TopBar = ({ onToggleNav, navOpen, moduleLabel }: { onToggleNav: () => void; navOpen: boolean; moduleLabel: string }) => {
  const { session, switchRole, signOut } = useSession();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const shift = useCurrentShift();
  const searchRef = useRef<HTMLInputElement>(null);
  const userMenu = useRef<Menu>(null);

  useHotkey('/', () => searchRef.current?.focus());

  const hasShift = shift.data?.status === 'open';
  const userMenuItems: MenuItem[] = [
    {
      label: `${session.user.name} · ${roleLabels[session.user.role]}`,
      disabled: true,
    },
    { separator: true },
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out',
      command: () => {
        signOut();
        setAccessToken(null);
        void navigate({ to: '/login' });
      },
    },
  ];

  return (
    <header className="app-topbar">
      <button
        type="button"
        className="app-topbar__icon-button app-topbar__menu-button"
        aria-label="Abrir menú de módulos"
        aria-expanded={navOpen}
        aria-controls="app-nav"
        onClick={onToggleNav}
      >
        <i className="pi pi-bars" aria-hidden="true" />
      </button>

      <Link to="/" className="app-topbar__brand" aria-label="Ir al inicio">
        <i className="pi pi-shop" aria-hidden="true" />
        <span className="app-topbar__brand-name">{session.company.name}</span>
      </Link>
      {moduleLabel ? <span className="app-topbar__module" data-testid="current-module">{moduleLabel}</span> : null}

      <ul className="app-topbar__context" aria-label="Contexto de trabajo">
        <li title="Sucursal"><i className="pi pi-map-marker" aria-hidden="true" /><span>{session.branch.name}</span></li>
        <li title="Caja y turno">
          <i className="pi pi-inbox" aria-hidden="true" />
          <span>
            {session.register.name}
            <span className="app-topbar__shift">{shift.isPending ? '' : hasShift ? ' · Turno abierto' : ' · Sin turno'}</span>
          </span>
        </li>
        <li title="Cajero">
          <i className="pi pi-user" aria-hidden="true" />
          <span>{session.user.name} · {roleLabels[session.user.role]}</span>
        </li>
      </ul>

      <span
        className={`app-topbar__online${online ? '' : ' is-offline'}`}
        role="status"
        data-testid="online-indicator"
      >
        <i className={online ? 'pi pi-wifi' : 'pi pi-ban'} aria-hidden="true" />
        <span className="app-topbar__online-text">{online ? 'En línea' : 'Sin conexión'}</span>
      </span>

      <div className="app-topbar__spacer" />

      <div className="app-topbar__search">
        <i className="pi pi-search" aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          aria-label="Búsqueda global"
          aria-keyshortcuts="/"
          placeholder="Buscar en el sistema… ( / )"
          autoComplete="off"
        />
      </div>

      <button type="button" className="app-topbar__icon-button" aria-label="Notificaciones">
        <i className="pi pi-bell" aria-hidden="true" />
      </button>

      {import.meta.env.DEV ? (
        <select
          id="role-switcher"
          className="app-topbar__role"
          aria-label="Rol simulado"
          title="Rol simulado (solo desarrollo)"
          value={session.user.role}
          onChange={(e) => switchRole(e.target.value as Role)}
        >
          {roleOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : null}

      <label className="app-topbar__role-label">
        <span className="sr-only">{t('shell.language')}</span>
        <select
          className="app-topbar__role"
          aria-label={t('shell.language')}
          title={t('shell.language')}
          value={locale}
          onChange={(e) => setLocale(e.target.value as LocaleId)}
        >
          {supportedLocales.map((id) => (
            <option key={id} value={id}>{localeDefs[id].label}</option>
          ))}
        </select>
      </label>

      <Menu model={userMenuItems} popup ref={userMenu} id="user-menu" />
      <button
        type="button"
        className="app-topbar__user"
        aria-label={`Menú de usuario: ${session.user.name}`}
        aria-haspopup="menu"
        aria-controls="user-menu"
        onClick={(event) => userMenu.current?.toggle(event)}
      >
        <span className="app-topbar__avatar" aria-hidden="true">{initials(session.user.name)}</span>
        <span className="app-topbar__user-name">{session.user.name}</span>
        <i className="pi pi-chevron-down" aria-hidden="true" />
      </button>
    </header>
  );
};

const SideNav = ({ items, open }: { items: ModuleDef[]; open: boolean }) => {
  const grouped = navGroups
    .map((group) => ({ ...group, items: items.filter((m) => group.modules.includes(m.id)) }))
    .filter((group) => group.items.length > 0);
  const placed = new Set(navGroups.flatMap((g) => g.modules));
  const rest = items.filter((m) => !placed.has(m.id));

  const renderLink = (m: ModuleDef) => (
    <li key={m.id}>
      <Link to={m.path} activeProps={{ className: 'is-active', 'aria-current': 'page' }} data-testid={`nav-${m.id}`}>
        <i className={m.icon} aria-hidden="true" /> {m.label}
      </Link>
    </li>
  );

  return (
    <nav id="app-nav" className={`app-sidenav${open ? ' is-open' : ''}`} aria-label="Módulos">
      <ul>
        <li>
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: 'is-active', 'aria-current': 'page' }}
            data-testid="nav-home"
          >
            <i className="pi pi-home" aria-hidden="true" /> Inicio
          </Link>
        </li>
      </ul>
      {grouped.map((group) => (
        <Fragment key={group.id}>
          <p className="app-sidenav__group" id={`nav-group-${group.id}`}>{group.title}</p>
          <ul aria-labelledby={`nav-group-${group.id}`}>{group.items.map(renderLink)}</ul>
        </Fragment>
      ))}
      {rest.length > 0 ? (
        <>
          <p className="app-sidenav__group" id="nav-group-other">Otros</p>
          <ul aria-labelledby="nav-group-other">{rest.map(renderLink)}</ul>
        </>
      ) : null}
    </nav>
  );
};

const BottomBar = ({ items, onMore }: { items: ModuleDef[]; onMore: () => void }) => (
  <nav className="app-bottombar" aria-label="Acciones principales">
    <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'is-active', 'aria-current': 'page' }}>
      <i className="pi pi-home" aria-hidden="true" /><span>Inicio</span>
    </Link>
    {bottomBarModules.map((id) => {
      const m = items.find((x) => x.id === id);
      if (!m) return null;
      return (
        <Link key={id} to={m.path} activeProps={{ className: 'is-active', 'aria-current': 'page' }} data-testid={`bottom-${id}`}>
          <i className={m.icon} aria-hidden="true" /><span>{id === 'pos' ? 'Venta' : m.label}</span>
        </Link>
      );
    })}
    <button type="button" onClick={onMore} aria-controls="app-nav">
      <i className="pi pi-ellipsis-h" aria-hidden="true" /><span>Más</span>
    </button>
  </nav>
);

export const AppShell = () => {
  const { can } = useSession();
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

  // La pantalla de acceso y la captura del teléfono van sin barra ni menú.
  if (pathname === '/login' || pathname.startsWith('/captura/')) {
    return (
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    );
  }

  return (
    <div className="app-shell">
      <a className="app-skip-link" href="#main-content">Saltar al contenido</a>
      <TopBar navOpen={navOpen} onToggleNav={() => setNavOpen((open) => !open)} moduleLabel={currentModuleLabel(pathname)} />
      <SideNav items={visible} open={navOpen} />
      <div
        className={`app-shell__backdrop${navOpen ? ' is-open' : ''}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
      <main id="main-content" className="app-shell__main" tabIndex={-1}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <BottomBar items={visible} onMore={() => setNavOpen(true)} />
    </div>
  );
};
