import { StatusTag, type StatusDef } from '@/shared/ui';
import { statusLabels, type PayableStatus } from './ledger';

const map: Record<PayableStatus, StatusDef> = {
  vigente: { label: statusLabels.vigente, tone: 'info', icon: 'pi pi-info-circle' },
  proxima: { label: statusLabels.proxima, tone: 'warning', icon: 'pi pi-exclamation-triangle' },
  vencida: { label: statusLabels.vencida, tone: 'danger', icon: 'pi pi-times-circle' },
  pagada: { label: statusLabels.pagada, tone: 'success', icon: 'pi pi-check-circle' },
};

/** Estado de una cuenta por pagar; `daysLeft` negativo = días de vencida. */
export const PayableStatusTag = ({ status, daysLeft }: { status: PayableStatus; daysLeft: number }) => {
  let label: string | undefined;
  if (status === 'proxima') label = `${statusLabels.proxima} · ${daysLeft} d`;
  else if (status === 'vencida') label = `${statusLabels.vencida} · ${-daysLeft} d`;
  return <StatusTag status={status} map={map} label={label} />;
};
