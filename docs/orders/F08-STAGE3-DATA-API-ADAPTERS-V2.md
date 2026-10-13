# F08 — Etapa 3A: datos lógicos, operaciones, integraciones y adapters

**Estado:** CONTRATOS DESCRIPTIVOS, sin código, sin Zod compilable, sin rutas REST confirmadas y sin integración certificada. **Fuente:** [etapa 1](F08-STAGE1-OPERATING-FLOW-V2.md), [UI etapa 2](F08-STAGE2-UI-SIX-CONTRACTS-V2.md). **Base transversal:** [schemas ERP/POS](../contracts-v1/03-data/SCHEMA-CATALOG.md), [estados y permisos](../contracts-v1/03-data/STATE-AND-PERMISSION-CONTRACTS.md). Esta iteración incluye solo F08/PED y conectores a CAJ/COM/INV existentes; **NO diseña F13 Offline** ni implementa nada.

## 1. Invariantes técnicas
1. Un pedido tiene ID interno global a tenant, ID(s) externos por canal, revisión y estado/versiones. Idempotencia `tenant + sourceChannel + sourceOrderId` al ingresar; si un pedido se actualiza externamente, se versiona sin duplicar.
2. Conservar por línea la **solicitud original** y la última **versión aceptada por cliente**; productos sustitutos o parcialidad sin aceptación no son equivalentes.
3. `cantidad solicitada`, `tomada`, `empaquetada`, `verificada`, `entregada`, `faltante` y `pendiente` NO son la misma magnitud. Todo decimal respetará UOM/factor y precisión del SKU.
4. **Stock oficial** por bodega viene del INV/ERPNext; zona puede ser dato descriptivo o probable y debe indicar confiabilidad, fecha y origen. Nunca inventar stock por ubicación sin ledger.
5. `OrderStage`, `PaymentStatus`, `FiscalStatus`, `StockReservationStatus`, `DeliveryStatus`, `MissingStatus`, `CashPayoutStatus` son **dimensiones independientes**.
6. Todas las acciones de dinero/stock/compra requieren `operationId`, `idempotencyKey`, `revision` y verificación del permiso **en el servidor**, con resultado reconsultable ante UNKNOWN.
7. Una tarea asignada no equivale a permiso concedido; límites/vigencia/ámbito y acto específico prevalecen sobre cargo.
8. Una compra externa sin orden formal **puede usar compra rápida COM**; no crear segundo motor de pagos ni de inventario; `Caja`/tesorería conservan custodia/contabilidad.
9. Integración opcional con Radar de Precios (microapp separada). Sus candidatos son pistas comerciales con fuente/fecha, no inventario ni precios confirmados.
10. El sistema puede guardar eventos automáticamente; el diseño busca el menor número de pulsaciones, no simplificar ocultando operaciones monetarias reales.

