# Etapa 3 — Catálogo de contratos de datos y validación Zod (DECLARATIVO)

**Estado:** propuesta de contrato, NO archivos Zod compilables. **Ámbitos:** POS F01–F07/F09–F12/F14, CAT, INV, COM, CLI, F-FIN, REP, ADM. **Excluidos expresamente:** PED/F08 y F13 OFFLINE. **Las propiedades son nombres lógicos propuestos**; mapear a fuentes reales de backend tras auditoría, sin prometer campos ERPNext ni inventar endpoints.

## 0. Convenciones comunes de tipos
| Tipo lógico | Validación esperada (Zod futuro) | Restricción |
|---|---|---|
| EntityId | string no vacío, formato interno opaco estable, `max 128` provisional | Nunca usar nombre visible como ID |
| TenantId, SiteId, WarehouseId, RegisterId, ShiftId, UserId | EntityId con ámbito verificado en backend | IDs no autorizan acceso por sí mismos |
| ISODate | fecha calendario válida yyyy-mm-dd | No inferir fecha local desde UTC sin TZ |
| Instant | ISO-8601 con offset/zona + instante UTC normalizado | No confiar en reloj de cliente para orden oficial |
| MoneyMinor | string de entero firmado según reglas de importe y moneda | COP sin fracciones por defecto configurable; otros países/monedas requieren precisión |
| DecimalQuantity | string decimal no exponencial validada por UOM/precisión | No usar float JS para cantidades con inventario |
| CurrencyCode | ISO 4217 string validado; moneda empresa | No asumir COP fuera de Colombia |
| Revision | entero ≥ 0, esperado por comando de cambio | Optimistic concurrency / 409 |
| IdempotencyKey | UUID/ID opaco estable por intención de negocio | No regenerar al reintentar el mismo intento |
| AuditActor | actorId + role/scope + approvalId si procede | Actor real verificado por servidor; no confiar en enviada desde UI |
| DocumentReference | docType + entityId + version + origin | Documento visible y fuente legal separados |
| EvidenceRef | id, kind, storageRef privado, uploadedAt, reviewStatus | Sin URI pública permanente de fotos |
| ErrorEnvelope | code, category, messageKey, correlationId, retryable, recoveryHint, fieldErrors[] | Texto traducible, códigos estables, sin stack técnico ni filtración |

## 1. Envelope de lectura y comando
**QueryEnvelope**: tenantContext implícito desde credenciales, locale, currency, filters, sort, cursor, pageSize, asOf, dataFreshness, correlationId. Un query no crea transacción.
**CommandEnvelope**: commandId, idempotencyKey, expectedRevision, targetId, actorToken/contexto seguro, domainPayload, clientTimestamp informativo (no autoridad), correlationId.
**CommandResult**: operationId, entityId, revision, status (accepted/pending/confirmed/rejected/unknown según dominio), serverTimestamp, details, warnings[], relatedDocumentRefs[], nextAllowedActions[].
**PagedResult**: items[], cursorNext, totalOptional, asOf, staleAfterOptional.
**AuditEvent**: eventId, operationId, aggregateId, kind, occurredAt, actorId, siteId, beforeRevision, afterRevision, reasonCode, refs[], no PII no autorizada.

## 2. Posición de validación
- Zod en frontend: formato y UX, no reemplaza autorización, deduplicación, control de inventario o reglas fiscales servidor.
- Backend valida también: tenant/sede, permiso, revisión, campo, money/UOM, estado de transacción y límite.
- Información derivada (precio, total fiscal, saldo, disponibilidad, gasto calculado) no se acepta desde UI como autoridad; el servidor devuelve snapshot autorizado.
- Entradas importadas pasan dry-run y publicación en comando distinto; cada fila conserva error sin escribir stock ni cuentas al cargar archivo.
- `UNKNOWN` no equivale a `rejected` y **no** habilita repetir operaciones monetarias si autoridad externa pudo confirmar.

