> DOCUMENTO HISTÓRICO (v0.1.0, 2026-10-12). Este contrato se conserva íntegro para trazabilidad. Sus avisos de «no subido» y «no aprobado» describen su estado al ser redactado. Para las decisiones vigentes consultar `docs/PROJECT-STATE.md` y `docs/decisions/2026-10-12-DECISION-REGISTER.md`. No asumir implementación.

# POS-SALE-COMPONENTS — Contratos de componentes funcionales

**Versión:** 0.1.0 · **Estado:** BORRADOR PARA VALIDACIÓN

## 1. Criterio de construcción

PrimeReact proporciona primitivos (InputText, AutoComplete, DataTable, Dialog, Button, Dropdown/Select según API instalada, Tag, Toast, Sidebar/Drawer según versión, InputNumber, etc.). No duplicarlos como átomos propios. Usar wrappers **solo para semántica POS**: precios, cantidad, contextualización de clientes y estados de cobro. Reutilizar `ScreenTemplate`, `FormField`, `FormDialog`, `DataTablePage` si están realmente presentes en la rama nueva.

Cada componente funcional tiene `props` tipadas, `events` tipados, estados UI, permisos y pruebas. **No llamar directamente al backend desde componentes presentacionales**; el contenedor/store despacha comandos mediante servicios.

## 2. Catálogo y producto

| Componente | Props de entrada | Eventos emitidos | Estados |
|---|---|---|---|
| `ProductSearch` | `query`, `results`, `isLoading`, `searchMode`, `selectedIndex` | `queryChanged`, `scanDetected`, `selectResult`, `clear` | idle/loading/no-results/error |
| `CatalogFilters` | filtros disponibles, seleccionados, permisos | `filtersChanged`, `clearFilters` | collapsed/expanded/disabled |
| `ProductResultRow` | producto, disponibilidad, presentación, precio aplicable | `add`, `openDetails` | normal/no-stock/restricted |
| `ProductDetailPanel` | producto, variantes, UOM, existencias, escalas, permisos | `selectVariant`, `selectUom`, `changeQty`, `addToCart` | loading/ready/unavailable/error |
| `VolumePriceTable` | escalas vigentes y UOM comparable, cantidad activa | `selectQuantity` (opcional) | no-tiers/tiers/invalid |

**Regla de búsqueda:** SKU/código exacto cuando existe coincidencia única; si hay presentaciones/variantes ambiguas, pedir selección; Enter y escáner no generan doble adición. La tabla de precios muestra precio actual y rango, con cálculo autoritativo de PricingService.

## 3. Cliente y carrito

| Componente | Props | Eventos | Restricciones |
|---|---|---|---|
| `CustomerContextBar` | `customer`, `priceList`, `creditSummary?`, permisos | `find`, `create`, `edit`, `removeSelection` | siempre encima de carrito |
| `CustomerQuickDialog` | cliente, `mode`, reglas de datos fiscales, errores | `save`, `cancel`, `deactivate` | validación; no borrado destructivo de cliente vinculado |
| `CartLineRow` | línea + precio/autorización/stock | `setQty`, `remove`, `openDetail`, `requestDiscount` | no redondear fracciones arbitrariamente |
| `CartLineList` | líneas, foco, bloqueos | `lineSelected`, `reorder?` | scroll independiente |
| `CartOperations` | `draftLifecycle`, permisos, cambios sin guardar | `suspend`, `reset`, `duplicate`, `restore` | deshabilitar reset no seguro si hay pagos |
| `SaleTotals` | desglose calculado, saldo, descuentos, cargos | `openTaxDetails?` | solo visual, no recalcula normas de negocio |
| `SaleFinalizationActions` | `canCharge`, `canCreateOrder`, total, bloqueo | `startCheckout`, `startOrder` | ambos CTA visibles; uno bloqueado explica por qué |

## 4. Cobro, cuentas y operaciones pendientes

