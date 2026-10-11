import type { Employee } from '@/shared/contracts';
import { useEmployees } from '@/shared/api/queries';
import { DataTablePage, type ColumnDef } from '@/shared/ui';

const columns: ColumnDef<Employee>[] = [
  { field: 'name', header: 'Nombre' },
  { field: 'role', header: 'Rol' },
  { field: 'branchId', header: 'Sede' },
];

/** Pantalla ancla de Administración (agente 5). */
export const AdministrationPage = () => {
  const { data, isLoading, error, refetch } = useEmployees();
  return (
    <DataTablePage
      title="Administración"
      subtitle="Usuarios y empleados"
      rows={data}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      columns={columns}
    />
  );
};
