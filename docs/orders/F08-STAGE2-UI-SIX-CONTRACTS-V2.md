# F08 — Etapa 2: seis contratos UI (gestor omnicanal liviano)

**Estado:** especificación UI v2, NO componentes implementados. **Fuente funcional:** [F08 etapa 1](F08-STAGE1-OPERATING-FLOW-V2.md). **Biblioteca objetivo:** PrimeReact compatible con stack React/TS/Vite, versión a verificar en árbol frontend real. Reutilizar [foundation UI previa](../contracts-v1/02-ui/UI-FOUNDATION-SIX-CONTRACTS.md) como principios compartidos sin alterar el paquete anterior (que excluía F08). **Referencia visual seleccionada por usuario:** https://dribbble.com/shots/27138932-E-commerce-Seller-Order-Sales-Management-Mobile-App (minimalismo, tarjetas compactas, contrastes, lectura móvil y CTA claros; adaptar al trabajo del despachador, no copiar panel analítico).

## 1. FLOW — Interacciones por resultado y persona autorizada
| Flujo | Persona/permiso al ejecutar | Interacción mínima visible | Excepciones sin burocracia |
|---|---|---|---|
| PED-01 Ingreso | `order.intake` o adaptador canal | Pedido entra automático por integración habilitada o se captura manual breve; mostrar origen y versión aceptada | Falta SKU/cliente → tarjeta "Por confirmar", no crear datos |
| PED-02 Priorizar | Motor configurado, `order.override` para urgencia manual | Ordenar por vencimiento/riesgo/pago; filtro urgentes, mostrar causa de prioridad | Cambios de prioridad auditados sin paneles invasivos |
| PED-03 Vista semáforo | `order.view` scope | Bandeja con estado de preparación, pago en etiqueta separada, indicador faltante/urgencia y progreso | Sin pedidos/usuario sin permiso/resultado desactualizado |
| PED-04 Tomar tarea | `order.pick` + asignación o permiso de autoservicio | "Empezar/Continuar"; responsable visible | Carrera dos preparadores: uno confirmado, otro ve actualización |
| PED-05 Picking/faltante | `order.pick`, `order.markMissing` | Línea muestra solicitado, recogido, por preparar, bodega/zona y stock fechado. "Tomé N" / "**No encontré**". Continúa con otros artículos | Faltante con stock registrado → no mentir; incidente creado automáticamente |
| PED-05A Resolver faltante | `order.sourceView/sourceDecide/buyAssign` | Una bandeja "Faltantes" y búsqueda de otra bodega/proveedor. Llamar/contactar, seleccionar opción y asignar comprador | "No había" → vuelve a buscando, mantener dinero/intent history |
| PED-05B Entregar fondos | `cash.disburseApprove/HandOver` | Ver monto/portador/origen → "Autorizar/Entregar"; renderizar solo si hay dinero requerido | Sin saldo/permisos, monto alterado, custodia pendiente |
| PED-05C Comprar/recibir | `order.buyExecute` / `order.receive` | Comprador: "No conseguí" o "Comprado/En camino"; receptor: cantidad correcta/dañada y "Recibido" | Precio distinto, parcial, cambio, falta devolución dinero |
| PED-06 Verificar | `order.verify` | Confirmar coincidencia de SKU+variante+UOM+cantidad/condición; CTA "Listo" solo si corresponde | Error = incidencia corta/corregir, no marcar completo falso |
| PED-07 Despachar/entregar | `order.dispatch/deliveryConfirm` | Un CTA contextual entrega/retira con actor, hora y prueba mínima conforme política | Parcial según aceptación cliente, rechazo, entrega por tercero |
| PED-08 Editar/cancelar | `order.override` + capacidad de F07/F06 según efecto | Acciones ocultas al preparador no autorizado; mostrar resumen de afectaciones | Pagos/fiscal/stock publicados → eventos correctivos, no borrados |