## 2. Catálogo lógico de DTO y reglas para Zod futuro
| DTO | Campos mínimos propuestos | Validación/propiedad |
|---|---|---|
| `OmnichannelOrder` | orderId, tenantId, siteId, sourceChannel, sourceOrderId?, sourceEventRef?, customerRef?, acceptedSpecVersion, originalSpecRef, promisedAt?, fulfillmentMode, preparationStage, priority, paymentRef?, revision, timestamps | Orig. externos único por tenant/canal/ID, modo válido, conservar cambios por revisión |
| `OrderLine` | lineId, orderId, acceptedSku, variantId?, uom, requestedQty, pickedQty, packedQty, verifiedQty, deliveredQty, unresolvedMissingQty, acceptedRevision, priceSnapshotRef? | Todos cantidades decimal string >=0, balance de unidades por etapa, no overpick/overdeliver |
| `SourceChannelRef` | channelKind, channelAccountId?, externalOrderId?, receivedAt, integrationState, rawPayloadRefPrivado? | No afirmar integración activa por `channelKind`; datos originales protegidos |
| `OrderPriority` | urgencyLevel, policyVersion, promisedAt?, paymentRank, arrivalSequence, reasons[], overrideRef?, computedAt | Prioridad independiente de preparación y pago; configurable D-043 |
| `OrderAssignment` | taskId, taskKind, actorId, assignedBy, zoneScope?, stage, revision, assignedAt | Asignación de trabajo no concede automáticamente grant de dinero |
| `OrderItemLocationHint` | sku, warehouseId, officialQty?, availableQty?, zoneId?, probableLocationLabel?, confidence, sourceAsOf, stockSource | Estado y vigencia evidentes; zona probable NO saldos oficiales |
| `Shortage` | shortageId, orderId, lineId, missingQty, detectedBy, detectedAt, missingKind(physical_not_found/system_unavailable), stage, stockSnapshotRef?, assignedResolverId?, revision | 1 incidente lógico activo por pedido/línea/cantidad; repetición no genera duplicado |
| `SupplyOption` | optionId, shortageId, sourceType(internal_location/external_vendor), warehouseId?, supplierId?, businessName?, reportedPriceMinor?, currency?, contactRef?, reportedAvailability?, asOf?, sourceKind, confidence | Datos desconocidos nullable; precio/disponibilidad no confirmados no se muestran como hechos |
| `SourcingAttempt` | attemptId, shortageId, optionId, buyerAssignedId?, state, contactAt?, outcome(no_stock/failed/bought/canceled)?, note?, createdBy, revision, timestamps | Todos intentos se preservan; `No había` cierra intento y reabre falta |
| `PersonCapabilityGrant` | grantId, personId, capability, tenantId, siteIds?, cashAccountIds?, orderId?, shortageId?, amountLimitMinor?, validFrom, expiresAt?, grantedBy, revokedAt? | Backend comprueba vigencia y target; grant puntual vs permanente/temporal |
| `TaskAuthorization` | approvalId, targetOperationId, targetSnapshotHash, authorizedByPersonId, authorizedCapability, scope, limitMinor?, expiresAt, decision | Aprobación no reutilizable si cambian monto/beneficiario/snapshot |
| `PurchaseAssignment` | attemptId, buyerPersonId, assignedByPersonId, expectedSku, qty, vendorRef?, destinationSiteId, revision | Asignación distinta de dinero/autorización de caja |
| `FundsHandover` | payoutRef, shortageId?, purchaseAttemptId, authorizedByPersonId?, handedByPersonId, receivedByPersonId, sourceCashOrBankAccountId, advanceMinor, actualSpentMinor?, returnedChangeMinor?, varianceMinor?, supportRefs[], handoverAt?, settlementAt?, financeEventRefs[], state | Enlace a movimiento único CAJ/TES, no ledger propio; importe seguro y cierre de anticipo |
| `PurchasedGoodsReceipt` | receiptRef, purchaseAttemptId, expectedSku, skuReceived, qtyReceived, qtyAccepted, qtyRejected, uom, condition, receivedByPersonId, inventoryDocumentRefs[], receivedAt, revision | SKU/variante/qty correctos o faltante sigue abierto; inventario confirmado vía INV/COM |
| `OrderVerification` | verificationId, orderId, acceptedSpecVersion, lineChecks[{lineId,sku,uom,expectedQty,verifiedQty,match}], verifiedByPersonId, timestamp, exceptions[], result | 100% verificado de especificación vigente antes de "listo completo"; sin falsear parciales |
| `FulfillmentTransfer` | transferId, orderId, deliveryMode, receiverRef, preparedItems[], dispatchedAt?, deliveredAt?, proofRef?, state, customerAcceptedPartialRef? | despacho != entrega, cantidad real; prueba mínima política empresa |
| `OrderEvent` | eventId, aggregateId, kind, actorPersonId, effectiveGrantRef, orderId, shortageId?, attemptId?, payoutRef?, amountMinor?, qty?, occurredAt, origin, correlationId | Append-only con motivo breve solo si excepción, sin datos sensibles públicos |
| `OperationStatus` | operationId, idempotencyKey, entityId, revision, state, createdRefs[], warnings[], nextActions[], serverAt | Permite recuperar reintento incierto sin duplicar órdenes ni pagos |

**Tipos:** cantidades como `decimal-string` y moneda en enteros menores/con precisión por divisa, no floats de JS; `Instant` UTC más zona de establecimiento. IDs opacos, scopes de servidor, `correlationId` por recorrido y `expectedRevision` para controles de carrera. Catálogo de enums de estados en etapa 3B.