## 3. DTO por dominio (campos mínimos y validaciones)
| DTO lógico | Campos propuestos | Invariantes |
|---|---|---|
| ProductDraft | id?, sku, title, brandId?, familyId?, attributes, active, revision | SKU único por empresa, atributos verificados, no hard delete con historial |
| ProductVariant | variantId, productId, optionValues, active | Variante unívoca y enlazada |
| UomConversion | stockUom, saleUom, factorDecimal, qtyPrecision | Factor positivo, unidad existente |
| PriceList | priceListId, scope, customerGroup?, siteId?, effectiveFrom/To?, currency | Vigencia y ámbito válidos |
| PriceQuote | quoteId, productId, variantId?, uom, quantity, unitPriceMinor, taxes[], discount[], ruleTrace[], expiresAt, revision | Snapshot emitido por motor; expirado requiere recálculo |
| PricingRuleDraft | ruleId?, conditions, priority, stackingPolicy, validity, priceAction, revision | Empate/conflicto detectado; stack explícito |
| ImportBatch | batchId, kind, mapping, uploadedRef, status, rowsSummary, rowErrors[], revision | Preview antes de publish; reintentos idempotentes |
| ZoneDefinition | zoneId, siteId, warehouseId, label, active, priorityPolicyId?, revision | Zona ≠ bodega contable; no stock inventado |
| ZoneUrgency | zoneId, level(red/yellow/green/gray), reasons[], asOf, nextDue, openIncidents | Urgencia y progreso de sesión separados |
| StockPosition | itemId, warehouseId, stockUom, physicalQty, reservedQty, blockedQty, transitQty, availableQty, asOf | Fuente ERPNext, sin stock agregado ficticio por zona |
| CountSession | sessionId, zoneId, warehouseId, status, cutoffAt, assignedCounterId, recorderId, reviewerId?, startedAt, revision | Conteo diario/corte y roles rastreables |
| CountLine | lineId, sessionId, sku, uom, countedQty, capturedAt, recorderId, counterId, notes, movementWindowRef?, revision | SKU/UOM válidos; varias capturas/recuentos versionadas |
| CountDiscrepancy | lineId, adjustedExpectedQty, countedQty, difference, reCount?, status, reviewerId?, reasonCode | Considerar movimientos concurrentes antes de diferencia |
| StockMovementRequest | kind, warehouseFrom?, warehouseTo?, zone?, lines[], reason, sourceRef, revision | Origen/destino; no doble stock, aceptación parcial trazable |
| Supplier | supplierId, fiscalIdentity, contacts, paymentAccounts[], terms, status, revision | Cuenta destino requiere control sensible |
| PurchaseOrderDraft | supplierId, siteId, lines[{sku,uom,qty,quotedPrice}], expectedDate?, terms, revision | Solicitar y aprobar según perfil |
| ReceiptDraft | orderId?, supplierId, warehouseId, lines[{sku,uom,orderedQty?,receivedQty,acceptedQty,damagedQty,rejectedQty}], evidence[], revision | Aceptado no excede recibido; solo aceptado vendible |
| VendorInvoiceDraft | supplierId, supplierInvoiceNo, receiptRefs[], lines[], taxes[], dueAt?, revision | Dedupe proveedor+documento; tres vías cuando aplique |
| SupplierPaymentPlan | supplierId, originAccountId, method, totalMinor, allocations[{invoiceId,amountMinor}], prepaymentMinor?, evidence[], revision | allocations + anticipo <= importe, no doble CxP |
| CustomerDraft | customerId?, fiscalIdentity?, name, contacts, addresses, groupId?, revision | Identidad fiscal validada y privacidad |
| CreditPolicy | customerId/groupId, limitMinor, termDays, active, permissionScope, revision | Disponible = límite - exposición confirmada - compromisos relevantes |
| ReceivableAccount | customerId, openInvoices[], creditNotes[], advances[], agingBuckets, asOf | Saldos autoridad financiera, no UI |
| CollectionPlan | customerId, method, paymentAttemptId?, allocations[], advanceMinor?, sourceAccountId, revision | Pago real verificado antes de liquidación |
| ReturnCaseDraft | caseId?, originalSaleId, lines[{originalLineId,returnQty,reason,condition,destination}], category, legalTrack, revision | Remanente retornable y revisión |
| ReturnOutcome | caseId, decisions[], stockEffects[], fiscalEffectRef?, refundPlan?, creditEffectRef?, status | No asumir efectos instantáneos |
| RefundAttempt | refundId, originalPaymentRef, amountMinor, method, status, externalReference?, idempotencyKey | Reembolso UNKNOWN no repite |
| CashShift | shiftId, registerId, custodianId, openingCount, status, revision | Solo custodio permitido, un turno activo compatible |
| CashMovementDraft | movementKind, originAccount, destinationAccount?, sourceDocumentRefs[], amountMinor, evidence[], reason, expectedShiftRevision | Transferencia interna ≠ ingreso/gasto |
| DenominationCount | currency, denominationLines[{denominationMinor,qty}], declaredTotalMinor, countedBy, capturedAt | Total calculado = suma valores, no lo escribe cajero |
| XCutSnapshot | xId, registerId, shiftId, asOf, sections, unresolved[], generatedBy | Query provisional, no cambia turno |
| ZCloseRequest | shiftId, xCutRef, countRef, exceptions[], approvalRefs[], expectedRevision, idempotencyKey | Z único por cierre; no duplica movimientos |
| ZCloseSnapshot | zId, shiftId, cutoff, sections, expectedCash, countedCash, differences, openIncidents, approvals, docs | Corte inmutable trazable; no sustituye documento DIAN |
| BankVerification | verificationId, paymentAttemptId, evidenceRefs[], accountId, status, reviewerId?, externalTxnRef?, reviewAt | Foto aprobada ≠ acreditación bancaria |
| BankMatch | bankMovementId, internalRefs[], matchedAmount, status, reviewerId?, asOf | Movimiento externo no aplicado duplicadamente |
| AccountingMapping | companyId, operationKind, accountRefs, effectiveFrom, revision | Publicación validada profesionalmente |
| ReportRequest | reportKey, filters, groupBy, columns, period, asOf?, exportFormat? | Filtros scopes y registros auditados |
| ReportSnapshot | reportId, reportKey, scope, generatedAt, asOf, sourceRefs, metricDefinitions, rows, totals, warnings | Distinción estimado/contable, sin duplicación |
| RoleGrant | principalId, capability, operation, scope, amountLimit?, validFrom/To, revision | Backend autoridad del permiso |
| CompanySettingsVersion | companyId, versionId, effectiveAt, status, changes, approvedBy?, revision | No modifica ventas/pagos históricos |
| PaymentDestination | destinationId, ownerId, bankCode, maskedAccount, keyAlias?, qrRef?, verifierIds[], effectiveAt | Secretos y cuenta completa protegidos |
| DeviceBinding | deviceId, siteId, registerId?, capabilities[], status, revision | Print job sent != papel confirmado |

