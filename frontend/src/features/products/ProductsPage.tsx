import { useMemo, useState, type ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { productInputSchema, type Product, type ProductInput } from '@/shared/contracts';
import { ApiError } from '@/shared/api/client';
import { useProducts, useStockMovements } from '@/shared/api/queries';
import { useHotkey } from '@/shared/keyboard/useHotkey';
import { EmptyState, ErrorState, FormField, LoadingState, ScreenTemplate } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { Can } from '@/app/guards/RouteGuard';
import { useNotify } from '@/app/providers/ToastProvider';
import { useSession } from '@/app/providers/SessionProvider';
import { ProductFormDialog } from './ProductFormDialog';
import { formatRate, matchesQuery, taxCategoryLabels } from './productRules';
import { useSaveProduct } from './useProductMutations';

type StatusFilter = 'todos' | 'activos' | 'inactivos';

/** El esquema de entrada descarta `id`. */
const toInput = (product: Product): ProductInput => productInputSchema.parse(product);

const saveErrorMessage = (e: Error): string => {
  if (e instanceof ApiError && e.code === 'SKU_DUPLICATED') return 'Ya existe un producto con ese SKU.';
  if (e instanceof ApiError && e.code === 'BARCODE_DUPLICATED') return 'Ya existe un producto con ese código de barras.';
  return e.message;
};

export const ProductsPage = () => {
  const { data, isLoading, error, refetch } = useProducts();
  const movements = useStockMovements();
  const save = useSaveProduct();
  const notify = useNotify();
  const { can } = useSession();
  const [editing, setEditing] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todos');

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (product: Product) => { setEditing(product); setDialogOpen(true); };
  useHotkey('F2', openNew, can('products.edit'));

  const rows = useMemo(
    () => (data ?? []).filter((p) => matchesQuery(p, query)
      && (status === 'todos' || (status === 'activos' ? p.active : !p.active))),
    [data, query, status],
  );
  const withMovements = useMemo(() => new Set((movements.data ?? []).map((m) => m.productId)), [movements.data]);

  const handleSubmit = (input: ProductInput) =>
    save.mutate(
      { id: editing?.id, input },
      {
        onSuccess: () => {
          setDialogOpen(false);
          notify({ severity: 'success', summary: 'Producto guardado', detail: input.name });
        },
        onError: (e) => notify({ severity: 'error', summary: 'No se pudo guardar', detail: saveErrorMessage(e) }),
      },
    );

  const toggleActive = (product: Product) =>
    save.mutate(
      { id: product.id, input: { ...toInput(product), active: !product.active } },
      {
        onSuccess: () => notify({
          severity: 'success',
          summary: product.active ? 'Producto desactivado' : 'Producto activado',
          detail: product.name,
        }),
        onError: (e) => notify({ severity: 'error', summary: 'No se pudo cambiar el estado', detail: saveErrorMessage(e) }),
      },
    );

  let content: ReactNode;
  if (isLoading) content = <LoadingState />;
  else if (error) content = <ErrorState error={error} onRetry={() => void refetch()} />;
  else if (!data || data.length === 0) {
    content = <EmptyState message="Aún no hay productos. Crea el primero con «Nuevo producto»." />;
  } else {
    content = (
      <>
        <div className="app-row mb-3" style={{ alignItems: 'flex-end' }}>
          <FormField id="product-search" label="Buscar">
            <span className="p-input-icon-left">
              <i className="pi pi-search" />
              <InputText
                id="product-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, SKU o código de barras"
              />
            </span>
          </FormField>
          <FormField id="product-status" label="Estado">
            <select
              id="product-status"
              className="p-inputtext"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </FormField>
        </div>
        <div className="app-table-scroll">
          <DataTable
            value={rows}
            paginator
            rows={10}
            stripedRows
            size="small"
            dataKey="id"
            emptyMessage="Ningún producto coincide con la búsqueda o el filtro."
          >
            <Column field="sku" header="SKU" sortable />
            <Column field="name" header="Nombre" sortable />
            <Column field="category" header="Categoría" sortable />
            <Column field="price" header="Precio (IVA incl.)" sortable body={(p: Product) => formatMoney(p.price)} />
            <Column
              field="taxCategory"
              header="IVA"
              sortable
              body={(p: Product) => `${taxCategoryLabels[p.taxCategory]} · ${formatRate(p.taxRate)}`}
            />
            <Column
              field="active"
              header="Estado"
              sortable
              body={(p: Product) => <Tag value={p.active ? 'Activo' : 'Inactivo'} severity={p.active ? 'success' : 'warning'} />}
            />
            <Column
              header="Acciones"
              body={(p: Product) => (
                <Can permission="products.edit">
                  <div className="flex gap-1">
                    <Button icon="pi pi-pencil" text rounded aria-label={`Editar ${p.name}`} onClick={() => openEdit(p)} />
                    <Button
                      icon={p.active ? 'pi pi-ban' : 'pi pi-check-circle'}
                      text
                      rounded
                      severity={p.active ? 'warning' : 'success'}
                      aria-label={`${p.active ? 'Desactivar' : 'Activar'} ${p.name}`}
                      disabled={save.isPending}
                      onClick={() => toggleActive(p)}
                    />
                  </div>
                </Can>
              )}
            />
          </DataTable>
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenTemplate
        title="Productos"
        subtitle="Catálogo maestro compartido con POS, inventario y compras"
        actions={
          <Can permission="products.edit">
            <Button label="Nuevo producto (F2)" icon="pi pi-plus" onClick={openNew} />
          </Can>
        }
      >
        {content}
      </ScreenTemplate>
      <ProductFormDialog
        visible={dialogOpen}
        product={editing}
        catalog={data ?? []}
        skuLocked={Boolean(editing && withMovements.has(editing.id))}
        saving={save.isPending}
        onSubmit={handleSubmit}
        onHide={() => setDialogOpen(false)}
      />
    </>
  );
};
