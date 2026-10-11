import { TabPanel, TabView } from 'primereact/tabview';
import { ScreenTemplate } from '@/shared/ui';
import { OrdersTab } from './OrdersTab';
import { SuppliersTab } from './SuppliersTab';
import './purchases.css';

/** Compras (carril C): órdenes de compra, ciclo enviar/recibir y proveedores. Reglas BR-COM-xx: PROPUESTA. */
export const PurchasesPage = () => (
  <ScreenTemplate title="Compras" subtitle="Órdenes de compra y proveedores">
    <TabView className="purch-tabs">
      <TabPanel header="Órdenes">
        <OrdersTab />
      </TabPanel>
      <TabPanel header="Proveedores">
        <SuppliersTab />
      </TabPanel>
    </TabView>
  </ScreenTemplate>
);