## 4. Precisión y esquemas de dinero, stock y asignación
- Money por moneda como entero en unidad mínima representado por string hasta fijar stack, nunca flotante binario.
- `MoneyMinor` en COP requiere documentar reglas contables/redondeo y compatibilidad de ERPNext antes de publicar; no imponer COP a todos países.
- Cantidades como decimal-string con UOM comercial, factor hacia stock UOM y precisión por artículo.
- Un pago a múltiples facturas conserva **un movimiento monetario** y N aplicaciones en ledger de CxP/CxC; suma asignaciones + anticipo ≤ total.
- En una venta de $100.000 con $50.000 pendiente y $50.000 efectivo confirmado: confirmed=50.000, assignedPending=50.000 y unallocated=0, pero **paidConfirmedTotal=50.000**; no tratar el total como cobrado.
- `asOf` distingue hora de consulta de hora del ledger y hora de conteo; para zonas usar `cutoffAt` + movimientos por SKU hasta `capturedAt`.

## 5. Dudas de mapeo que impiden reclamar contratos definitivos
- Campos reales del esquema ERPNext/DocType y versión usada.
- Moneda y precisión decimal y equivalencias de UOM.
- Filtros de datos fiscales por jurisdicción.
- Reglas de vigencia, permisos y límite; modelo de empresa/site y rol.
- Estado/revisión de documentos contables publicados y fiscal externo.
Estas dudas son **gates técnicos**, no razón para volver a discutir el flujo empresarial. No implementar Zod real aquí.