## 3. Matriz de operaciones PED (candidatas, SIN endpoint URL)
| ID | Tipo | Operación | Entrada indispensable | Salida/invariante |
|---|---|---|---|---|
| PED.Q01 | Q | `order.list` | site, filtro etapa/urgencia/canal/persona, cursor | cards con razones y progreso fechado |
| PED.Q02 | Q | `order.detail` | orderId | acceptedSpec, historial, lineas, permisos efectivos, revisión |
| PED.C01 | C | `order.ingest` | channel, externalId, customer, items, eventId | OrderId único/dedupe, estado falta confirmar si faltan datos |
| PED.C02 | C | `order.updateAcceptedSpec` | orderId, cambios, proofAcceptance, expectedRev | versión aceptada, precios/documentos conectados |
| PED.Q03 | Q | `order.priorityList` | policyVersion, site, date | orden explicado, pago distinguido |
| PED.C03 | C | `order.assign` | orderId, taskKind, personId | tarea con permiso verificado al ejecutar |
| PED.C04 | C | `order.takeTask` | assignmentId/orderId, expectedRev | única toma efectiva, evita carrera |
| PED.Q04 | Q | `inventory.locationsForOrderLine` | lineId, eligible warehouses | stock oficial, ubicaciones y asOf, no precio proveedores |
| PED.C05 | C | `order.recordPickedQuantity` | lineId, qty, locationRef?, expectedRev | progreso pick correcto, sin publicar doble stock |
| PED.C06 | C | `shortage.markMissing` | lineId, missingQty, stockSnapshotRef?, idempotencyKey | shortageId idempotente y aviso segmentado |
| PED.Q05 | Q | `shortage.assignedQueue` | site/scope, urgency | solo faltantes para resolutor autorizado |
| PED.Q06 | Q | `shortage.supplyOptions` | shortageId | internal + vendors opcionales, fuente/precio/frescura/unknown |
| PED.C07 | C | `sourcing.contactResult` | attemptId, supplierRef, responseCode, note? | resultado corto y auditable sin requisición formal |
| PED.C08 | C | `sourcing.assignBuyer` | shortageId, optionId, buyerPersonId, expectedRev | intento actual con comprador; no concede gasto |
| PED.C09 | C | `sourcing.markNotAvailable` | attemptId, note? | intento fallido, shortage vuelve a Buscando; fondos siguen activos |
| PED.C10 | C | `sourcing.markPurchased` | attemptId, expectedItems, actualAmount? | compra obtenida, en camino; no crea ledger ficticio |
| PED.C11 | C | `sourcing.receiveGoods` | attemptId, SKU, qty, condition, receivePerson | recepción real vía COM/INV, incidencia abierta hasta correcto |
| PED.C12 | C | `sourcing.linkInternalTransfer` | shortageId, origin/dest inventoryTransferRef | buscar en bodega, transferencia oficial INV |
| PED.Q07 | Q | `authority.effectiveForTask` | personId, resourceId, actionId | capabilities server-evaluated, exponer mínimo UX |
| PED.C13 | C | `cash.requestAdvance` | attemptId, beneficiary, amount, sourceAccount | autorización contextual; usa FIN.C05 |
| PED.C14 | C | `cash.confirmHandover` | payoutRef, handedBy, receiver, amount, effectiveGrant | movimiento CAJ/TES único, no autorización por cargo |
| PED.C15 | C | `cash.settleAdvance` | payoutRef, actualSpent, returnedChange, supportRef? | rendición, cambio/deuda auditada, sin doble salida |
| PED.C16 | C | `order.verifyPacked` | orderId, acceptedSpecVersion, checkRows, personId | resultado verified/incomplete; listo solo si corresponde |
| PED.C17 | C | `order.markReady` | orderId, verificationId, expectedRev | `Ready` si todas unidades aceptadas verificadas |
| PED.C18 | C | `order.dispatch` | orderId, lines, handoffReceiver, mode | salida física por cantidades reales, no duplica INV |
| PED.C19 | C | `order.confirmDelivery` | transferId, actualDeliveredLines, confirmationRef | entrega real, parciales separados |
| PED.C20 | C | `order.changeOrCancel` | orderId, action, reason?, acceptedSpecRev | referencia F07/TES si hay efectos publicados |
| PED.Q08 | Q | `order.events` | orderId/shortageId/attemptId, cursor | trazabilidad por permiso, sin datos sensibles |
| PED.Q09 | Q | `operation.status` | operationId/idempotencyKey | resolución ante UNKNOWN/reintento seguro |

