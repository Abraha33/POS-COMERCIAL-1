> DOCUMENTO HISTÓRICO (v0.1.0, 2026-10-12). Este contrato se conserva íntegro para trazabilidad. Sus avisos de «no subido» y «no aprobado» describen su estado al ser redactado. Para las decisiones vigentes consultar `docs/PROJECT-STATE.md` y `docs/decisions/2026-10-12-DECISION-REGISTER.md`. No asumir implementación.

# POS-SALE-FLOW — Contrato de flujo de Venta rápida

**Producto:** ERP/POS Holamigo · **Versión:** 0.1.0 · **Fecha:** 2026-10-12 · **Estado:** BORRADOR PARA VALIDACIÓN (no implementado ni aprobado en repositorio)

## 0. Propósito, límites y dependencias

Este contrato define el flujo de venta desde la apertura de una sesión POS válida hasta el registro de la operación, cobro, documento, pedido vinculado y postventa. No implementa internamente F01 acceso, F02 apertura, F03 turno, F08 pedidos, F09 movimientos, F10 arqueo, F12 autorizaciones o F13 sincronización: los consume mediante interfaces. **Fuente de verdad de pagos, inventario, ventas y documentos:** servicios de dominio/POS Core al integrarse; los mocks son sustitutos marcados y no equivalentes a backend.

**Normas de producto acordadas:** minimizar clics, carrito persistente al cambiar de pantalla, PrimeReact 10.9.9 según auditoría suministrada, cliente sobre carrito, catálogo de alta velocidad, precios por volumen, cobro dinámico en Colombia, entrega programada y gestión de pedidos accesible desde POS. **Pendiente verificar:** contratos reales del frontend más reciente, métodos del backend, reglas 00–07 vigentes, capacidad offline legal/operativa.

## 1. Actores, autorizaciones y precondiciones

- **Cajero:** operar ventas y métodos habilitados dentro del turno/caja/sede asignados.
- **Supervisor:** aprobar solo excepciones acotadas, sin convertirse en el cajero.
- **Administrador:** configurar listas/cuentas/reglas e inspeccionar operaciones según ámbito.
- **Despachador:** consultar y preparar pedidos asignados, no cobrar por defecto.
- **Sistemas externos:** Inventario, Cliente, Pagos, Caja/Turnos, Fiscal, Pedidos, Offline.

Precondiciones de confirmación: `tenantId`, `siteId`, `registerId`, `terminalId`, `cashShiftId`, `cashierId` válidos; turno ABIERTO; permisos; productos y precios validados; política de venta y disponibilidad. El borrador puede crearse localmente solo si la política de operación lo autoriza.

## 2. Agregados y propiedad del estado (propuesta vinculante para diseño, pendiente adaptación al código)

| Agregado | Responsable | Duración | Restricción |
|---|---|---|---|
| `SaleDraft` | `PosSaleSessionStore` / servicio dominio de venta | Sobrevive cambio de ruta/modal; al reanudar se recupera por ID | No alojarlo únicamente en `QuickSale`/`PosPage` |
| `CartLine` | SaleDraft | Vida del borrador | Identidad estable por producto + variante/presentación + UOM + política de precio/descuento |
| `PriceQuote` | PricingService | Versionado; revalidación al confirmar | No hardcodear descuentos por escala ni impuestos |
| `PaymentSession` | Payments domain | Sobrevive cierre de diálogo y cambio de vista | No equipararlo a carrito suspendido |
| `PaymentAttempt` | Payments domain | Historial inmutable de intentos | Cada intento con ID y resultado (incluido INCIERTO) |
| `Sale` | Sales domain | Persistente | No alterar silenciosamente cuando está confirmada |
| `SalesOrder`/`FulfillmentOrder` | Orders domain | Persistente | No facturar/cobrar dos veces pedido ya vinculado |
| `SyncOperation` | Offline domain | Persistencia durable según política | Idempotente, con dependencias y conciliación |

**Regla P0:** los cambios de ruta o apertura de Pedido/Supervisión/Cliente/Historial no deben destruir `SaleDraft` ni `PaymentSession`. Persistir de modo seguro y recuperar estado al remontar. El borrador que tenga intentos de pago no se puede eliminar ni convertir silenciosamente en suspendido sin reglas de cancelación/reconciliación.

### Campos mínimos de contrato (nombres ilustrativos; mapear a tipos actuales)

