import { TabPanel, TabView } from 'primereact/tabview';
import { ScreenTemplate } from '@/shared/ui';
import { BranchesTab } from './BranchesTab';
import { EmployeesTab } from './EmployeesTab';
import { RolesMatrixTab } from './RolesMatrixTab';
import { SettingsTab } from './SettingsTab';

/** Administración (agente 5): empleados, matriz de roles, sedes/empresa y parámetros aprobados. */
export const AdministrationPage = () => (
  <ScreenTemplate title="Administración" subtitle="Usuarios, roles, sedes y parámetros del negocio">
    <TabView>
      <TabPanel header="Usuarios"><EmployeesTab /></TabPanel>
      <TabPanel header="Roles y permisos"><RolesMatrixTab /></TabPanel>
      <TabPanel header="Sedes y empresa"><BranchesTab /></TabPanel>
      <TabPanel header="Configuración"><SettingsTab /></TabPanel>
    </TabView>
  </ScreenTemplate>
);
