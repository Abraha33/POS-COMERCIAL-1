# Ventas (POS)

> Estado: **PROPUESTA — pendiente de aprobación.** Ver `00-convenciones.md`.

| ID | Regla |
|----|-------|
| BR-VEN-01 | Una venta pertenece a un **turno de caja abierto** (`shiftId`); sin turno abierto se rechaza (`SHIFT_NOT_OPEN`, 409). |
| BR-VEN-02 | El cliente envía líneas `{productId, quantity, discount}`; el servidor fija `unitPrice` desde el catálogo (BR-GEN-06). |
| BR-VEN-03 | IVA por línea: si el precio incluye IVA, `impuesto = round(base × taxRate / (1 + taxRate))`. ⚠ |
| BR-VEN-04 | `discount` es un valor en COP por línea, `0 ≤ discount ≤ quantity × unitPrice`. Descuentos sobre un límite exigen permiso (pendiente ⚠). |
| BR-VEN-05 | Stock: si `onHand < quantity` la venta se rechaza (`STOCK_INSUFFICIENT`, 409) salvo que la compañía permita stock negativo ⚠ (por defecto: no). |
| BR-VEN-06 | Medios de pago: `efectivo`, `tarjeta`, `transferencia`, `credito`. Una venta tiene **un** medio de pago por ahora; pago mixto queda abierto ⚠. |
| BR-VEN-07 | `credito` aplica BR-CLI-02..04 y genera una cuenta por cobrar con vencimiento a 30 días ⚠. |
| BR-VEN-08 | Efectivo: `amountTendered ≥ total`; el cambio se calcula en el servidor y se devuelve. |
| BR-VEN-09 | La venta confirmada descuenta inventario y registra movimiento `salida` con referencia al número de venta. |
| BR-VEN-10 | Anulación: solo estando el turno abierto o con permiso `pos.refund`; genera movimiento `entrada` inverso y revierte la cuenta por cobrar. Exige `reason`. |
| BR-VEN-11 | **Idempotencia**: cada venta lleva `clientOperationId` (UUID v4 generado en el cliente) y se envía también como cabecera `Idempotency-Key`. Repetir la misma operación devuelve la **misma** venta (200); mismo ID con otro contenido → `IDEMPOTENCY_KEY_REUSED` (409). |
| BR-VEN-12 | Numeración consecutiva por caja la asigna el servidor al confirmar; nunca el cliente. ⚠ (facturación electrónica DIAN fuera de este alcance). |

## Offline (diseño, no implementado)
El POS puede encolar ventas con su `clientOperationId` y reenviarlas al reconectar. Gracias a BR-VEN-11 reenviar no duplica.
Pendiente decidir: ¿qué hace el servidor si al sincronizar ya no hay stock? (propuesta: aceptar y marcar `STOCK_NEGATIVE` para revisión).

Errores: `SHIFT_NOT_OPEN`, `STOCK_INSUFFICIENT`, `CREDIT_LIMIT_EXCEEDED`, `PRODUCT_INACTIVE`, `IDEMPOTENCY_KEY_REUSED`, `VALIDATION_ERROR`.
