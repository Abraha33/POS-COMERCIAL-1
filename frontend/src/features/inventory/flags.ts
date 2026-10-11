/**
 * Flag local: ajustes y movimientos manuales (PROPUESTA hasta integrar el contrato v0.5.0 en esta rama:
 * `POST /inventory/adjustments` y `POST /inventory/counts`, permiso `inventory.adjust`).
 * Mientras sea `false`, los botones «Movimiento» y «Ajuste» se muestran deshabilitados con la explicación visible.
 * Al integrar v0.5.0: poner `true` y conectar `AdjustmentDialog` (ver docs/qa/requests/ui-inv.md).
 */
export const INVENTORY_ADJUSTMENTS_ENABLED = false;
