import { TabPanel, TabView } from 'primereact/tabview';
import { useInventoryAlerts } from '@/shared/api/inventory';
import { ScreenTemplate } from '@/shared/ui';
import { AlertsTab } from './AlertsTab';
import { MovementsTab } from './MovementsTab';
import { StockTab } from './StockTab';
import { TransfersTab } from './TransfersTab';

export const InventoryPage = () => {
  const alerts = useInventoryAlerts();
  const pending = (alerts.data ?? []).filter((a) => !a.resolved).length;

  return (
    <ScreenTemplate title="Inventarios" subtitle="Existencias por sede, kardex, traslados y alertas">
      <TabView>
        <TabPanel header="Existencias">
          <StockTab />
        </TabPanel>
        <TabPanel header="Movimientos">
          <MovementsTab />
        </TabPanel>
        <TabPanel header="Traslados">
          <TransfersTab />
        </TabPanel>
        <TabPanel header={pending > 0 ? `Alertas (${pending})` : 'Alertas'}>
          <AlertsTab />
        </TabPanel>
      </TabView>
    </ScreenTemplate>
  );
};
