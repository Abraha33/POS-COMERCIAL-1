import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { Branch } from '@/shared/contracts';
import { useBranches } from '@/shared/api/queries';
import { EmptyState, ErrorState, LoadingState, StatusTag } from '@/shared/ui';
import { useSession } from '@/app/providers/SessionProvider';

const sessionItems = (s: ReturnType<typeof useSession>['session']) => [
  { label: 'Empresa', value: s.company.name },
  { label: 'Sede', value: s.branch.name },
  { label: 'Caja', value: s.register.name },
  { label: 'Usuario', value: s.user.name },
];

export const BranchesTab = () => {
  const { session } = useSession();
  const branches = useBranches();

  return (
    <div>
      <p role="note" className="admin__note">
        <strong>Solo lectura:</strong> el contrato de API no incluye escritura de sedes ni de datos de la empresa
        (<strong>PROPUESTA</strong>: requiere contrato).
      </p>

      <h2 className="admin__heading">Sesión actual</h2>
      <dl className="admin__facts" data-testid="session-info">
        {sessionItems(session).map((item) => (
          <div key={item.label} className="admin__fact">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="admin__heading">Sedes</h2>
      {branches.isLoading ? <LoadingState label="Cargando sedes…" /> : null}
      {branches.error ? <ErrorState error={branches.error} onRetry={() => void branches.refetch()} /> : null}
      {branches.data && branches.data.length === 0 ? <EmptyState message="No hay sedes registradas." /> : null}
      {branches.data && branches.data.length > 0 ? (
        <div className="app-table-scroll">
          <DataTable value={branches.data} stripedRows size="small" dataKey="id">
            <Column field="name" header="Sede" sortable />
            <Column
              field="active" header="Estado" sortable
              body={(b: Branch) => <StatusTag status={b.active ? 'active' : 'inactive'} />}
            />
            <Column
              header="En esta sesión"
              body={(b: Branch) => (b.id === session.branch.id ? <StatusTag status="online" label="Sí" /> : 'No')}
            />
          </DataTable>
        </div>
      ) : null}
    </div>
  );
};
