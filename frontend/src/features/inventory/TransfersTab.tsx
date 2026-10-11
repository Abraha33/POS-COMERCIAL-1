import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { Transfer, TransferCreate } from '@/shared/contracts';
import { ApiError } from '@/shared/api/client';
import { useCreateTransfer, useReceiveTransfer, useTransfers } from '@/shared/api/inventory';
import { useStockLevels } from '@/shared/api/queries';
import { StatusTag } from '@/shared/ui';
import { Can } from '@/app/guards/RouteGuard';
import { useNotify } from '@/app/providers/ToastProvider';
import { useSession } from '@/app/providers/SessionProvider';
import { QueryState } from './QueryState';
import { TransferDialog } from './TransferDialog';
import { flowStatusMap, formatDate, useBranchLabel, useProductLookup } from './lookups';
import { useIsMobile } from './useIsMobile';

const createErrorMessage = (e: Error): string => {
  if (e instanceof ApiError && e.code === 'STOCK_INSUFFICIENT') {
    const { available, requested } = e.details ?? {};
    return `Existencias insuficientes en la sede origen${available !== undefined ? ` (disponibles: ${String(available)}, pedidas: ${String(requested)})` : ''}.`;
  }
  if (e instanceof ApiError && e.code === 'FORBIDDEN') return 'Tu rol no puede crear traslados.';
  return e.message;
};

export const TransfersTab = () => {
  const transfers = useTransfers();
  const levels = useStockLevels();
  const create = useCreateTransfer();
  const receive = useReceiveTransfer();
  const notify = useNotify();
  const { session } = useSession();
  const { products, nameOf } = useProductLookup();
  const branchLabel = useBranchLabel();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const branches = useMemo(() => {
    const ids = new Set<string>([session.branch.id]);
    for (const l of levels.data ?? []) ids.add(l.branchId);
    for (const t of transfers.data ?? []) { ids.add(t.fromBranchId); ids.add(t.toBranchId); }
    return [...ids].sort();
  }, [levels.data, transfers.data, session.branch.id]);

  const rows = useMemo(
    () => [...(transfers.data ?? [])].sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [transfers.data],
  );

  const handleCreate = (input: TransferCreate) => {
    setCreateError(null);
    create.mutate(input, {
      onSuccess: (t) => {
        setDialogOpen(false);
        notify({ severity: 'success', summary: 'Traslado enviado', detail: `${t.number}: queda en tránsito hasta que el destino lo reciba.` });
      },
      onError: (e) => setCreateError(createErrorMessage(e)),
    });
  };

  const handleReceive = (t: Transfer) => {
    setReceiveError(null);
    setReceivingId(t.id);
    receive.mutate({ transferId: t.id }, {
      onSuccess: () => notify({ severity: 'success', summary: 'Traslado recibido', detail: `${t.number} ya está en el inventario de ${branchLabel(t.toBranchId)}.` }),
      onError: (e) => {
        if (e instanceof ApiError && e.code === 'FORBIDDEN') {
          setReceiveError(`No puedes recibir ${t.number}: solo el encargado de la sede destino (${branchLabel(t.toBranchId)}) puede confirmar la recepción (BR-INV-04).`);
        } else if (e instanceof ApiError && e.code === 'TRANSFER_ALREADY_RECEIVED') {
          setReceiveError(`${t.number} ya fue recibido; un traslado recibido no se modifica.`);
        } else {
          setReceiveError(e.message);
        }
      },
      onSettled: () => setReceivingId(null),
    });
  };

  const summarize = (t: Transfer): string =>
    t.lines.map((l) => `${nameOf(l.productId)} × ${l.quantity}`).join(', ');

  const route = (t: Transfer): string => `${branchLabel(t.fromBranchId)} → ${branchLabel(t.toBranchId)}`;

  const rowAction = (t: Transfer) =>
    t.status === 'enviado' ? (
      <Can permission="inventory.adjust">
        <Button
          label="Recibir"
          icon="pi pi-download"
          size="small"
          aria-label={`Recibir ${t.number}`}
          loading={receivingId === t.id}
          onClick={() => handleReceive(t)}
        />
      </Can>
    ) : (
      <span className="text-color-secondary">Recibido {t.receivedAt ? formatDate(t.receivedAt) : ''}</span>
    );

  const cards = (
    <ul className="inv-cards" aria-label="Traslados">
      {rows.map((t) => (
        <li key={t.id} className="inv-card">
          <div className="inv-card__head">
            <div>
              <h2 className="inv-card__name">{t.number}</h2>
              <p className="inv-card__meta">{route(t)} · {formatDate(t.sentAt)}</p>
            </div>
            <StatusTag status={t.status} map={flowStatusMap} />
          </div>
          <p className="inv-card__meta">{summarize(t)}</p>
          <div className="inv-card__actions">{rowAction(t)}</div>
        </li>
      ))}
    </ul>
  );

  const table = (
    <div className="app-table-scroll">
      <DataTable value={rows} paginator rows={10} stripedRows size="small" dataKey="id">
        <Column field="number" header="Traslado" sortable />
        <Column header="Origen → destino" body={route} />
        <Column header="Productos" body={summarize} />
        <Column field="sentAt" header="Enviado" sortable body={(t: Transfer) => formatDate(t.sentAt)} />
        <Column
          field="status"
          header="Estado"
          sortable
          body={(t: Transfer) => <StatusTag status={t.status} map={flowStatusMap} />}
        />
        <Column header="Acciones" body={rowAction} />
      </DataTable>
    </div>
  );

  return (
    <>
      <div className="flex justify-content-end mb-3">
        <Can permission="inventory.adjust">
          <Button label="Nuevo traslado" icon="pi pi-plus" onClick={() => { setCreateError(null); setDialogOpen(true); }} />
        </Can>
      </div>
      {receiveError ? (
        <div role="alert" className="app-dialog__error mb-3">
          <i className="pi pi-exclamation-circle mr-2" aria-hidden="true" />
          {receiveError}
        </div>
      ) : null}
      <QueryState
        isLoading={transfers.isLoading}
        error={transfers.error}
        isEmpty={rows.length === 0}
        emptyMessage="Aún no hay traslados. Crea el primero con «Nuevo traslado»."
        onRetry={() => void transfers.refetch()}
      >
        {isMobile ? cards : table}
      </QueryState>
      <TransferDialog
        visible={dialogOpen}
        branches={branches}
        products={products ?? []}
        levels={levels.data ?? []}
        branchLabel={branchLabel}
        defaultFrom={session.branch.id}
        saving={create.isPending}
        serverError={createError}
        onSubmit={handleCreate}
        onHide={() => setDialogOpen(false)}
      />
    </>
  );
};
