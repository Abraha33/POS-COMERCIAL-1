import { useState } from 'react';
import { Button } from 'primereact/button';
import type { Supplier } from '@/shared/contracts';
import { ScreenTemplate, SegmentedTabs, type SegmentOption } from '@/shared/ui';
import { Can } from '@/app/guards/RouteGuard';
import { OrderDetailDialog } from './OrderDetailDialog';
import { OrderFormDialog } from './OrderFormDialog';
import { OrdersTab } from './OrdersTab';
import { SupplierFormDialog } from './SupplierFormDialog';
import { SuppliersTab } from './SuppliersTab';
import './purchases.css';

type Tab = 'orders' | 'suppliers';

const TABS: readonly SegmentOption<Tab>[] = [
  { value: 'orders', label: 'Órdenes' },
  { value: 'suppliers', label: 'Proveedores' },
];

/** Compras (carril C): órdenes de compra, ciclo enviar/recibir y proveedores. Reglas BR-COM-xx: PROPUESTA. */
export const PurchasesPage = () => {
  const [tab, setTab] = useState<Tab>('orders');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const newSupplier = () => { setEditing(null); setSupplierOpen(true); };
  const editSupplier = (s: Supplier) => { setEditing(s); setSupplierOpen(true); };

  const actions = (
    <Can permission="purchases.create">
      {tab === 'orders' ? (
        <Button type="button" label="Nueva orden" icon="pi pi-plus" onClick={() => setCreating(true)} />
      ) : (
        <Button type="button" label="Nuevo proveedor" icon="pi pi-plus" onClick={newSupplier} />
      )}
    </Can>
  );

  return (
    <ScreenTemplate title="Compras" subtitle="Órdenes de compra y proveedores" actions={actions}>
      <div className="purch">
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} ariaLabel="Secciones de compras" variant="tabs" />
        {tab === 'orders' ? (
          <OrdersTab onOpen={setOpenId} onCreate={() => setCreating(true)} />
        ) : (
          <SuppliersTab onEdit={editSupplier} onCreate={newSupplier} />
        )}
      </div>
      <OrderFormDialog
        visible={creating}
        onHide={() => setCreating(false)}
        onCreated={(id) => { setCreating(false); setTab('orders'); setOpenId(id); }}
      />
      <OrderDetailDialog orderId={openId} onHide={() => setOpenId(null)} />
      <SupplierFormDialog visible={supplierOpen} supplier={editing} onHide={() => setSupplierOpen(false)} />
    </ScreenTemplate>
  );
};
