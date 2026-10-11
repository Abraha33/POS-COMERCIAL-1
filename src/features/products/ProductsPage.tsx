import { useState } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import type { Product, ProductInput } from '@/shared/contracts';
import { useProducts } from '@/shared/api/queries';
import { useHotkey } from '@/shared/keyboard/useHotkey';
import { DataTablePage, type ColumnDef } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { Can } from '@/app/guards/RouteGuard';
import { useNotify } from '@/app/providers/ToastProvider';
import { useSession } from '@/app/providers/SessionProvider';
import { ProductFormDialog } from './ProductFormDialog';
import { useSaveProduct } from './useProductMutations';

/**
 * Slice de referencia: ruta -> hook de datos -> plantilla de tabla -> formulario -> mutación -> toast.
 * Los demás módulos copian este patrón.
 */
export const ProductsPage = () => {
  const { data, isLoading, error, refetch } = useProducts();
  const save = useSaveProduct();
  const notify = useNotify();
  const { can } = useSession();
  const [editing, setEditing] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (product: Product) => { setEditing(product); setDialogOpen(true); };
  useHotkey('F2', openNew, can('products.edit'));

  const handleSubmit = (input: ProductInput) =>
    save.mutate(
      { id: editing?.id, input },
      {
        onSuccess: () => {
          setDialogOpen(false);
          notify({ severity: 'success', summary: 'Producto guardado', detail: input.name });
        },
        onError: (e) => notify({ severity: 'error', summary: 'No se pudo guardar', detail: e.message }),
      },
    );

  const columns: ColumnDef<Product>[] = [
    { field: 'sku', header: 'SKU' },
    { field: 'name', header: 'Nombre' },
    { field: 'category', header: 'Categoría' },
    { field: 'price', header: 'Precio', body: (p) => formatMoney(p.price) },
    {
      field: 'active', header: 'Estado',
      body: (p) => <Tag value={p.active ? 'Activo' : 'Inactivo'} severity={p.active ? 'success' : 'warning'} />,
    },
    {
      field: 'id', header: '', sortable: false,
      body: (p) => (
        <Can permission="products.edit">
          <Button icon="pi pi-pencil" text rounded aria-label={`Editar ${p.name}`} onClick={() => openEdit(p)} />
        </Can>
      ),
    },
  ];

  return (
    <>
      <DataTablePage
        title="Productos"
        subtitle="Catálogo maestro compartido con POS, inventario y compras"
        actions={
          <Can permission="products.edit">
            <Button label="Nuevo producto (F2)" icon="pi pi-plus" onClick={openNew} />
          </Can>
        }
        rows={data}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        columns={columns}
        searchPlaceholder="Buscar producto…"
      />
      <ProductFormDialog
        visible={dialogOpen}
        product={editing}
        saving={save.isPending}
        onSubmit={handleSubmit}
        onHide={() => setDialogOpen(false)}
      />
    </>
  );
};
