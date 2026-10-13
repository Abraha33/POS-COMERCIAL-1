# UI-POS — Venta rápida F01–F06 y autorizaciones F12

**Etapa 2. Contrato de interfaz ACTUALIZADO derivado** de [Venta rápida](../../pos/SALE-UX-CHECKOUT.md), [POS F01–F14](../../pos/FLOWS-F01-F14.md), [F-FIN](../../finance/F-FIN-ENTERPRISE-V1.md). Los siete documentos POS-SALE v0.1 de `docs/pos-proofs/v0.1` se conservan intactos **como historia**, sin pretender que están aprobados ni actualizados. **Excluye** nuevos flujos PED/F08 y F13 Offline.

## FLOW
1. F01: usuario entra, contexto de empresa/sede/caja/terminal/turno/rol confirmado; se establece autoridad para operar.
2. F02/F03: responsable abre caja con fondo por denominaciones; cambio turno/custodia bajo autorización y sin cerrar venta en cobro silenciosamente.
3. F04: código de barra/SKU/nombre/atributos existentes → resultado resumido → ficha detallada cuando hace falta variante/presentación → precio válido/UOM/cliente → carrito.
4. F05: suspender borrador sin pagos comprometidos, recuperar después con revisión de precio/stock. **Cobro iniciado y venta suspendida son estados distintos**.
5. F06: crear PaymentSession durable → N PaymentAttempt por medio e importe, incluso transferencias repetidas → verificación real/fotos múltiples/UNKNOWN separado → confirmar venta única → fiscal/entrega/impresión independientes.
6. F12: permisos contextuales para precio excepcional, crédito, transferencia, reembolso y gastos; supervisor aprueba snapshot específico, no botón genérico.

## SCREEN
- Header informa empresa/sede/caja/cajero/turno/conectividad/alertas. No guarda borrador ni ejecuta cobros.
- Navegación principal enfocada Venta / Suspendidas / Cobros pendientes / Mi turno y accesos autorizados complementarios; **PED/F08 fuera del paquete**, conservar navegación existente sin rediseñar Pedidos.
- Dos regiones predominantes: izquierda `ProductExplorer` con buscador principal, filtros y resultados compactos; derecha `CustomerContext` **sobre** `CartLineList` + `SaleTotals` + acciones del carro.
- Panel contextual: ficha producto con UOM, escala volumen, precio de cliente, impuestos y stock; no multiplicar screens.
- Cobro en diálogo/workspace protegido: medios por banco/efectivo/Nequi/Daviplata/Bre-B/tarjeta/crédito, cada método muestra solamente datos apropiados.
- Evidencia captura varias fotos con preview/retake y envío a verificador autorizado; administrador desde móvil tiene bandeja de verificación distinta.
- Bandejas Suspendidas vs Cobros pendientes claramente separadas; no reanudar PaymentSession como borrador libre.

## TEMPLATE
- `PosOperationalShell` con Header/Navigation/FeatureWorkspace/OverlayHost único.
- `SaleTwoPaneWorkbench` con `catalogSlot`, `customerSlot`, `cartSlot`, `totalsSlot`, `actionSlot`.
- `CheckoutSessionWorkbench` con `paymentLegsSlot`, `evidenceSlot`, `verificationSlot`, `outcomeSlot`; estado propiedad de dominio.
- `SuspendedSalesList` para drafts pausados; `PendingChargesList` para PaymentSession aún no resuelta.

## COMPONENTS
- `ProductSearch(query)` → select/addExact; `CatalogFilters(facets)` → filter.
- `ProductResultRow(product,quote,available)` → add/detail.
- `ProductDetailPanel(variants,uom,quantity,pricingTrace)` → addWithQuote.
- `CustomerContextBar(customer,creditEligibility)` → search/create/edit.
- `CartLineRow(line,uom,priceRules)` → qty/change/remove.
- `SaleTotals(net,discount,tax,paidConfirmed,pending,unallocated)` → inspect.
- `PaymentLegEditor(method,amount,destination,status)` → create/verify/retrySafe.
- `EvidenceCaptureQueue(attemptId,photos)` → capture/review/retake/submit.
- `CashierAuthorizationRequest(action,limits,snapshot)` → requestSupervisor.
- `SaleOutcomePanel(fiscal,documentDelivery,printJob,fulfillmentRef?)` → printSameDoc/query.
Candidatos visuales PrimeReact solo si existen en versión vigente. **Props/eventos son lógicos**: no código.

## RESPONSIVE
- 1366 px: catálogo y carrito visibles; cliente sobre carrito, totales y CTA fáciles de acceder.
- 768 px: catálogo principal, carrito en panel accesible sin pérdida de foco ni borrador; detalles producto en drawer.
- 375 px: búsqueda/escáner prominente, carrito separado en vista contextual, barra de total+Cobrar y cobro de pantalla completa cuando proceda; botones táctiles y sin desbordes globales.
- Al cambiar viewport o cerrar diálogo, `SaleDraft`/`PaymentSession` persisten y se recuperan por ID/revisión; cualquier monto de total proviene del servicio.

## ACCESSIBILITY
- Flujo completo navegable con teclado y lector de código, foco único, no doble agregado por Enter/scan.
- Importe por medio, confirmado/pendiente/rechazado/UNKNOWN expuestos en texto, además de color.
- Fotos: controles "Tomar", "Repetir", "Aceptar foto", "Enviar a verificar"; aceptar foto NO confirma pago.
- Diálogo conserva foco/restaura foco sin destruir PaymentSession; permiso denegado y ajustes anuncian causa con texto.
- Impresión fallida permite nueva impresión del mismo documento sin emitir otra factura.
- WCAG 2.2 AA objetivo pendiente de pruebas; no afirmar conformidad por contrato escrito.

## Error/carga/recuperación
Loading productos/precios, cero resultados, sin precio, stock insuficiente, cliente duplicado, scanner SKU ambiguo; cobro pendiente de verificación bancaria, datáfono rechazado o UNKNOWN, pérdida respuesta HTTP, fiscal rechazado, impresora desconectada, sin autorización de supervisor. El flujo nunca descarta un intento pendiente o confirmado al cerrar diálogo, navegar o cambiar turno. Pedidos/Offline son dependencia externa, no implementados aquí.
