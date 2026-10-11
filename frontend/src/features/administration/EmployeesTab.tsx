import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { roleSchema, type Employee, type EmployeeInput, type Role } from '@/shared/contracts';
import { useBranches, useEmployees } from '@/shared/api/queries';
import { useSaveEmployee } from '@/shared/api/ledger';
import { ApiError } from '@/shared/api/client';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';
import { roleLabels } from '@/app/config/permissions';
import { useSession } from '@/app/providers/SessionProvider';
import { useNotify } from '@/app/providers/ToastProvider';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { FORBIDDEN_MESSAGE } from './labels';

type StatusFilter = 'all' | 'active' | 'inactive';

const errorText = (error: Error): string =>
  error instanceof ApiError && error.code === 'FORBIDDEN' ? FORBIDDEN_MESSAGE : error.message;

const toInput = (e: Employee, patch: Partial<EmployeeInput> = {}): EmployeeInput => ({
  name: e.name, role: e.role, branchId: e.branchId, active: e.active, ...patch,
});

export const EmployeesTab = () => {
  const employees = useEmployees();
  const branches = useBranches();
  const save = useSaveEmployee();
  const notify = useNotify();
  const { can, session } = useSession();
  const canManage = can('admin.manage');

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | 'all'>('all');
  const [branchId, setBranchId] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const branchNames = useMemo(
    () => new Map((branches.data ?? []).map((b) => [b.id, b.name])),
    [branches.data],
  );

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (employees.data ?? []).filter((e) =>
      (term === '' || e.name.toLowerCase().includes(term)) &&
      (role === 'all' || e.role === role) &&
      (branchId === 'all' || e.branchId === branchId) &&
      (status === 'all' || (status === 'active') === e.active),
    );
  }, [employees.data, search, role, branchId, status]);

  const openNew = () => { setEditing(null); setFormError(null); setDialogOpen(true); };
  const openEdit = (e: Employee) => { setEditing(e); setFormError(null); setDialogOpen(true); };

  const handleSubmit = (input: EmployeeInput) =>
    save.mutate(
      { id: editing?.id, input },
      {
        onSuccess: () => {
          setDialogOpen(false);
          notify({ severity: 'success', summary: 'Empleado guardado', detail: input.name });
        },
        onError: (e) => setFormError(errorText(e)),
      },
    );

  const askToggleActive = (e: Employee) => {
    const next = !e.active;
    confirmDialog({
      header: next ? 'Reactivar empleado' : 'Desactivar empleado',
      message: next
        ? `¿Reactivar a ${e.name}? Podrá volver a operar con su rol.`
        : `¿Desactivar a ${e.name}? No se borra: su historial se conserva y puede reactivarse.`,
      acceptLabel: next ? 'Reactivar' : 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () =>
        save.mutate(
          { id: e.id, input: toInput(e, { active: next }) },
          {
            onSuccess: () =>
              notify({ severity: 'success', summary: next ? 'Empleado reactivado' : 'Empleado desactivado', detail: e.name }),
            onError: (err) => notify({ severity: 'error', summary: 'No se pudo cambiar el estado', detail: errorText(err) }),
          },
        ),
    });
  };

  if (employees.isLoading || branches.isLoading) return <LoadingState label="Cargando empleados…" />;
  if (employees.error) return <ErrorState error={employees.error} onRetry={() => void employees.refetch()} />;
  if (branches.error) return <ErrorState error={branches.error} onRetry={() => void branches.refetch()} />;

  return (
    <div>
      {canManage ? null : (
        <p role="alert" className="p-3 border-1 surface-border border-round" data-testid="admin-readonly-notice">
          {FORBIDDEN_MESSAGE}
        </p>
      )}
      <div className="app-row mb-3">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            aria-label="Buscar empleado por nombre"
          />
        </span>
        <div>
          <label htmlFor="flt-role" className="sr-only">Filtrar por rol</label>
          <select id="flt-role" className="p-inputtext" value={role} onChange={(e) => setRole(e.target.value as Role | 'all')}>
            <option value="all">Todos los roles</option>
            {roleSchema.options.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="flt-branch" className="sr-only">Filtrar por sede</label>
          <select id="flt-branch" className="p-inputtext" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="all">Todas las sedes</option>
            {(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="flt-status" className="sr-only">Filtrar por estado</label>
          <select id="flt-status" className="p-inputtext" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        {canManage ? <Button label="Nuevo empleado" icon="pi pi-plus" onClick={openNew} className="ml-auto" /> : null}
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState message="Ningún empleado coincide con los filtros." />
      ) : (
        <div className="app-table-scroll">
          <DataTable value={visibleRows} paginator rows={10} stripedRows size="small" dataKey="id">
            <Column field="name" header="Nombre" sortable />
            <Column field="role" header="Rol" sortable body={(e: Employee) => roleLabels[e.role]} />
            <Column
              field="branchId" header="Sede" sortable
              body={(e: Employee) => branchNames.get(e.branchId) ?? 'Sede desconocida'}
            />
            <Column
              field="active" header="Estado" sortable
              body={(e: Employee) => <Tag value={e.active ? 'Activo' : 'Inactivo'} severity={e.active ? 'success' : 'warning'} />}
            />
            <Column
              header="Acciones"
              body={(e: Employee) =>
                canManage ? (
                  <div className="flex gap-1">
                    <Button icon="pi pi-pencil" text rounded aria-label={`Editar ${e.name}`} onClick={() => openEdit(e)} />
                    <Button
                      icon={e.active ? 'pi pi-ban' : 'pi pi-replay'}
                      text
                      rounded
                      severity={e.active ? 'danger' : undefined}
                      aria-label={`${e.active ? 'Desactivar' : 'Reactivar'} ${e.name}`}
                      onClick={() => askToggleActive(e)}
                    />
                  </div>
                ) : null}
            />
          </DataTable>
        </div>
      )}

      <EmployeeFormDialog
        visible={dialogOpen}
        employee={editing}
        branches={branches.data ?? []}
        defaultBranchId={session.branch.id}
        saving={save.isPending}
        errorMessage={formError}
        onSubmit={handleSubmit}
        onHide={() => setDialogOpen(false)}
      />
    </div>
  );
};
