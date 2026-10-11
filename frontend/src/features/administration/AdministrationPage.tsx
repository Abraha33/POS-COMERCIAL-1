import { useState } from 'react';
import { ScreenTemplate, SegmentedTabs } from '@/shared/ui';
import { BranchesTab } from './BranchesTab';
import { EmployeesTab } from './EmployeesTab';
import { RolesMatrixTab } from './RolesMatrixTab';
import { SettingsTab } from './SettingsTab';
import './administration.css';

type TabId = 'users' | 'roles' | 'branches' | 'settings';

const TABS = [
  { value: 'users', label: 'Usuarios' },
  { value: 'roles', label: 'Roles y permisos' },
  { value: 'branches', label: 'Sedes y empresa' },
  { value: 'settings', label: 'Configuración' },
] as const satisfies readonly { value: TabId; label: string }[];

/** Administración: empleados, matriz de roles, sedes/empresa y parámetros aprobados. */
export const AdministrationPage = () => {
  const [tab, setTab] = useState<TabId>('users');
  const current = TABS.find((t) => t.value === tab);
  return (
    <ScreenTemplate title="Administración" subtitle="Usuarios, roles, sedes y parámetros del negocio">
      <div className="admin__tabs">
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} ariaLabel="Secciones de administración" variant="tabs" />
      </div>
      <div className="admin__panel" role="tabpanel" aria-label={current?.label}>
        {tab === 'users' ? <EmployeesTab /> : null}
        {tab === 'roles' ? <RolesMatrixTab /> : null}
        {tab === 'branches' ? <BranchesTab /> : null}
        {tab === 'settings' ? <SettingsTab /> : null}
      </div>
    </ScreenTemplate>
  );
};
