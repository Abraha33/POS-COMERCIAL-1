import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/app/providers/AppProviders';
import { SaleDetailDialog } from '@/features/pos/SaleDetailDialog';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { db, state } from '@/mocks/db';

describe('reimpresión de comprobantes (contrato, sin efectos sobre la venta)', () => {
  it('reimprimir registra una COPIA en el servidor y no altera venta, caja ni stock', async () => {
    setAccessToken(mockTokenForRole('cajero'));
    const sale = db.sales[0]!;
    const salesBefore = JSON.stringify(db.sales);
    const stockBefore = JSON.stringify(db.stockLevels);
    const shiftsBefore = JSON.stringify(db.shifts);
    const print = vi.fn();
    vi.stubGlobal('print', print);
    window.print = print;

    render(
      <AppProviders initialRole="cajero">
        <SaleDetailDialog
          sale={sale} customerName="Cliente" products={new Map()} returnedInSession={{}}
          canOperate onReturn={() => {}} onVoid={() => {}} onHide={() => {}}
        />
      </AppProviders>,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Reimprimir copia' }));

    await waitFor(() => expect(state.reprints.filter((r) => r.saleId === sale.id)).toHaveLength(1));
    expect(await screen.findByTestId('reprint-note')).toHaveTextContent('COPIA 1');
    expect(print).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(db.sales)).toBe(salesBefore);
    expect(JSON.stringify(db.stockLevels)).toBe(stockBefore);
    expect(JSON.stringify(db.shifts)).toBe(shiftsBefore);
  });
});