Regla UX transversal: **no más de una acción primaria por contexto de tarea**. La autorización específica es comprobada por servidor; un mismo empleado puede ver diferentes acciones hoy y mañana, y el UI debe reflejar vigencia sin requerir cambiar nombre de cargo.

## 2. SCREEN — Mapa de pantallas y regiones (solo 3 espacios + overlays)
**Pantalla A — Bandeja de pedidos** (home F08)
- Header compacto: empresa/sede, usuario, turno cuando aplique, estado de carga, búsqueda.
- Filtros rápidos: `Todos`, `Pendientes`, `Preparando`, `Faltantes`, `Listos`, `Entregados`; chips de origen y urgencia, no todos los filtros visibles a la vez.
- Cards/filas densas: `#pedido`, cliente, canal de origen, hora/fecha prometida, progreso **unidades/líneas** con significado explícito, estado preparación, pago en indicador separado, faltantes, responsable.
- Orden predeterminado explicable, botón principal "Continuar" / "Preparar" / "Ver".
- No ocupar primer viewport con métricas financieras de ecommerce; resumen máximo 3–4 contadores operativos visibles si aportan decisión (pendientes, faltantes, listos, urgentes).

**Pantalla B — Preparar / Verificar pedido**
- Cabecera con ID, prioridad, hora promesa, cliente + instrucciones confirmadas, botón "Volver" sin perder cambios.
- Línea de producto: título, SKU/variante/UOM, solicitada, preparada, faltante/pendiente, **bodegas y zonas** con dato oficial/ubicación probable y última actualización.
- Dos acciones habituales: `Tomé N` (o + y escaneo) y `No encontré`. Acciones no autorizadas ocultas/denegadas.
- Mini resumen fijo de cantidades y alertas, no operaciones bancarias o proveedores en zona del preparador.
- Sección verificación sólo si permiso: controlar líneas y estado final, fotos opcionales según política, corregir error, marcar listo/despachar.

**Pantalla C — Resolver faltantes / Abastecimiento**
- Acceso únicamente autorizado; cola por urgencia y pedidos afectados.
- Ficha faltante con SKU, variante, cantidad, bodegas disponibles y ubicaciones/frescura, opciones de proveedores locales/microapp si conectada (con fuente y disponibilidad **no verificada** claramente marcada).
- CTA contextual "**Llamar/Contactar**", "**Asignar compra**", "**Autorizar y entregar dinero**" solo para personas con permiso; comprador ve "**Comprado/En camino**" o "**No había**"; receptor ve "**Recibí N**".
- Intentos anteriores aparecen plegados en historial, no como formulario adicional. No obligar al resolutor a cotizar con 3 proveedores ni llenar una solicitud formal cuando no se requiera.
- Si varias tareas podrían compartir compra, mostrar "Faltantes relacionados" y riesgo de duplicación. Estado del dinero visible **solo al autorizado**.

**Overlays reutilizables:** seleccionar ubicación alterna, capturar cantidad, elegir proveedor/contacto, asignar persona, entregar/confirmar dinero, registrar recepción/soporte opcional, aceptación cliente, corrección/reintento seguro, detalles/ auditoría. Evitar diálogos anidados; el overlay jamás es dueño único de un pedido en progreso.

