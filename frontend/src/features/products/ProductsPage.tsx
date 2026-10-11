import { useMemo, useState, type ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { productInputSchema, type Product, type ProductInput } from '@/shared/contracts';
import { ApiError } from '@/shared/api/client';
import { useProducts, useStockLevels, useStockMovements } from '@/shared/api/queries';
import { useHotkey } from '@/shared/keyboard/useHotkey';
import { EmptyState, ErrorState, FormField, LoadingState, MoneyText, PageHeader, StatusTag } from '@/shared/ui';
import { Can } from '@/app/guards/RouteGuard';
import { useNotify } from '@/app/providers/ToastProvider';
import { useSession } from '@/app/providers/SessionProvider';
import { ProductFormDialog } from './ProductFormDialog';
import { formatRate, matchesQuery, taxCategoryLabels } from './productRules';
import { useIsMobile } from './useIsMobile';
import { useSaveProduct } from './useProductMutations';
import './products.css';

type StatusFilter = 'todos' | 'activos' | 'inactivos';

type Row = Product & { stock: number | null };

/** El esquema de entrada descarta `id`. */
const toInput = (product: Product): ProductInput => productInputSchema.parse(product);

const saveErrorMessage = (e: Error): string => {
  if (e instanceof ApiError && e.code === 'SKU_DUPLICATED') return 'Ya existe un producto con ese SKU.';
  if (e instanceof ApiError && e.code === 'BARCODE_DUPLICATED') return 'Ya existe un producto con ese código de barras.';
  return e.message;
};

const taxText = (p: Product): string => `${taxCategoryLabels[p.taxCategory]} · ${formatRate(p.taxRate)}`;

const stockText = (r: Row): string => (r.stock === null ? '—' : r.stock.toLocaleString('es-CO'));

export const ProductsPage = () => {
  const { data, isLoading, error, refetch } = useProducts();
  const movements = useStockMovements();
  const levels = useStockLevels();
  const save = useSaveProduct();
  const notify = useNotify();
  const { can } = useSession();
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [category, setCategory] = useState('');

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (product: Product) => { setEditing(product); setDialogOpen(true); };
  useHotkey('F2', openNew, can('products.edit'));

  const categories = useMemo(
    () => [...new Set((data ?? []).map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [data],
  );
  const stockByProduct = useMemo(() => {
    if (!levels.data) return null;
    const totals = new Map<string, number>();
    for (const l of levels.data) totals.set(l.productId, (totals.get(l.productId) ?? 0) + l.onHand);
    return totals;
  }, [levels.data]);

  const rows = useMemo<Row[]>(
    () => (data ?? [])
      .filter((p) => matchesQuery(p, query)
        && (status === 'todos' || (status === 'activos' ? p.active : !p.active))
        && (!category || p.category === category))
      .map((p) => ({ ...p, stock: stockByProduct ? (stockByProduct.get(p.id) ?? 0) : null })),
    [data, query, status, category, stockByProduct],
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

  const actions = (p: Product) => (
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
  );

  const cards = rows.length === 0
    ? <EmptyState message="Ningún producto coincide con la búsqueda o el filtro." />
    : (
      <ul className="prd-cards" aria-label="Productos">
        {rows.map((p) => (
          <li key={p.id} className="prd-card">
            <div className="prd-card__head">
              <div>
                <h2 className="prd-card__name">{p.name}</h2>
                <p className="prd-card__meta">{p.sku} · {p.category}</p>
              </div>
              <StatusTag status={p.active ? 'active' : 'inactive'} />
            </div>
            <dl className="prd-card__facts">
              <div><dt>Precio (IVA incl.)</dt><dd><MoneyText value={p.price} strong /></dd></div>
              <div><dt>Stock</dt><dd>{stockText(p)}</dd></div>
              <div><dt>IVA</dt><dd>{taxText(p)}</dd></div>
            </dl>
            <div className="prd-card__actions">{actions(p)}</div>
          </li>
        ))}
      </ul>
    );

  const table = (
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
        <Column field="sku" header="Código" sortable />
        <Column field="name" header="Nombre" sortable />
        <Column field="category" header="Categoría" sortable />
        <Column
          field="price"
          header="Precio (IVA incl.)"
          sortable
          bodyClassName="text-right"
          body={(p: Row) => <MoneyText value={p.price} />}
        />
        <Column field="taxCategory" header="IVA" sortable body={taxText} />
        <Column field="stock" header="Stock" sortable bodyClassName="text-right" body={stockText} />
        <Column
          field="active"
          header="Estado"
          sortable
          body={(p: Row) => <StatusTag status={p.active ? 'active' : 'inactive'} />}
        />
        <Column header="Acciones" body={actions} />
      </DataTable>
    </div>
  );

  let content: ReactNode;
  if (isLoading) content = <LoadingState />;
  else if (error) content = <ErrorState error={error} onRetry={() => void refetch()} />;
  else if (!data || data.length === 0) {
    content = <EmptyState message="Aún no hay productos. Crea el primero con «Nuevo producto»." />;
  } else {
    content = (
      <>
        <div className="prd-toolbar">
          <FormField id="product-search" label="Buscar">
            <span className="p-input-icon-left">
              <i className="pi pi-search" aria-hidden="true" />
              <InputText
                id="product-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, SKU o código de barras"
              />
            </span>
          </FormField>
          <FormField id="product-category" label="Categoría">
            <select
              id="product-category"
              className="p-inputtext w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField id="product-status" label="Estado">
            <select
              id="product-status"
              className="p-inputtext w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </FormField>
        </div>
        {isMobile ? cards : table}
        <p className="text-color-secondary mt-2 mb-0">
          Stock = suma de las existencias de todas las sedes. El detalle por sede está en Inventarios.
        </p>
      </>
    );
  }

  return (
    <>
      <section aria-labelledby="screen-title">
        <PageHeader
          title="Productos"
          subtitle="Catálogo maestro compartido con POS, inventario y compras"
          actions={
            <Can permission="products.edit">
              <Button label="Nuevo producto (F2)" icon="pi pi-plus" onClick={openNew} />
            </Can>
          }
        />
        {content}
      </section>
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
