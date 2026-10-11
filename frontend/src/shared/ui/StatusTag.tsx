export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type StatusDef = { label: string; tone: StatusTone; icon: string };

const icons: Record<StatusTone, string> = {
  success: 'pi pi-check-circle',
  warning: 'pi pi-exclamation-triangle',
  danger: 'pi pi-times-circle',
  info: 'pi pi-info-circle',
  neutral: 'pi pi-minus-circle',
};

const def = (label: string, tone: StatusTone): StatusDef => ({ label, tone, icon: icons[tone] });

/**
 * Mapa estado → etiqueta/tono/icono. Claves = valores de los contratos (sale.status, shift.status…) más los
 * estados de las maquetas. El color nunca es el único canal: siempre hay icono y texto.
 */
export const statusMap: Record<string, StatusDef> = {
  pagada: def('Pagada', 'success'),
  completada: def('Completada', 'success'),
  credito: def('A crédito', 'info'),
  anulada: def('Anulada', 'danger'),
  devuelta: def('Devuelta', 'warning'),
  open: def('Abierto', 'success'),
  closed: def('Cerrado', 'neutral'),
  active: def('Activo', 'success'),
  inactive: def('Inactivo', 'neutral'),
  pending: def('Pendiente', 'warning'),
  overdue: def('Vencido', 'danger'),
  paid: def('Al día', 'success'),
  received: def('Recibida', 'success'),
  in_transit: def('En tránsito', 'info'),
  normal: def('Normal', 'success'),
  low_stock: def('Bajo stock', 'warning'),
  out_of_stock: def('Agotado', 'danger'),
  online: def('En línea', 'success'),
  offline: def('Sin conexión', 'danger'),
};

export type StatusTagProps = {
  status: string;
  /** Mapa propio que se combina sobre `statusMap` (p. ej. estados de órdenes de compra de un módulo). */
  map?: Record<string, StatusDef>;
  /** Fuerza otra etiqueta manteniendo tono e icono. */
  label?: string;
};

/** Etiqueta de estado accesible (AA): texto + icono + color. Estado desconocido → neutro con el valor tal cual. */
export const StatusTag = ({ status, map, label }: StatusTagProps) => {
  const found = map?.[status] ?? statusMap[status] ?? def(status, 'neutral');
  return (
    <span className={`app-status app-status--${found.tone}`} data-status={status}>
      <i className={found.icon} aria-hidden="true" />
      {label ?? found.label}
    </span>
  );
};
