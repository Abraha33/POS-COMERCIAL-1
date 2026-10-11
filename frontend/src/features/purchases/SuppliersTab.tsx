import { useState, type ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import type { Supplier } from '@/shared/contracts';
import { useSuppliers } from '@/shared/api/queries';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';
import { Can } from '@/app/guards/RouteGuard';
import { SupplierFormDialog } from './SupplierFormDialog';

export const SuppliersTab = () => {
  const suppliers = useSuppliers();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setOpen(true); };

  let content: ReactNode;
  if (suppliers.isLoading) content = <LoadingState label="Cargando proveedores…" />;
  else if (suppliers.error) content = <ErrorState error={suppliers.error} onRetry={() => void suppliers.refetch()} />;
  else if (!suppliers.data || suppliers.data.length === 0) {
    content = <EmptyState message='Aún no hay proveedores. Agrega el primero con "Nuevo proveedor".' />;
  } else {
    content = (
      <div className="app-table-scroll">
        <DataTable value={suppliers.data} dataKey="id" paginator rows={10} size="small" stripedRows aria-label="Proveedores">
          <Column field="name" header="Nombre" sortable />
          <Column field="taxId" header="Documento" sortable />
          <Column
            field="paymentTermsDays" header="Plazo de pago" sortable
            body={(s: Supplier) => `${s.paymentTermsDays} días`}
          />
          <Column
            header="Estado"
            body={(s: Supplier) => <Tag value={s.active ? 'Activo' : 'Inactivo'} severity={s.active ? 'success' : 'warning'} />}
          />
          <Column
            header=""
            body={(s: Supplier) => (
              <Can permission="purchases.create">
                <Button
                  type="button" label="Editar" icon="pi pi-pencil" text size="small"
                  aria-label={`Editar ${s.name}`} onClick={() => openEdit(s)}
                />
              </Can>
            )}
          />
        </DataTable>
      </div>
    );
  }

  return (
    <>
      <div className="purch__bar">
        <span className="purch__hint">El plazo de pago define el vencimiento de la cuenta por pagar al recibir.</span>
        <Can permission="purchases.create">
          <Button type="button" label="Nuevo proveedor" icon="pi pi-plus" onClick={openNew} />
        </Can>
      </div>
      {content}
      <SupplierFormDialog visible={open} supplier={editing} onHide={() => setOpen(false)} />
    </>
  );
};
