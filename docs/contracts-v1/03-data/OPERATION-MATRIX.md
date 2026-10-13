# Etapa 3 — Operaciones lógicas (API / queries / commands)

**NO son endpoints publicados ni nombres confirmados en ERPNext.** Este documento es contrato de negocio propuesto para que OpenCode/Codex derive APIs, TanStack Query, operaciones MSW y adapters una vez auditado el backend. **Excluidos F08/PED y F13/Offline.** Toda operación requiere contexto autorizado, actor, correlationId; comandos que crean efecto exigen idempotencyKey+expectedRevision donde exista recurso. Las consultas nunca modifican datos.

## Regla de nomenclatura
- Query: `<aggregate>.list|get|search|preview|history`, devuelve datos con `asOf`, estado de carga/frescura y filtros.
- Command: `<aggregate>.createDraft|request|approve|publish|reverse|apply|close`, devuelve operationId + entityId + estado/revisión con resultado reconsultable.
- Los montos, impuestos, precio y stock son calculados o validados por backend; no confiar en totales propuestos por frontend.
- Contexto tenant/sede/almacén/caja/turno via credencial con scope y parámetros verificables; jamás inferir permiso solo por IDs.
- Sin endpoints HTTP concretos todavía: rutas, verbos y contratos OpenAPI definitivos se mapean al encontrar `openapi.yaml` de la rama real.

## CAT — Producto / UOM / Precio
| Operation ID | Tipo | Entrada principal | Resultado / reglas | Error/recovery |
|---|---|---|---|---|
| CAT.Q01 product.search | Q | texto/SKU/barcode, filtros atributos, cursor, site | resumen con variante/UOM, estado precio/stock | EMPTY, AMBIGUOUS, STALE |
| CAT.Q02 product.getDetail | Q | productId, variantId?, UOM?, customerId? | detalle + unidades y trazabilidad | NOT_FOUND, FORBIDDEN |
| CAT.Q03 price.quote | Q | sku/variant/uom/qty/customer/channel | PriceQuote firmada por cálculo, explica regla y vigencia | RULE_CONFLICT, NO_VALID_PRICE |
| CAT.C01 product.upsertDraft | C | ProductDraft, revision | draft validado sin ledger | DUPLICATE_SKU, REVISION_CONFLICT |
| CAT.C02 product.publish | C | draftId, expectedRevision | versión activa/inactiva | POLICY_DENIED, INVALID_UOM |
| CAT.C03 pricingRule.publish | C | draft regla, prioridad, stacking | regla versionada/trace | RULE_CONFLICT, NOT_AUTHORIZED |
| CAT.C04 import.preview | C | batchRef/mapas | errores por fila, no modificación catálogo | FILE_INVALID, MAPPING_FAILED |
| CAT.C05 import.publish | C | previewBatchId, revision | resultado por fila y IDs, repetible idempotente | PREVIEW_EXPIRED, PARTIAL_REVIEW |

## INV — Stock / zonas / conteos / movimientos
| Operation ID | Tipo | Entrada principal | Resultado / reglas | Error/recovery |
|---|---|---|---|---|
| INV.Q01 stock.position | Q | sku, warehouseId?, asOf? | oficial/reservado/no vendible/disponible, fuente | STOCK_STALE, SCOPE_DENIED |
| INV.Q02 zone.priorities | Q | site/warehouse, day | prioridad rojo/amarillo/verde/gris + sessionStatus separado | POLICY_UNCONFIGURED |
| INV.Q03 count.session | Q | sessionId | líneas, cortes, movimiento concurrente, pendientes | SESSION_MISSING |
| INV.C01 stock.initialImport | C | batch validado inicial + costo/warehouse | documentos stock por autoridad | DUPLICATE_IMPORT, COST_INVALID |
| INV.C02 receipt.accept | C | ReceiptDraft/recepción, aceptado y no vendible | entrada por aceptado + docs stock | QTY_CONFLICT, UNKNOWN_RESULT |
| INV.C03 count.start | C | zoneId/assignee/cutoffRef | sessionId, cutoffAt, revision | ALREADY_COUNTING, NO_PERMISSION |
| INV.C04 count.recordLine | C | sessionId, SKU/UOM, qty, capturedAt, revision | versión capturada, reconteo si aplica | REVISION_CONFLICT, INVALID_UOM |
| INV.C05 count.submitReview | C | sessionId, reconciledMovementRefs | diferencias propuestas, no ajuste stock | MOVEMENT_WINDOW_CONFLICT |
| INV.C06 count.approveAdjustment | C | sessionId/differenceIds, approvalId | StockAdjustment confirmado por backend | NOT_AUTHORIZED, UNKNOWN_RESULT |
| INV.C07 transfer.dispatch | C | origin/dest/lines, approval | tránsito/doc origen | STOCK_INSUFFICIENT, UNKNOWN_RESULT |
| INV.C08 transfer.receive | C | transferId, received/damaged/missing | destino y pendientes | QTY_CONFLICT, DUPLICATE |
| INV.C09 stock.scrap | C | items, causal, approval, origin | movimiento merma/no vendible | NO_AUTHORIZATION |
| INV.C10 zone.configurePolicy | C | zone/frequency/urgency rules, revision | versión política fecha efectiva | POLICY_CONFLICT |