## 3. TEMPLATE — Composición, slots, propiedad del estado
- `OrdersOperationalShell`: reutiliza ContextHeader, ActionToolbar, OverlayHost y rutas existentes POS.
- `OrderQueueTemplate`: `filtersSlot`, `cardsSlot`, `urgencySlot`, `emptySlot`, `quickDetailSlot`; lista virtualizada/paginada si requiere.
- `PickingWorkbench`: `orderHeaderSlot`, `itemsSlot`, `locationSlot`, `progressSlot`, `contextActionSlot`, `incidentsSlot`; progreso no se pierde al cerrar diálogo.
- `ShortageResolutionWorkbench`: `shortageQueueSlot`, `stockSlot`, `sourceCandidatesSlot`, `authorizedActionSlot`, `moneyStatusSlot`, `attemptHistorySlot`.
- `OrderVerificationTemplate`: `acceptedSpecSlot`, `actualPackedSlot`, `exceptionsSlot`, `confirmSlot`; no inventar segunda venta o descuento de stock.
- Los templates **no cambian fuente de verdad de pedidos**, ni permisos, ni ejecutan contabilidad; estado remoto mediante query y operaciones por comando idempotente, drafts de captura por ID/revisión.
- No crear template global de e-commerce analytics para despacho; componentes reutilizan PrimeReact, tarjetas con densidad configurable, layout consistente móvil/tablet/desktop.

## 4. COMPONENTS — Contratos conceptuales
| Componente de dominio (propuesto) | Props/datos esenciales | Eventos de usuario | Estados y cardinalidad |
|---|---|---|---|
| `OrderQueueCard` | id, cliente, origen, promisedAt, stage, priorityReason, paymentBadge, progress, missingCount | open/take/continue | 1 por pedido; puede estar stale/urgent/blocked |
| `OrderStageLabel` | stage, label, icon, optional incidentCount | inspect | stage ≠ paid/urgency; texto obligatorio |
| `OrderItemPickRow` | lineId, acceptedSKU/UOM, qtyOrdered/qtyPicked/qtyMissing/qtyVerified, stockHints[] | pickQty/markMissing/inspectLocation | una por línea, cantidades limitadas por contrato |
| `WarehouseLocationHints` | warehouseId, officialQty, availableQty, zoneHints, confidence, asOf | selectLocation | N bodegas configurables, paginar, no límite 7 |
| `MissingQuickAction` | lineId, missingQty, permission | markMissing | un toque, nota opcional, idempotente |
| `ShortageTaskCard` | shortageId, affectedOrders, qty, urgency, currentAttempt, assignedPerson | inspect/assign | sin mostrar dinero a no autorizados |
| `SourceOptionList` | availableInternalLocations, supplierCandidates, price, source, checkedAt, uncertainty | call/select/recordContact | no garantiza disponibilidad; opcional microapp |
| `PurchaseAttemptStatus` | attemptId, supplier, assignee, stage, problemCode | bought/notAvailable/arriving | cada intento conserva historial, retorno a búsqueda |
| `CashHandoverCompact` | payoutId, amount, sourceCash, authorizedActor, receiver, allowedActions | authorize/handOver/settle | fondos rastreados, 1 evento por desembolso |
| `ReceivedItemsConfirm` | attemptedSKU, orderedSKU, receivedQty, acceptedQty, condition | receive/flagMismatch | no acepta cambio SKU silencioso |
| `PackedOrderVerifier` | acceptedVersion, lineCheckResults, unresolvedMissing, verifiedBy | confirm/correct | bloqueo explícito si no corresponde |
| `OrderDeliveryAction` | deliveryMode, packedState, payment/permission flags, customerAcceptance | dispatch/confirmDelivery | distingue listo/traslado/entregado |

**Elementos PrimeReact candidatos (no constatados):** Card, Tag, ProgressBar, InputNumber, DataView/DataTable, Dialog/Drawer, Toast, Skeleton, Button y Tooltip. Auditoría de versión antes de adoptar props concretos.

## 5. RESPONSIVE — comportamiento esperado
| Ancho objetivo de revisión | Diseño | Acción en primera vista |
|---|---|---|
| 1366 px escritorio | Bandeja principal con filtros compactos + detalle contextual lateral; preparación con productos y ubicación; si autorizado, panel de faltantes | Empezar/Continuar y semáforo visibles sin navegar 3 pantallas |
| 768 px tablet | Bandeja en cards densas + detalle deslizable, ubicación plegable por SKU, acciones principales fijas en contexto | Preparador captura cantidades sin scroll horizontal global |
| 375 px móvil | Cards verticales, CTA inferior contextual y línea por línea para preparar; faltantes en pestaña personal autorizada | "**Tomé N**" y "**No encontré**" inmediatamente accesibles |

