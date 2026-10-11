import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from 'primereact/button';
import {
  ConfirmAction, EmptyState, ErrorState, FormDialog, FormField, KpiCard, MiniBars, MoneyInput, MoneyText,
  PageHeader, SegmentedTabs, ShortcutBar, StatusTag, statusMap,
} from '@/shared/ui';

const meta = { title: 'Shared/Sistema de diseño' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Encabezado: Story = {
  render: () => <PageHeader title="Ventas" subtitle="Listado de todas las ventas" actions={<Button label="Nueva venta" icon="pi pi-plus" />} />,
};

export const Indicadores: Story = {
  render: () => (
    <div className="grid">
      <div className="col-12 md:col-4"><KpiCard label="Ventas del día" icon="pi pi-dollar" value={<MoneyText value={12450000} />} delta={{ text: '+12 % vs. ayer', tone: 'up' }} /></div>
      <div className="col-12 md:col-4"><KpiCard label="Tickets" icon="pi pi-receipt" value={128} /></div>
      <div className="col-12 md:col-4"><KpiCard label="Clientes activos" value={12} proposal hint="Sin fecha de alta en el contrato" /></div>
    </div>
  ),
};

export const Estados: Story = {
  render: () => (
    <div className="app-row">
      {Object.keys(statusMap).map((status) => <StatusTag key={status} status={status} />)}
    </div>
  ),
};

export const Dinero: Story = {
  render: () => {
    const Demo = () => {
      const [value, setValue] = useState<number | null>(170000);
      return (
        <div className="app-stack" style={{ maxWidth: 320 }}>
          <MoneyText value={154700} strong />
          <FormField id="recibido" label="Recibido"><MoneyInput id="recibido" value={value} onChange={setValue} /></FormField>
        </div>
      );
    };
    return <Demo />;
  },
};

export const Vacio: Story = {
  render: () => <EmptyState icon="pi pi-box" title="Aún no hay productos" message="Crea el primero para empezar a vender." action={<Button label="Nuevo producto" icon="pi pi-plus" />} />,
};

export const Error: Story = {
  render: () => <ErrorState error={new globalThis.Error('Sin conexión con el servidor')} onRetry={() => undefined} title="No se pudo cargar" />,
};

export const Atajos: Story = {
  render: () => (
    <ShortcutBar
      summary="4 productos · 14 unidades"
      shortcuts={[{ keys: 'F2', label: 'Buscar' }, { keys: 'F3', label: 'Cliente' }, { keys: 'F8', label: 'Cobrar' }, { keys: 'Esc', label: 'Cancelar' }]}
    />
  ),
};

export const ChipsYPestanas: Story = {
  render: () => {
    const Demo = () => {
      const [chip, setChip] = useState('todos');
      const [tab, setTab] = useState('info');
      return (
        <div className="app-stack">
          <SegmentedTabs ariaLabel="Categoría" value={chip} onChange={setChip}
            options={[{ value: 'todos', label: 'Todos' }, { value: 'her', label: 'Herramientas' }, { value: 'pin', label: 'Pinturas', count: 8 }]} />
          <SegmentedTabs variant="tabs" ariaLabel="Detalle" value={tab} onChange={setTab}
            options={[{ value: 'info', label: 'Información' }, { value: 'items', label: 'Productos' }, { value: 'pagos', label: 'Pagos' }]} />
        </div>
      );
    };
    return <Demo />;
  },
};

export const Grafico: Story = {
  render: () => (
    <MiniBars ariaLabel="Ventas de 7 días" highlight={6} formatValue={(v) => `${Math.round(v / 1000)} k`}
      data={[{ label: 'lun', value: 80000 }, { label: 'mar', value: 120000 }, { label: 'mié', value: 95000 }, { label: 'jue', value: 160000 }, { label: 'vie', value: 140000 }, { label: 'sáb', value: 210000 }, { label: 'dom', value: 175000 }]} />
  ),
};

export const Dialogos: Story = {
  render: () => {
    const Demo = () => {
      const [form, setForm] = useState(false);
      const [confirm, setConfirm] = useState(false);
      return (
        <div className="app-row">
          <Button label="Abrir formulario" onClick={() => setForm(true)} />
          <Button label="Anular venta" severity="danger" outlined onClick={() => setConfirm(true)} />
          <FormDialog visible={form} title="Nuevo cliente" onHide={() => setForm(false)} onSubmit={() => setForm(false)}>
            <FormField id="nombre" label="Nombre"><input id="nombre" className="p-inputtext w-full" /></FormField>
          </FormDialog>
          <ConfirmAction visible={confirm} title="Anular venta" message="La venta quedará anulada y el stock se repone." confirmLabel="Anular" tone="danger"
            onCancel={() => setConfirm(false)} onConfirm={() => setConfirm(false)} />
        </div>
      );
    };
    return <Demo />;
  },
};