## COM — Compras y proveedores
| Operation ID | Tipo | Entrada | Resultado / reglas | Error |
|---|---|---|---|---|
| COM.Q01 supplier.search | Q | texto, estado, cursor | proveedores aptos y restricción bancaria | EMPTY/PRIVACY |
| COM.Q02 purchase.list | Q | type/status/date/site | órdenes/recepciones/facturas relacionadas | PERMISSION_DENIED |
| COM.Q03 receipt.threeWayPreview | Q | orderId?, receiptId?, invoiceId? | diferencias orden/recibido/factura | DOCUMENT_MISSING |
| COM.C01 supplier.upsert | C | perfil fiscal/contactos/bancos versionados | proveedor, revisión/validaciones | DUPLICATE/ACCOUNT_REVIEW |
| COM.C02 purchaseOrder.submit | C | supplier, líneas, reglas aprobación | orden pendiente/aprobada | LIMIT_EXCEEDED |
| COM.C03 purchaseReceipt.post | C | parcial aceptado/dañado/pendiente, sourceRef | recepción + stock según aceptación | UNKNOWN/REVISION |
| COM.C04 vendorInvoice.register | C | número, proveedor, recepción refs, impuestos | CxP según ERP autoridad | DUPLICATE_INVOICE, MISMATCH |
| COM.C05 supplierReturn.publish | C | líneas aceptadas a devolver, causa, refs | salida y crédito/saldo con docs | QTY_EXCEEDED/UNKNOWN |
| COM.C06 replenishment.suggest | Q | stock disponible, mínimos, lead time si existe | sugerencia, nunca compra automática | STALE_SOURCE |

## CLI — Cliente, crédito y cartera
| Operation ID | Tipo | Entrada | Resultado / reglas | Error |
|---|---|---|---|---|
| CLI.Q01 customer.search | Q | nombre/ID/tel con ámbito | customer IDs, inactivo/elegible | NOT_FOUND/REDACTED |
| CLI.C01 customer.upsert | C | identidad/contactos/consentimiento | cliente versionado | DUPLICATE_ID |
| CLI.Q02 credit.exposure | Q | customerId, saleAmount? | límite, usado, retenido, disponible y fecha | STALE_EXPOSURE |
| CLI.C02 credit.changePolicy | C | customerId, cupo/plazo/revision | versión policy autorizada | NOT_AUTHORIZED |
| CLI.C03 credit.authorizeSale | C | customerId, draftId, amount, revision | autorización/hold (no dinero) | LIMIT_EXCEEDED, RACE |
| CLI.Q03 receivable.statement | Q | customerId, asOf, cursor | vencimientos, facturas/pagos/anticipos | PERMISSION_DENIED |
| CLI.C04 receivable.applyCollection | C | recaudo verificado, allocations, anticipo | aplicaciones a CxC y estado | PAYMENT_UNVERIFIED, OVER_ALLOCATED |

## RET/F07 — Devoluciones y reembolsos
| Operation ID | Tipo | Entrada | Resultado / reglas | Error |
|---|---|---|---|---|
| RET.Q01 sale.returnable | Q | saleId/invoiceNo, customer | líneas retornables, historial, snapshot original | SALE_UNKNOWN |
| RET.Q02 return.policyEvaluate | Q | venta, causal, categoría jurídica, qty, condición | elegible / autorización / derechos y cautelas | LEGAL_REVIEW_REQUIRED |
| RET.C01 return.createCase | C | originalSaleId, lines, reasons, inspection | expediente y revisión | QTY_EXCEEDED |
| RET.C02 return.requestApproval | C | caseId, desiredOutcome, revision | solicitado al supervisor | APPROVER_UNAVAILABLE |
| RET.C03 return.approveAndPublish | C | caseId, approvalId, expectedRevision | caso confirmado + referencias de efectos | NOT_AUTHORIZED, EFFECT_PENDING |
| RET.C04 return.resolveDisposition | C | caseId, per-line disposition | stock efectivo o cuarentena | STOCK_POLICY_DENIED |
| RET.C05 refund.request | C | caseId, originalPaymentRef, amount | RefundAttempt PENDING/UNKNOWN/CONFIRMED | UNKNOWN_RESULT |
| RET.Q03 return.effectsStatus | Q | caseId | estado por fiscal/stock/CxC/refund | PARTIAL_EFFECTS |