```ts
type ID = string;
type MoneyMinor = number; // entero COP; no usar floats para aritmética monetaria
interface SaleDraft {
  id: ID; revision: number;
  tenantId: ID; siteId: ID; registerId: ID; terminalId: ID;
  cashShiftId: ID; cashierId: ID;
  customerId?: ID; priceListId?: ID;
  fulfillmentMode: 'immediate' | 'pickup_later' | 'delivery_later';
  lines: CartLine[];
  lifecycle: 'editing' | 'suspended' | 'checkout' | 'payment_pending' | 'completed' | 'cancelled';
  paymentSessionId?: ID;
  orderId?: ID; lastModifiedAt: string;
}
interface CartLine {
  lineId: ID; productId: ID; variantId?: ID; presentationId: ID;
  uomId: ID; quantity: string; // decimal como string, normalizar en servicio
  priceQuoteId?: ID; discountAuthorizationId?: ID;
  notes?: string;
}
interface PaymentAttempt {
  id: ID; paymentSessionId: ID; methodId: ID;
  amountMinor: MoneyMinor;
  status: 'created' | 'awaiting_confirmation' | 'confirmed' | 'rejected' | 'unknown' | 'reversed';
  reference?: string; destinationAccountId?: ID; gatewayTransactionId?: ID;
  idempotencyKey: string;
}
```

Para dinero COP utilizar enteros; cantidades fraccionarias mediante decimal exacto. En un futuro moneda diferente, introducir precisión por moneda; no asumir que el valor minor es una tasa tributaria fija.

## 3. Estados, eventos y transiciones de Venta rápida

**Borrador/carrito:** `editing -> suspended -> editing`; `editing -> checkout`; `checkout -> editing` (sin cobros comprometidos); `checkout -> payment_pending`; `payment_pending -> completed` cuando cobro/deuda autorizada y transacción confirman; `editing/suspended -> cancelled` con reglas. `completed` nunca vuelve a `editing`: devoluciones y ajustes son operaciones nuevas vinculadas.

**Pago individual:** `created -> awaiting_confirmation -> confirmed | rejected | unknown`; `unknown -> confirmed | rejected` solo por consulta/conciliación confiable; reverso según política y evidencia. Una captura/recibo reportado NO confirma transferencia. La acción "reintentar" consulta antes el intento `unknown`.

**Documento fiscal:** estado independiente de venta y de impresión (`not_requested/pending/accepted/rejected/contingency`) según contratos fiscales validados. `printed` no equivale a `accepted`.

**Preparación de pedido:** independiente (`pending/in_progress/verification/ready/delivered`) más incidencias; nunca inferir entrega del simple cobro.

### Tabla de transiciones críticas

| Evento | Precondición | Efecto | Error/control |
|---|---|---|---|
| `START_SALE` | turno apto y política válida | crear/recuperar borrador | caja cerrada: bloquear venta |
| `SCAN/ADD_PRODUCT` | producto/presentación habilitado | agregar/fusionar línea compatible | sin SKU: búsqueda; lectura doble según política |
| `CHANGE_QUANTITY` | cantidad >0 y UOM válida | recomputar precios/escalas | mostrar cambio de precio; no perder edición |
| `SET_CUSTOMER` | cliente válido | asociar y recalcular lista | advertir cambio de totales |
| `APPLY_DISCOUNT` | límite y permiso o aprobación F12 | precio autorizado | aprobación ligada a revisión/importe |
| `SUSPEND_DRAFT` | sin operación financiera comprometida | suspensión durable | pagos abiertos: flujo independiente |
| `RESTORE_DRAFT` | no tomado por otro/consistencia | restaurar y revalidar | cambios de stock/precio visibles |
| `BEGIN_CHECKOUT` | carrito válido, turno vigente | payment session y total congelado/versionado | faltantes, total inválido: bloquear |
| `ADD_PAYMENT_ATTEMPT` | medio habilitado, monto válido | registrar intento | método específico; evitar duplicados |
| `COMPLETE_SALE` | fondos confirmados o crédito autorizado y backend transaccional | venta + efectos integrados/resultado | timeout: estado incierto y consulta por ID |
| `CREATE_ORDER` | cliente/entrega válidos, cantidades/precios | pedido vinculado, con o sin cobro | no duplicar venta ni pedidos |
| `PRINT_RECEIPT` | documento disponible | impresión/estado local | fallo impresión no repite venta |
| `RETURN/EXCHANGE` | venta confirmada y elegible | operación postventa independiente | cantidades no devueltas, permisos, fiscal |