- Mostrar más información de bodegas solo al tocar "Ver ubicaciones" si existen varias, evitando saturación de 10+ bodegas.
- No presentar pagos, proveedores y margen de compra en la UI del preparador.
- Si el empleado tiene múltiples autorizaciones, mostrar **selector simple de tarea** (Preparar / Resolver / Comprar), no cambiar rol global. La autorización real se aplica por acción.
- Recomendado probar también tablet horizontal, textos largos, zoom 200 %, teclado físico y pantalla con baja altura.
- Layout de referencia Dribbble: jerarquía clara, fondos neutros, tarjetas compactas y acento funcional, sin gradientes ornamentales ni 5 métricas administrativas sobre una tarea simple.

## 6. ACCESSIBILITY — contrato no certificado
- Objetivo WCAG 2.2 AA pendiente de verificación en etapa 4; color rojo/amarillo/verde **no es única señal**: etiqueta, icono y acción.
- Área táctil usable, teclado, lector de código de barras y foco restaurado después de cantidad/diálogo. Evitar doble envío del escáner.
- Anunciar "Cantidad 6 de 10, faltan 4" y "Proveedor no disponible; vuelve a búsqueda"; actualizar progreso sin lector recibiendo decenas de anuncios.
- Dialogos con foco/escape/confirmación seguros; si dinero entregado o compra en proceso, cerrar overlay nunca elimina hecho.
- Campos monto/cantidad con unidades y localidad; contrastes y estados de error/permiso/vencimiento explícitos.
- Estado de proveedor "sin confirmar" debe ser legible, no una cotización aparentemente garantizada.

## 7. Matriz de visibilidad por capacidades
| Acción UI | Ver pedido | Preparar | Resolver faltante | Entregar dinero | Comprar | Verificar |
|---|---|---|---|---|---|---|
| Bandeja y líneas asignadas | sí | sí | sí en ámbito | solo resumen vinculado | solo asignados | sí |
| Marcar recogido/faltante | no salvo permiso | sí | no por defecto | no | no | no |
| Proveedores, precios, llamadas | no | no | sí | solo fuente mínima del desembolso | proveedor asignado | no |
| Cuenta/caja/montos desembolso | no | no | solo según grant | sí | solo anticipo recibido | no |
| Comprado/no había | no | no | administrar | no | sí | no |
| Verificar/Marcar listo | no | no por defecto | no | no | no | sí |
Esta tabla describe **capacidades**, no cargos. Un mismo usuario puede tener varias y la UI mostrar acciones combinadas de forma contextual. El backend siempre valida.

## 8. Vacío, carga, conflictos y estados inciertos
- Carga lenta: skeleton de cards/listas; no declarar pedido desaparecido hasta resultado.
- Sin pedidos: mensaje corto "No tienes pedidos asignados" + cambiar filtro autorizado.
- Sin ubicación: "Ubicación no registrada" con stock/frescura reales si existen, no inventar.
- Pedido cambiado desde otra caja: conflicto de revisión, actualizar y conservar captura pendiente.
- Proveedor no tiene stock: botón "No había", intento registrado, vuelve a Buscando.
- Compra/pago timeout: mostrar "**Consultando resultado**", no repetir desembolso ni entrada de inventario sin comprobar.
- Sin permiso: explicar que falta autorización para esa operación específica y ofrecer contacto/asignación si disponible.
- Pedido 100% capturado pero no verificado: progreso muestra `Preparado 100 % / Verificación pendiente`, nunca "Listo".

**Entrega documental de etapa 2:** 6 contratos anteriores completos; no se hizo mockup, diseño en Figma, código de interfaz ni prueba responsive.