| Componente | Props | Eventos | Control |
|---|---|---|---|
| `CheckoutDialog` | snapshot venta, sesión de pago, balance, restricciones | `selectMethod`, `addAttempt`, `close` | no perder sesión al cerrar |
| `PaymentMethodSelector` | métodos configurados por caja/empresa | `select` | solo métodos disponibles |
| `CashPaymentForm` | total/saldo, recibido | `amountChanged`, `confirm` | cambio visible, validación |
| `BankTransferDetails` | cuentas autorizadas, titular, banco, número/llave/QR habilitados | `selectDestination`, `copyAccount`, `submitReference` | nunca capturar confirmación por imagen |
| `CardPaymentForm` | terminal/procesador, monto, estado | `initiate`, `queryStatus` | no simular confirmación del gateway |
| `MixedPaymentsList` | intentos por medio, confirmado/pending/rechazado | `addAttempt`, `removeUncommitted` | sumatoria consistente, inmutabilidad de confirmados |
| `CreditValidationPanel` | cliente/cupo/permiso | `requestAuthorization`, `confirmCredit` | backend decide elegibilidad |
| `PendingOperationsPanel` | borradores, pagos a verificar, operaciones inciertas | `resume`, `inspect`, `queryRemote` | estados independientes |
| `ReceiptActions` | documento, estado, impresoras | `print`, `reprint`, `share` | reimprimir no recrea venta |

## 5. Pedido y autorizaciones conectadas

| Componente | Props | Eventos | Restricción |
|---|---|---|---|
| `ScheduledDeliveryPanel` | cliente, dirección, fecha/franja, tarifa, notas, pedido | `saveDraft`, `createOrder`, `cancel` | ningún pedido confirmado sin datos exigibles |
| `OrdersQuickAccess` | contadores de tareas, permisos | `openOrders`, `openOrder(id)` | no montar gestor entero en carrito |
| `AuthorizationRequestDialog` | operación, importe, motivo, versión del draft | `submit`, `cancel` | autorización puntual, caduca ante cambios |
| `ConnectivityIndicator` | red, backend reachability, cola | `openSyncPanel` | color + texto, no afirmar sincronizado por navigator.onLine |

## 6. Contratos de comunicación propuestos

```ts
type Result<T> = {ok: true; value: T} | {ok: false; error: {code:string; message:string; recoverable:boolean}};
interface SaleCommands {
  addLine(request: {draftId:string; productId:string; presentationId:string; quantity:string}): Promise<Result<{draftRevision:number}>>;
  changeQuantity(request: {draftId:string; lineId:string; quantity:string; expectedRevision:number}): Promise<Result<{draftRevision:number}>>;
  setCustomer(request: {draftId:string; customerId?:string; expectedRevision:number}): Promise<Result<{draftRevision:number}>>;
  suspend(draftId:string): Promise<Result<{suspendedId:string}>>;
  recover(suspendedId:string): Promise<Result<{draftId:string}>>;
  beginCheckout(draftId:string): Promise<Result<{paymentSessionId:string}>>;
  createOrder(request: {draftId:string; mode:'pickup_later'|'delivery_later'; addressId?:string; slotId?:string}): Promise<Result<{orderId:string}>>;
}
```

Estas firmas son **interfaces objetivo**, no endpoints verificados; el integrador debe adaptarlas al dominio y `openapi.yaml` reales. Introducir `AbortSignal`, compatibilidad de revisión, idempotencia y contexto de tenant en servicio cuando corresponda; no exponer secretos en props.

## 7. Test contract por componente

- Render sin datos, datos grandes, error de red, precios cambiados.
- Entrada teclado/lector, doble escaneo y Enter repetido.
- Change quantity precisa y regla de nivel de precios.
- Cambio de cliente actualiza cotización sin perder líneas.
- Cerrar modal de pago con `unknown`: el estado financiero sigue disponible.
- Accesos restringidos no disponibles sin permiso; **además** backend rechaza llamadas no autorizadas.
- Revisiones de accesibilidad (nombres, foco, roles y teclado) y responsive.

## 8. Pendientes

Localizar componentes realmente disponibles en PrimeReact frontend, determinar nombre de Dialog/Drawer exacto y reutilización con `ScreenTemplate`, comprobar si hay diálogos de pagos duplicados. No crear implementaciones contradictorias antes de congelar interfaces con integrador.