## 6. DTOs adicionales del núcleo POS transaccional
Estos contratos completan el estado que **no puede residir únicamente en QuickSale o un diálogo de PrimeReact**.
| DTO lógico | Campos mínimos | Reglas de contrato |
|---|---|---|
| SaleDraft | saleDraftId, tenantId, siteId, registerId, shiftId, customerId?, lines[], totalsPreview, status, revision, priceQuoteRefs[], createdAt, updatedAt | Cualquier cambio de ruta conserva draft; cantidades/precios revalidados; no confirma venta al renderizar |
| CartLine | lineId, sku, variantId?, uom, qtyDecimal, conversionFactor, priceQuoteRef, discountAuthorizationRef?, taxQuote, availableAsOf | Línea estable por configuración de venta, no por índice visual; descuento con trazabilidad |
| PaymentSession | sessionId, saleDraftId, revision, requestedTotalMinor, confirmedTotalMinor, allocatedPendingMinor, unallocatedMinor, paymentAttemptIds[], status | Estado durable hasta resolución; no se convierte a SaleDraft libre al cerrar modal |
| PaymentAttempt | attemptId, paymentSessionId, method, amountMinor, destinationSnapshot?, externalRef?, status, idempotencyKey, createdAt, resolvedAt? | Un leg independiente, incluso repetido mismo método; UNKNOWN mantiene intento original |
| EvidenceBundle | bundleId, paymentAttemptId, draftPhotos[], sentPhotos[], evidenceStatus, submittedAt?, revision | Rehacer foto antes del envío; luego versionar/adicionar, no alterar evidencia enviada |
| SaleRecord | saleId, originalSaleDraftId, paidConfirmedMinor, outstandingMinor, fiscalDocRefs[], fulfillmentRef?, status, postedAt, revision | Venta persistida una vez; referencias originales, no tocar retrospectivamente al reimprimir |
| FiscalDocumentStatus | fiscalDocId, saleId, providerRef?, issueType, status, submittedAt?, acceptedAt?, error? | Transmitido ≠ aceptado; contingencia/rechazo reales; sujeto a PT/DIAN |
| DocumentDelivery | deliveryId, fiscalDocId, channel, destinationRef, status, sentAt?, confirmedAt? | Enviado ≠ entregado si no hay recibo verificable |
| PrintJob | jobId, documentRef, deviceBindingId, status, sentAt?, acknowledgedAt? | enviado a impresora ≠ papel impreso; reimpresión no crea otro fiscal |
| ApprovalSnapshot | approvalId, operationId, actorId, requestedBy, scope, amountMinor?, documentSnapshotHash, status, expiresAt | Se invalida si cambia el importe, destino, líneas o revisión |
| CloseIncident | incidentId, shiftId, kind, severity, cause, evidenceRefs[], status, assignedReviewer?, resolvedAt? | Incidencias abiertas explícitas en X/Z; política define bloqueo o cierre con pendientes |

**Etapa 3 no es una migración**: se debe comparar con los contratos existentes reales y decidir en implementación qué DTOs ya existen o son proyecciones.

