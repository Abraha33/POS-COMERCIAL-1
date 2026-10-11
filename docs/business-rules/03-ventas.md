# Ventas (POS)

> Estado: **APROBADA** (ver `00-convenciones.md`).

| ID | Regla |
|----|-------|
| BR-VEN-01 | Una venta pertenece a un **turno de caja abierto** (`shiftId`); sin turno abierto se rechaza (`SHIFT_NOT_OPEN`, 409). |
| BR-VEN-02 | El cliente envía líneas `{productId, quantity, discount}`; el servidor fija `unitPrice` desde el catálogo (BR-GEN-06). |
| BR-VEN-03 | IVA por línea sobre precio con IVA incluido: `base = precio / (1 + tasa)`, con decimales internos; se suma por categoría (gravado, exento, excluido, impoconsumo) y solo el total se redondea (BR-GEN-05). |
| BR-VEN-04 | **Descuentos por rol** (por línea, sobre valor bruto): cajero hasta **5 %**; administrador hasta **15 %** con PIN de supervisor en la pantalla del cajero (`approvalToken`, acción `discount`); propietario libre. Fuera de tope: `DISCOUNT_NOT_ALLOWED` / `APPROVAL_REQUIRED`. (Cajero 0 % o 5 %: A2.) |
| BR-VEN-05 | **Stock:** por defecto se bloquea la venta sin existencias (`STOCK_INSUFFICIENT`). Excepción: PIN de supervisor (acción `negative_stock`); el inventario queda negativo y se genera la alerta "Ajuste de inventario requerido" (BR-INV-02). |
| BR-VEN-06 | **Pago mixto:** `payments` es un arreglo `{method, amount}`. Medios: `efectivo`, `tarjeta`, `transferencia`, `nequi`, `daviplata`, `credito`. La venta se cierra cuando `Σ pagos ≥ total`; el excedente solo se devuelve como cambio **en efectivo** (`PAYMENT_INSUFFICIENT` si no alcanza). |
| BR-VEN-07 | `credito` aplica BR-CLI-02..04 y BR-CLI-06 y genera una cuenta por cobrar a 30 días. |
| BR-VEN-08 | `change = Σ pagos − total`, calculado y devuelto por el servidor. |
| BR-VEN-09 | La venta confirmada descuenta inventario de su sede y registra movimiento `salida` con referencia al número de venta. |
| BR-VEN-10 | Anulación: con turno abierto o permiso `pos.refund`; genera movimiento `entrada` inverso, revierte la cuenta por cobrar y exige `reason`. |
| BR-VEN-11 | **Idempotencia:** `clientOperationId` (UUID v4) = cabecera `Idempotency-Key`. Repetir devuelve la misma venta (200); mismo ID con otro contenido → `IDEMPOTENCY_KEY_REUSED` (409). |
| BR-VEN-12 | La numeración consecutiva la asigna el servidor al confirmar; nunca el cliente. |
| BR-VEN-13 | **Offline:** el POS factura sin conexión y sincroniza en bloque. Con `offline=true` el servidor **acepta la venta aunque no haya stock** (el cliente ya se llevó el producto): inventario negativo y alerta para revisión. `occurredAt` conserva el instante real. |
| BR-VEN-14 | **Ningún descuento deja el precio final por debajo del costo promedio**, salvo autorización explícita del propietario (acción `below_cost`, liquidación). Si no: `PRICE_BELOW_COST` (409). |

Errores: `SHIFT_NOT_OPEN`, `STOCK_INSUFFICIENT`, `CREDIT_LIMIT_EXCEEDED`, `CUSTOMER_BLOCKED_OVERDUE`, `PRODUCT_INACTIVE`,
`PAYMENT_INSUFFICIENT`, `DISCOUNT_NOT_ALLOWED`, `PRICE_BELOW_COST`, `APPROVAL_REQUIRED`, `APPROVAL_INVALID`,
`IDEMPOTENCY_KEY_REUSED`, `VALIDATION_ERROR`.

## Flujo de aprobación de supervisor
`POST /auth/supervisor-approvals {action, pin}` → `approvalToken` de un solo uso y corta vigencia → `SaleCreate.approvalToken`.
El PIN nunca viaja dentro de la venta. Pueden aprobar `admin` y `propietario`; `below_cost` solo `propietario` (A8).
