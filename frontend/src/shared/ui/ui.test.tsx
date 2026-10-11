import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  ConfirmAction, EmptyState, KpiCard, MiniBars, MoneyInput, MoneyText, PageHeader, SegmentedTabs,
  ShortcutBar, StatusTag, parseMoneyInput,
} from '@/shared/ui';

describe('shared/ui', () => {
  it('PageHeader muestra título, subtítulo y acciones', () => {
    render(<PageHeader title="Ventas" subtitle="Listado" actions={<button type="button">Nueva</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Ventas' })).toBeInTheDocument();
    expect(screen.getByText('Listado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva' })).toBeInTheDocument();
  });

  it('KpiCard marca PROPUESTA cuando no hay contrato', () => {
    render(<KpiCard label="Tickets" value={12} proposal delta={{ text: '+8%', tone: 'up' }} />);
    expect(screen.getByText('PROPUESTA')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('+8%')).toBeInTheDocument();
  });

  it('StatusTag traduce estados conocidos y deja pasar los desconocidos', () => {
    render(<><StatusTag status="anulada" /><StatusTag status="raro" /></>);
    expect(screen.getByText('Anulada')).toBeInTheDocument();
    expect(screen.getByText('raro')).toBeInTheDocument();
  });

  it('MoneyText formatea COP entero', () => {
    render(<MoneyText value={154700} />);
    expect(screen.getByText(/154\.700/)).toBeInTheDocument();
  });

  it('parseMoneyInput ignora separadores y devuelve entero', () => {
    expect(parseMoneyInput('$ 1.234.500')).toBe(1234500);
    expect(parseMoneyInput('')).toBeNull();
  });

  it('MoneyInput entrega enteros y los muestra con miles', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [v, setV] = useState<number | null>(null);
      return <MoneyInput aria-label="Recibido" value={v} onChange={setV} />;
    };
    render(<Harness />);
    const input = screen.getByLabelText('Recibido');
    await user.type(input, '170000');
    expect(input).toHaveValue('170.000');
  });

  it('SegmentedTabs chips marca el seleccionado y notifica', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedTabs
        ariaLabel="Categoría" value="a" onChange={onChange}
        options={[{ value: 'a', label: 'Todos' }, { value: 'b', label: 'Pinturas', count: 3 }]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /Pinturas/ }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('SegmentedTabs variante tabs navega con flechas', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedTabs
        ariaLabel="Modo" variant="tabs" value="a" onChange={onChange}
        options={[{ value: 'a', label: 'Uno' }, { value: 'b', label: 'Dos' }]}
      />,
    );
    screen.getByRole('tab', { name: 'Uno' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('ShortcutBar convierte el atajo en botón si hay onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ShortcutBar
        summary="4 productos"
        shortcuts={[{ keys: 'F8', label: 'Cobrar', onSelect }, { keys: 'Esc', label: 'Cancelar' }]}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Cobrar/ }));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.getByText('4 productos')).toBeInTheDocument();
  });

  it('EmptyState conserva data-testid y muestra la acción', () => {
    render(<EmptyState title="Sin productos" message="Crea el primero" action={<button type="button">Nuevo</button>} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeInTheDocument();
  });

  it('ConfirmAction confirma y cancela', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmAction
        visible title="Anular venta" message="¿Seguro?" confirmLabel="Anular" tone="danger"
        onConfirm={onConfirm} onCancel={onCancel}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Anular' }));
    expect(onConfirm).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('MiniBars ofrece tabla equivalente', () => {
    render(<MiniBars ariaLabel="Ventas 7 días" data={[{ label: 'lun', value: 10 }, { label: 'mar', value: 20 }]} />);
    expect(screen.getByRole('row', { name: /mar/ })).toBeInTheDocument();
  });
});
