import type { ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { Supplier } from '@/shared/contracts';
import { useSuppliers } from '@/shared/api/queries';
import { EmptyState, ErrorState, LoadingState, StatusTag } from '@/shared/ui';
import { Can } from '@/app/guards/RouteGuard';
import { useIsPhone } from './useIsPhone';

type Props = { onEdit: (supplier: Supplier) => void; onCreate: () => void };

export const SuppliersTab = ({ onEdit, onCreate }: Props) => {
  const suppliers = useSuppliers();
  const phone = useIsPhone();

  const editButton = (s: Supplier) => (
    <Can permission="purchases.create">
      <Button
        type="button" label="Editar" icon="pi pi-pencil" text
        aria-label={`Editar ${s.name}`} onClick={() => onEdit(s)}
      />
    </Can>
  );
  const state = (s: Supplier) => <StatusTag status={s.active ? 'active' : 'inactive'} />;

  let content: ReactNode;
  if (suppliers.isLoading) content = <LoadingState label="Cargando proveedores…" />;
  else if (suppliers.error) content = <ErrorState error={suppliers.error} onRetry={() => void suppliers.refetch()} />;
  else if (!suppliers.data || suppliers.data.length === 0) {
    content = (
      <EmptyState
        icon="pi pi-users"
        title="Aún no hay proveedores"
        message="Agrega el primero para poder crear órdenes de compra."
        action={
          <Can permission="purchases.create">
            <Button type="button" label="Nuevo proveedor" icon="pi pi-plus" onClick={onCreate} />
          </Can>
        }
      />
    );
  } else if (phone) {
    content = (
      <ul className="purch__cards" aria-label="Proveedores">
        {suppliers.data.map((s) => (
          <li key={s.id} className="purch__card">
            <div className="purch__card-head">
              <strong>{s.name}</strong>
              {state(s)}
            </div>
            <p className="purch__card-line purch__hint">Documento {s.taxId}</p>
            {s.phone ? <p className="purch__card-line purch__hint">Tel. {s.phone}</p> : null}
            <div className="purch__card-foot">
              <span>Plazo {s.paymentTermsDays} días</span>
              {editButton(s)}
            </div>
          </li>
        ))}
      </ul>
    );
  } else {
    content = (
      <div className="app-table-scroll">
        <DataTable value={suppliers.data} dataKey="id" paginator rows={10} stripedRows aria-label="Proveedores">
          <Column field="name" header="Nombre" sortable />
          <Column field="taxId" header="Documento" sortable />
          <Column header="Teléfono" body={(s: Supplier) => s.phone ?? '—'} />
          <Column
            field="paymentTermsDays" header="Plazo de pago" sortable
            body={(s: Supplier) => `${s.paymentTermsDays} días`}
          />
          <Column header="Estado" body={state} />
          <Column header="" body={editButton} />
        </DataTable>
      </div>
    );
  }

  return (
    <>
      <p className="purch__hint m-0">El plazo de pago define el vencimiento de la cuenta por pagar al recibir.</p>
      {content}
    </>
  );
};