## FIN/CAJ — Caja y tesorería
| Operation ID | Tipo | Entrada | Resultado / reglas | Error |
|---|---|---|---|---|
| FIN.Q01 cashShift.current | Q | registerId/siteId | custodio, fondo, status, balance esperado | MISSING_SHIFT |
| FIN.C01 cashShift.open | C | cashRegister, custodian, denominations | turno único activo, fondo oficial | SHIFT_ALREADY_OPEN |
| FIN.Q02 payment.destination | Q | method/site, amount? | destino configurado/cuenta enmascarada | DESTINATION_DISABLED |
| FIN.C02 payment.createAttempt | C | PaymentSession, amount, method, snapshot destino | PaymentAttempt ID por medio/leg | TOTAL_EXCEEDED |
| FIN.C03 evidence.attachAndSubmit | C | paymentAttemptId, evidenceRefs múltiples, revision | evidencia enviada, pendiente aprobación | EVIDENCE_INVALID |
| FIN.C04 bankVerification.decide | C | attemptId, externalTxnRef, verifiedBy, decision | confirm/reject/review; verifica acreditación | UNVERIFIED_BANK |
| FIN.C05 cashMovement.request | C | gasto/compra/abono/retiro/transferencia, cuenta, soporte | pendiente/approved/rejected según umbral | LIMIT, INSUFFICIENT_CASH |
| FIN.C06 supplierPayment.execute | C | SupplierPaymentPlan con N allocations | **un desembolso** y N aplicaciones proveedor | OVERALLOCATED, UNKNOWN |
| FIN.C07 cashTransfer.handOver | C | source/dest, amount, custodian IDs | entregado/pendiente recepción | CUSTODY_CONFLICT |
| FIN.C08 cashTransfer.accept | C | transferId, received amount | recibido/withDiscrepancy | TRANSFER_DUPLICATE |
| FIN.Q03 shift.xPreview | Q | shiftId, asOf | X provisional con secciones y pendientes | INCOMPLETE_SOURCES |
| FIN.C09 shift.submitCount | C | denominations, countedBy, revision | arqueo y diferencia provisional | SESSION_CLOSED |
| FIN.C10 shift.closeZ | C | shiftId, conteo, incidencias/approvals, revision | Z definitivo ÚNICO | UNKNOWN, BLOCKED_CLOSE |
| FIN.Q04 bankReconciliation.preview | Q | account, statementBatch | coincidencias y dudas | DUP_STATEMENT |
| FIN.C11 bankReconciliation.confirm | C | bankMovement, internalRefs, reviewer | conciliación sin crear 2do cobro | DUP_MATCH |
| FIN.C12 advance.apply | C | advanceRef, docs allocations | anticipo aplicado/monetario no duplicado | ALLOCATION_INVALID |

## REP — Reportes e historial
| Operation ID | Tipo | Entrada | Resultado | Error |
|---|---|---|---|---|
| REP.Q01 report.xCut | Q | shiftId, asOf | informe X no mutante | SHIFT_UNAVAILABLE |
| REP.Q02 report.zCut | Q | zId, scope | Z snapshot inmutable y eventos | NOT_FOUND |
| REP.Q03 report.consolidated | Q | site/date/shift ranges | corte agregado sin double count | DATA_STALE |
| REP.Q04 report.sales | Q | filtros producto/usuario/cliente/período | net sales con fuentes y warnings | SCOPE_DENIED |
| REP.Q05 report.inventoryZones | Q | site/zone/date | cobertura, prioridad, discrepancias y período | NO_ZONE_POLICY |
| REP.Q06 report.finance | Q | scope/period | CxC/CxP, pagado vs pendiente y conciliación | ACCOUNTING_NOT_VALIDATED |
| REP.Q07 audit.history | Q | entityId/operationId, cursor | eventos, relación al original y actor | PRIVATE_REDACTED |
| REP.C01 report.exportRequest | C | reportRef, formato, filtros, rol | job auditado/enlace temporal privado | EXPORT_DENIED |

