import type { PurchaseOrder } from '@/shared/contracts';
import type { ApiError } from '@/shared/api/client';
import type { StatusDef } from '@/shared/ui';

export type OrderStatus = PurchaseOrder['status'];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  recibida: 'Recibida',
  cancelada: 'Cancelada',
};

/** Mapa para `StatusTag`: texto + icono + tono (el color nunca es el único canal). */
export const ORDER_STATUS_MAP: Record<OrderStatus, StatusDef> = {
  borrador: { label: 'Borrador', tone: 'warning', icon: 'pi pi-pencil' },
  enviada: { label: 'Enviada', tone: 'info', icon: 'pi pi-send' },
  recibida: { label: 'Recibida', tone: 'success', icon: 'pi pi-check-circle' },
  cancelada: { label: 'Cancelada', tone: 'danger', icon: 'pi pi-times-circle' },
};

export const STATUS_OPTIONS: OrderStatus[] = ['borrador', 'enviada', 'recibida', 'cancelada'];

type Action = 'crear' | 'enviar' | 'recibir' | 'guardar';

/** Mensaje útil por `ApiError.code`; el servidor sigue siendo la autoridad. */
export const explainError = (error: ApiError, action: Action): string => {
  switch (error.code) {
    case 'INVALID_STATE':
      return `La orden cambió de estado y ya no se puede ${action}. Se actualizó la lista. ${error.message}.`;
    case 'FORBIDDEN':
      return `Tu rol no tiene permiso para ${action} órdenes de compra. Pide ayuda a un comprador o administrador.`;
    case 'SUPPLIER_DUPLICATED':
      return 'Ya existe un proveedor con ese documento. Búscalo en la lista y edítalo.';
    case 'VALIDATION_ERROR':
      return `Datos inválidos: ${error.message}`;
    default:
      return error.message;
  }
};
