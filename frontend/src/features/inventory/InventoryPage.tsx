import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { useInventoryAlerts } from '@/shared/api/inventory';
import { useProducts, useStockLevels } from '@/shared/api/queries';
import { KpiCard, MoneyText, PageHeader, SegmentedTabs } from '@/shared/ui';
import { Can } from '@/app/guards/RouteGuard';
import { AlertsTab } from './AlertsTab';
import { INVENTORY_ADJUSTMENTS_ENABLED } from './flags';
import { stockState, formatQuantity } from './lookups';
import { MovementsTab } from './MovementsTab';
import { StockTab } from './StockTab';
import { TransfersTab } from './TransfersTab';
import './inventory.css';

type TabId = 'stock' | 'movements' | 'transfers' | 'alerts';

export const InventoryPage = () => {
  const alerts = useInventoryAlerts();
  const levels = useStockLevels();
  const products = useProducts();
  const [tab, setTab] = useState<TabId>('stock');
  const pending = (alerts.data ?? []).filter((a) => !a.resolved).length;

  const kpis = useMemo(() => {
    const cost = new Map((products.data ?? []).map((p) => [p.id, p.cost]));
    let value = 0;
    let low = 0;
    let negative = 0;
    for (const l of levels.data ?? []) {
      const state = stockState(l.onHand, l.minimum);
      if (state === 'negative') negative += 1;
      else if (state === 'low') low += 1;
      value += Math.max(0, l.onHand) * (cost.get(l.productId) ?? 0);
    }
    return { value, low, negative };
  }, [levels.data, products.data]);
  const ready = Boolean(levels.data && products.data);

  return (
    <section aria-labelledby="screen-title">
      <PageHeader
        title="Inventarios"
        subtitle="Existencias por sede, kardex, traslados y alertas"
        actions={
          <Can permission="inventory.adjust">
            <Button
              label="Movimiento"
              icon="pi pi-arrow-right-arrow-left"
              outlined
              disabled={!INVENTORY_ADJUSTMENTS_ENABLED}
            />
            <Button label="Ajuste" icon="pi pi-sliders-h" disabled={!INVENTORY_ADJUSTMENTS_ENABLED} />
          </Can>
        }
      />
      {INVENTORY_ADJUSTMENTS_ENABLED ? null : (
        <Can permission="inventory.adjust">
          <p className="inv-note" role="note">
            <strong>PROPUESTA:</strong> «Movimiento» y «Ajuste» se habilitan al integrar el contrato v0.5.0 de ajustes y conteos.
          </p>
        </Can>
      )}
      <div className="inv-kpis">
        <KpiCard
          label="Valor del inventario"
          icon="pi pi-wallet"
          value={ready ? <MoneyText value={kpis.value} /> : '—'}
          hint="Existencias positivas × costo promedio"
          proposal
        />
        <KpiCard
          label="Bajo mínimo"
          icon="pi pi-arrow-down"
          value={ready ? formatQuantity(kpis.low) : '—'}
          hint="Existencias por debajo del mínimo"
        />
        <KpiCard
          label="Negativos"
          icon="pi pi-exclamation-triangle"
          value={ready ? formatQuantity(kpis.negative) : '—'}
          hint="Piden ajuste de inventario"
        />
      </div>
      <SegmentedTabs<TabId>
        variant="tabs"
        ariaLabel="Secciones de inventario"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'stock', label: 'Existencias' },
          { value: 'movements', label: 'Movimientos' },
          { value: 'transfers', label: 'Traslados' },
          { value: 'alerts', label: 'Alertas', count: pending > 0 ? pending : undefined },
        ]}
      />
      <div className="inv-panel" role="tabpanel">
        {tab === 'stock' ? <StockTab /> : null}
        {tab === 'movements' ? <MovementsTab /> : null}
        {tab === 'transfers' ? <TransfersTab /> : null}
        {tab === 'alerts' ? <AlertsTab /> : null}
      </div>
    </section>
  );
};
