import { StatusTag, type StatusDef } from '@/shared/ui';
import { statusLabels, type ReceivableStatus } from './ledger';

const map: Record<ReceivableStatus, StatusDef> = {
  vigente: { label: statusLabels.vigente, tone: 'info', icon: 'pi pi-info-circle' },
  'en-gracia': { label: statusLabels['en-gracia'], tone: 'warning', icon: 'pi pi-exclamation-triangle' },
  vencida: { label: statusLabels.vencida, tone: 'danger', icon: 'pi pi-times-circle' },
  pagada: { label: statusLabels.pagada, tone: 'success', icon: 'pi pi-check-circle' },
};

/** Estado de una cuenta por cobrar (Vigente / En gracia / Vencida / Pagada) con icono y, si hay mora, los días. */
export const ReceivableStatusTag = ({ status, lateDays }: { status: ReceivableStatus; lateDays?: number }) => {
  const late = (status === 'vencida' || status === 'en-gracia') && lateDays !== undefined;
  return <StatusTag status={status} map={map} label={late ? `${statusLabels[status]} · ${lateDays} d` : undefined} />;
};