## 4. Recorridos exigidos

**R1 Venta inmediata:** turno abierto → buscar/escanear → agregar y editar cantidades → seleccionar cliente → precio por volumen/validaciones → checkout → pagos confirmados o crédito aprobado → confirmar una sola vez → comprobante → nuevo borrador.

**R2 Venta suspendida:** edición → suspender → atender otro cliente → bandeja suspendidas → recuperar y verificar cambios de precio/stock → continuar. No crear venta/factura/cartera por suspender.

**R3 Transferencia:** seleccionar cuenta empresarial preconfigurada (banco, tipo, titular, número, llave/QR cuando aplique) → mostrar datos de destino → registrar referencia y monto → pendiente de verificación → confirmación confiable o rechazo. No liberar mercancía sin condición aprobada.

**R4 Pago mixto:** varios intentos, cada uno con método y estado → saldo = total vigente − pagos aplicables confirmados; fondos reportados pendientes NO cuentan como confirmados → no duplicar cambio ni registrar cobros dos veces.

**R5 Interrupción checkout:** diálogo cierra, cambia ruta, cliente busca banco, pantalla refresca → se conserva `PaymentSession` con intentos → al volver se reconsulta resultado incierto; no iniciar transacción adicional a ciegas.

**R6 Pedido para después:** desde carrito elegir `pickup_later`/`delivery_later` → cliente, dirección/contacto, fecha/franja, costo de envío y observaciones → crear pedido → opcionalmente cobrar/abonar → transferir al Gestor de Pedidos F08. Un pedido no pagado no se representa como venta liquidada.

**R7 Reutilizar pedido:** abrir pedido existente → cobrar saldo mediante F06 → regresar a pedido con vínculo de pago y preparación intacto. La creación de factura depende del tipo de operación fiscal y sus reglas.

**R8 Posventa:** localizar venta original → seleccionar cantidad elegible para devolución/cambio → autorización, destino de inventario, devolución financiera/documento fiscal → auditoría; sin borrar venta original.

## 5. Prioridad de interfaces y dependencias

- F01/F02/F03: proveen contexto de turno/caja, no una copia editable local.
- Catálogo/Precio: proveedores de SKU, UOM, variantes, listas, vigencias; precio como cotización validada.
- Cliente: búsqueda/CRUD autorizado; direcciones y datos fiscales; cambios pueden variar precio.
- F06: una única fuente para pagos y conciliaciones, incluidas cuentas bancarias definidas en F14.
- F08: dueño de preparación, semáforo, faltantes y entrega; Venta rápida solo crea/vincula/consulta.
- F12: emite autorizaciones de alcance limitado, con versionado/expiración.
- F13: controla autorizaciones offline y cola; no declarar éxito remoto al guardar localmente.
- F10: concilia turno, no elimina pendientes económicos del checkout.

## 6. Respuestas de error y criterios de aceptación

Error estructurado: `code`, `message`, `recoverable`, `operationId`, `fieldErrors?`, `retryAfter?`, `correlationId?`. Categorías: VALIDATION, PERMISSION, CONFLICT, STOCK_CHANGED, PRICE_CHANGED, PAYMENT_REJECTED, PAYMENT_UNKNOWN, SHIFT_INVALID, FISCAL_PENDING, NETWORK_OFFLINE, SERVER_ERROR. No revelar información sensible de bancos ni otros tenants.

**P0:** al pasar de Venta rápida a Pedidos y volver, se conservan exactamente carrito, cliente, cotización y pago vigente; dos clics de confirmar generan una sola operación; un timeout de cobro no dispara una segunda venta; un pago pendiente no se marca confirmado. **P1:** suspensión, modificación por escala, pedido para después, devolución parcial y reimpresión.

## 7. Pendientes de verificación antes de aprobar v1.0

1. Inspeccionar frontend React/Vite/PrimeReact vigente y comprobar origen real de estado de `QuickSale`/`PosPage`.
2. Leer `openapi.yaml`, reglas 00–07 y modelo de venta/caja actuales.
3. Definir política exacta para abonos, crédito y transacciones parciales.
4. Definir coexistencia y restricciones offline por medio de pago y tipo de documento.
5. Validar idempotencia y límites de transacción de Frappe/POS Core.
6. Confirmar el significado exacto de facturar, preparar, despachar y entregar en el negocio.

No marcar el contrato como APROBADO ni reportar implementación productiva hasta cerrar estas verificaciones.