## ADM — Empresa, permisos y dispositivos
| Operation ID | Tipo | Entrada | Resultado | Error |
|---|---|---|---|---|
| ADM.Q01 settings.current | Q | company/site and category | versión activa + capabilities + ámbitos | SCOPE_DENIED |
| ADM.C01 settings.submitDraft | C | patch controlado, revision | versión en revisión | REVISION_CONFLICT |
| ADM.C02 settings.publish | C | settingsVersionId, approval | configuración activa desde fecha efectiva | AUTH_REQUIRED |
| ADM.C03 siteRegister.bind | C | site/register/terminal/user | binding versionado | ACTIVE_SHIFT_CONFLICT |
| ADM.C04 roles.assignGrant | C | principal/capability/scope/amountLimit | permiso versionado, auditoría | PERMISSION_DENIED |
| ADM.C05 bankDestination.rotate | C | account masked metadata, verifiers, effectiveAt | destino activo, antiguos intentos congelados | REVIEW_PENDING |
| ADM.C06 device.bind | C | deviceId/type/capabilities/register | habilitación o error de compatibilidad | UNSUPPORTED_DEVICE |
| ADM.C07 migration.preview | C | batchRef/mapping | reporte dry-run y errores | INVALID_DATA |
| ADM.C08 migration.publish | C | previewBatchId, revision | lotes por entidad, resume recovery | REPEATED_BATCH |

## Permisos de operación transversal
Una solicitud no sirve como aprobación. Eventos publicados se vuelven fuente ERPNext cuando se confirma el adaptador: CAT Admin/PriceManager; INV contador+recorder+supervisor; COM comprador/receptor/aprobador; CLI cajero/creditAdmin/treasury; RET devolución autorizada; FIN caja/tesorería/contador; REP rol de consulta; ADM empresa/seguridad. La matriz fina en `STATE-AND-PERMISSION-CONTRACTS.md`.

## No incluido
- Ningún contrato de F08/PED ni F13 Offline.
- No hay ruta REST/OpenAPI comprobada, no hay configuración de servidor, ni SDK/handler MSW real.
- Todas las operaciones lógicas con el prefijo de dominio son **propuestas**, sujetas al esquema real. No enviar solicitudes reales a DIAN/bancos desde estos contratos.

## POS — Contexto, carrito, cobro y documentos (F01–F06/F12)
| Operation ID | Tipo | Entrada principal | Resultado / regla | Error |
|---|---|---|---|---|
| POS.Q01 session.context | Q | actor, tenant/site/register | user scope, caja/turno, capabilities y vigencia | AUTH_REQUIRED/SHIFT_CLOSED |
| POS.C01 shift.open | C | register, custodio, denominaciones | CashShift único, reusar FIN.C01 | DUPLICATE_SHIFT |
| POS.Q02 saleDraft.get | Q | saleDraftId | borrador, revisión, quotes, customer, estado | NOT_FOUND/SCOPE_DENIED |
| POS.C02 saleDraft.createOrPatch | C | draftId?, líneas, UOM, cliente, expectedRevision | SaleDraft durable + totals autorizados | PRICE_EXPIRED/REVISION |
| POS.C03 saleDraft.suspend | C | draftId, expectedRevision | suspended, sin PaymentAttempt comprometido | PAYMENT_ACTIVE |
| POS.C04 saleDraft.resume | C | draftId, expectedRevision | draft restored + price/stock revalidation | STALE_QUOTE/CONFLICT |
| POS.C05 paymentSession.start | C | draftId, totalsSnapshotRef, shiftId, idempotencyKey | PaymentSession persistente, monto a cobrar | NO_VALID_PRICE/SHIFT_CLOSED |
| POS.C06 paymentAttempt.add | C | sessionId, method, amount, destinationRef, idempotencyKey | PaymentAttempt individual; reusar FIN.C02 | AMOUNT_EXCEEDED/DEST_INVALID |
| POS.Q03 paymentSession.get | Q | sessionId | confirmed/pending/unknown/unallocated y attempts | PAYMENT_UNKNOWN |
| POS.C07 sale.commit | C | paymentSessionId, draft revision, paymentRefs, authorizedCreditRef? | venta única + estado por fiscal/entrega/impresión | PAYMENT_INCOMPLETE/UNKNOWN_RESULT |
| POS.Q04 sale.status | Q | saleId/operationId | SaleRecord y estados relacionados; para recovery | NOT_FOUND/PENDING |
| POS.C08 print.requestSameDocument | C | docRef, deviceId, idempotencyKey | PrintJob, sin reemitir documento fiscal | DEVICE_UNAVAILABLE |
| POS.C09 approval.request | C | operation/snapshot/motivo | ApprovalSnapshot inmutable con vencimiento | LIMIT_DENIED |
| POS.C10 approval.decide | C | approvalId, decision, actor | permiso para snapshot específico | SELF_APPROVAL_RESTRICTED |

**El carrito y PaymentSession no son la misma entidad.** Suspendida sin pago ≠ Cobro pendiente. Ningún request del navegador confirma banco, fiscalidad o impresión simplemente por respuesta mock; el servidor debe devolver estados reales cuando exista integración.