**No crear rutas definitivas** por su nombre: conectar más adelante con OpenAPI/ERPNext reales y definir errores/status de transporte de cada puerto; ningún `POST` con dinero confirmado por UI.

## 4. Adapters y autoridades (reutilización, sin motor duplicado)
| Puerto conceptual | Fuente / adapter candidato | Invariante o ausencia |
|---|---|---|
| `OrderInboxPort` | POS Core F04/F06, canal web y conectores/redes; manual | Integración por canal solo si configurada; evento externo dedupe |
| `OrderDomainPort` | Holamigo Order Service / ERPNext Sales Order tras verificar | No crear segunda venta ni segunda factura por pedido |
| `OrderStockLookupPort` | INV-03 / ERPNext Stock Ledger y ubicación operativa Holamigo | Zona probable ≠ inventario garantizado |
| `InternalReplenishmentPort` | INV-06 traslado entre bodegas | Recepción confirmada antes de usar, tránsito visible |
| `SupplierCandidatesPort` | Microapp opcional Radar de Precios + lista contactos proveedores COM-01 | Candidatos sin garantías; precio/asOf/estado desconocido explícito |
| `QuickPurchasePort` | COM-01..08 compra rápida, proveedor, recepción y CxP | Compra externa para pedido consume lógica existente, no una contabilidad paralela |
| `CashAdvancePort` | CAJ-05 + TES-06; fuente de caja y saldo/custodia | Un desembolso real por evento, si dinero sigue con comprador se rastrea obligación |
| `FulfillmentPort` | INV despacho/stock y POS documentos, sujeto a versión ERPNext | Reservar/recoger/entregar son eventos diferentes |
| `AuthorizationPort` | ADM grants por persona/contexto/tiempo/capacidad | No confiar en cargo ni etiquetas UI; permisos revocados en ejecución |
| `OrderEventsPort` | Auditoría ERP/POS y REP, proyección UI | Un origen por evento y deduplicación, acceso mínimo |
| `DeliveryConfirmationPort` | Recepción cliente/retiro/operador/transportista según capacidad | "Despachado" no automáticamente "Entregado" |

## 5. Cohesión con módulos ya contratados
- CAT y F04: usar SKU/UOM/variante/precio de la solicitud y versión aceptada; no inventar catálogo para compras locales.
- F06/FIN: pedido pagado, parcial o no pagado es dato separado. El **adelanto para compra al empleado no es un cobro del cliente**.
- INV-03/06/07/09: consultar stock, traslado/recepción, reservas y efecto de despacho una sola vez.
- COM-04/08: recepción externa y pago/anticipo vía mecanismos ya definidos; soporte legal/contable sujeto a profesional.
- ADM: autorización contextual por persona/alcance/presupuesto/tiempo y asignación independiente.
- REP: tiempo pedido->listo, tiempo resolver faltante, errores verificación, puntualidad; análisis sin obligar al preparador a responder métricas.
- F13 no diseñado; timeout en operación online conserva UNKNOWN e idempotencia pero no crea cola offline.

## 6. Riesgos a validar ANTES de etapa 4
- Modelo actual ERPNext: Sales Order/Delivery Note, stock reservation, contabilización de entregas y compra rápida. No afirmar capacidades reales sin pruebas.
- Fuente de stock por zona y si existe autoridad de ubicación detallada por bodega.
- Interfaces de proveedor/candidatos (microapp opcional), datos privados, precisión/actualización de precios.
- Reglas contables de anticipo empleado vs compra/gasto y devolución de cambio, formas de pago (contado/transferencia).
- Soporte de distintas personas en recepción/compra/entrega sin roles fijos.
- Captura de aceptación de cliente para sustituciones o entregas parciales; proceso fiscal según jurisdicción.
- Eventos y conflictos de varios compradores/varios pedidos por SKU; locks/idempotencia.
- Desfase de integración de canal, deduplicación y pedido externo modificado.
- Compatibilidad de PrimeReact y contratos API en branch frontend real `capa-2-responsive`.

**Fin etapa 3A: solo documentos.** Máquinas de estados, permisos, errores y mocks a continuación en 3B.
