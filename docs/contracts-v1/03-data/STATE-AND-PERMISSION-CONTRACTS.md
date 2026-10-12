# Etapa 3 — Máquinas de estado, autorización e invariantes

**Estado:** contrato declarativo propuesto, sin estados ERPNext verificados ni software. No extender ni crear F08/PED o F13/Offline. Los nombres siguientes son **identificadores lógicos**; adaptadores deben mapear a documentos reales y eventos confirmados.

## 1. Regla común de autorización
El permiso se evalúa **en servidor** por `tenant + site + resource + operation + amount + actor + effectivePolicyVersion + context (shift/register etc.)`, no por visibilidad UI ni claims sin validar. Distinguir solicitude de **aprobación**, publicación y conciliación. Si un mismo actor cumple varias funciones, conservar ese hecho y aplicar política de riesgo configurable. Una aprobación es recurso explícito vinculado a hash/snapshot de lo que autoriza y no vale si el importe, destino, líneas o revisión cambian.

## 2. Máquinas independientes
| Aggregate | Estados lógicos permitidos | Transiciones/invariantes esenciales |
|---|---|---|
| ProductDraft | draft → validation_pending → active; active → inactive; failed_validation → draft | Una venta histórica no cambia SKU/precio retrospectivamente |
| PricePolicy | draft → review → active → superseded | Vigencia/versiones; simular conflicto antes de activar |
| ImportBatch | uploaded → previewed → review_required → published/partial/rejected | Preview no modifica recursos; publicación idempotente por batch/row |
| StockReceipt | draft → counted → reviewed → posted; dispute/partial | Solo aceptado ingresa a vendible; recibido/rechazado/pendiente independientes |
| InventoryCountSession | scheduled → assigned → counting → submitted → reviewing → reconciled/closed_with_incident | 'contado' NO 'conciliado'; corte/movimientos concurrentes en líneas |
| CountLine | uncounted → recorded → discrepancy → recount_requested → recounted → accepted/adjustment_pending | Diferencia calculada con ledger por timestamp; registro no toca stock oficial |
| StockAdjustment | proposed → approval_pending → approved → posting → posted/unknown/rejected | Posting idempotente; UNKNOWN obliga consultar ERPNext antes de re-publicar |
| Transfer | requested → approved → dispatched → in_transit → received/partially_received/disputed | Origen/destino no duplican stock; recepción y despacho separados |
| PurchaseOrder | draft → approval_pending → approved → partially_received → received/closed/canceled | Facturar no equivale a recibir; cancelación con historial |
| SupplierInvoice | draft → review → posted/disputed/voided_by_adjustment | Duplicado proveedor+documento, CxP por fuente |
| SupplierPayment | draft → approval_pending → processing → confirmed/unknown/rejected | Un pago N facturas, UNKNOWN nunca ejecutar pago adicional a ciegas |
| CustomerCreditHold | requested → reserved → committed/released/expired | Dos cajas no exceden cupo por carrera concurrente |
| ReceivableCollection | initiated → verification_pending → confirmed/rejected/unknown → allocated | Foto no cuenta como confirmado; aplicaciones distintas del ingreso |
| ReturnCase | draft → inspection → authorization_pending → approved → effects_processing → resolved/partial_pending/denied | Efectos por fiscal/stock/refund independientes; derecho legal no bloqueado por política voluntaria |
| RefundAttempt | initiated → processing → confirmed/rejected/unknown → reversed_by_new_event | Refund UNKNOWN no doble reembolso |
| CashShift | unopened → open → counting → review_required → closed | Un turno único compatible; no seguir registrando después de cierre |
| CashMovement | draft → approval_pending → approved → processing → completed/unknown/rejected | Gasto, abono proveedor y transferencia interna distintos; una salida real |
| BankVerification | pending_evidence → pending_review → verified/rejected/more_evidence | Evidencia adjunta no acredita banco; responsable con acceso bancario valida externamente |
| Reconciliation | unmatched → suggested → reviewed → matched/disputed | Coincidencia no crea pago de nuevo |
| XReport | materialized_snapshot provisional sin transición de caja | Puede emitirse repetidamente, sin reset |
| ZReport | requested → finalizing → confirmed/unknown/blocked | Único por (empresa,caja,turno,closeCut); reintento devuelve mismo zId |
| SettingsVersion | draft → review → scheduled → active → superseded/rejected | Fecha efectiva, no reescritura transacciones históricas |
| ExportJob | requested → authorized → preparing → ready/failed/expired | Resultado solo actor autorizado; exportación auditada |

**Transición lógica desconocida:** `unknown` se añade SOLO cuando la operación puede haber sido procesada de manera irreversible y el resultado no está disponible, no como excusa para ocultar error de validación. No se usa un único enum para todos los agregados.

## 3. Matriz de permisos mínimos (candidatos a capacidades)
| Capacidad | Cajero | Ayudante | Supervisor | Admin empresa | Tesorería | Contador | Auditor |
|---|---|---|---|---|---|---|---|
| catalog.read / sale.priceQuote | Sí ámbito caja | limitado | Sí | Sí | limitado | lectura fiscal | según acceso |
| catalog.edit / pricing.publish | No | No | opcional reglado | Sí | No | solo validación impuesto | lectura |
| inventory.count / count.record | registra si asignado | cuenta si asignado | Sí | Sí | no | lectura | lectura |
| inventory.adjust.post | No | No | Sí con umbral | Sí condicionado | No | supervisa impacto | lectura |
| purchase.request / receipt.accept | según perfil | receptor asignado | Sí | Sí | No | lectura | lectura |
| purchase.invoice.post | No | No | según permiso | Sí | CxP | valida | lectura |
| customer.edit / credit.override | creación básica autorizada / no override | No | aprueba según umbral | Sí | tesorería cupo | consulta | lectura |
| return.case.request / execute | solicitar / **no ejecutar** | inspección asignada | Sí | Sí | reembolso autorizado | valida fiscal | lectura |
| cash.open/expense/paySupplier | según rol y límite | No | autoriza | Sí | puede pagar/conciliar | solo contabilidad | lectura |
| bank.verifyPayment | No | No | solo si autorizado y acceso bancario | Si tiene acceso | Si tiene acceso | No por defecto | lectura restringida |
| cash.Z.close | solicitar/revisar bajo rol | No | confirmar según política | Sí | revisar | observar | lectura |
| bank.reconcile / accounting.close | No | No | No | según empresa | conciliar | cierre y ajustar | lectura |
| reports.read/export | turno/caja | asignado | sede | empresa | finanzas | contable | ámbito auditado |
| settings.change + permission.grant | No | No | limitado | Sí por ámbito | bancarios específicos | fiscal/contable condicionado | No |

"Sí" es perfil base propuesto, siempre sujeto a `effectiveGrant` y servidor. **En particular la devolución/reembolso no se ejecuta por cajero común**. Cambios de cuenta bancaria, montos límites, ajustes de stock e informes sensibles deben tener revisión y auditoría.

## 4. Errores de dominio estándar y recuperación
| Código estable propuesto | Condición | Respuesta UI segura |
|---|---|---|
| VALIDATION_FAILED | Campos requeridos/formato UOM/importe/fecha | Mostrar campos, mantener borrador |
| PERMISSION_DENIED | Falta grant o ámbito | No exponer datos; pedir supervisor o detener |
| APPROVAL_REQUIRED | Límite/destino/documento sensible | Solicitar autorización vinculada a snapshot |
| REVISION_CONFLICT | Otro actor modificó recurso/cantidad | Refrescar, comparar y resolver, no overwrite silencioso |
| DUPLICATE_OPERATION | Mismo idempotencyKey/documento | Consultar operación existente y mostrar resultado |
| UNKNOWN_RESULT | Timeout con posible ejecución | **Consultar estado** por ID antes de cualquier reintento con efecto |
| AMOUNT_OVERALLOCATED | Aplicaciones > pago/deuda | Recalcular asignaciones, no publicar |
| PRICE_RULE_CONFLICT | Dos reglas sin precedencia | Impedir precio arbitrario; escalar regla |
| STOCK_INSUFFICIENT | Disponible insuficiente | Mostrar dato + opciones autorizadas; no stock negativo default |
| COUNT_MOVEMENT_CONFLICT | Movimientos cruzan instante de conteo | Conciliar/recontar solo líneas afectadas |
| FINANCIAL_DOCUMENT_PENDING | Fiscal/cobro/ajuste pendiente | Registrar incidencia, no declarar terminado |
| BANK_UNVERIFIED | Comprobante sin acreditación bancaria | Conservar pendiente, no contar como cobro |
| DEVICE_UNAVAILABLE | Impresora/terminal no accesible | Venta/documento quedan íntegros; reintentar solo job seguro |
| LEGAL_POLICY_REVIEW | Garantía/retracto requiere revisión | No aplicar rechazo comercial automático |
| REPORT_INCOMPLETE | Datos/fuentes no están al día | Banner con corte, evitar dato definitivo |
| FILE_PRIVACY_DENIED | Evidencia/exportación sin permiso | Ocultar contenido sensible y auditar solicitud |

## 5. Invariantes para dinero, stock y documentos
1. **Exactitud:** confirmados + pending + unallocated como conceptos distintos; crédito no es dinero.
2. Una compra registrada y luego pagada no puede convertirse en dos compras; un pago de N facturas no significa N desembolsos.
3. Movimiento entre cajas o caja fuerte no constituye ingreso ni gasto externo; fondo en tránsito identificado.
4. Devolución física/contable/fiscal/reembolso pueden desfasarse con expediente común; ningún evento se duplica.
5. Arqueo: efectivo en billetes/monedas, nunca contar comprobantes de tarjeta/banco como físico.
6. Zona inventario roja no equivale a "en conteo"; zona conciliada no equivale a "captura terminada"; stock oficial solo con ajuste aprobado.
7. Ledger ERPNext autorizado es autoridad para stock/contabilidad; vista operativa derivada/estimada muestra frescura.
8. La emisión fiscal, aceptación, entrega electrónica e impresión física permanecen estados independientes.
9. Un cierre X es consulta; Z único y inmutable por turno y corte, cierre contable periódico es proceso diferente.
10. Comandos que podrían afectar dinero o inventario se reintentan con la **misma** idempotencyKey y primero se consulta su estado ante timeout.
11. Auditoría append-only con revisión previa y posterior, actor, motivo, timestamp y documentos relacionados.
12. Nunca cruzar tenant/site/register sin permiso; exportaciones y fotos tienen acceso y conservación privados.

## 6. Adaptación a tecnología real
Estos estados no se declaran compatibles con ERPNext por nombrarlos. Validar traducción `state → ERP DocStatus/eventos`, reglas de reversión, colas, stock, verificación PT y dispositivo con pruebas. Los datos y operaciones no implican offline ni PED, mantenidos fuera de alcance.

## 7. Máquinas POS transaccionales explícitas (F01–F06/F12)
| Agregado | Estados lógicos | Invariante |
|---|---|---|
| SaleDraft | editing → suspended ↔ editing; editing → checkout_started → committed; editing → discarded | `discard` solo sin intentos comprometidos; navegar/desmontar QuickSale no cambia estado |
| PaymentSession | created → collecting → pending_verification / partially_confirmed / awaiting_resolution → ready_to_commit → finalized | Estado propio durable; no reseteable por cerrar modal; subtotal confirmado y asignado pendiente distintos |
| PaymentAttempt | created → submitted → pending/confirmed/rejected/unknown; unknown → confirmed/rejected por reconciliación externa | Mismo idempotencyKey por mismo intento; reintentar nueva cobranza cuando UNKNOWN está prohibido hasta resolver |
| EvidenceBundle | editing → submitted → under_review → accepted/rejected/more_evidence | Aceptar foto antes de enviar valida calidad, NO acredita dinero; fotos enviadas versionadas |
| FiscalDocument | prepared → submitted → accepted/rejected/contingency; rejected → nuevo procedimiento controlado | Nunca inferir aceptación de envío, impresión o cobro |
| DocumentDelivery | pending → sent → confirmed/failed cuando fuente provea confirmación | Sent no es delivered automáticamente |
| PrintJob | queued → sent_to_device → acknowledged/failed/unknown | Reporte de dispositivo no implica necesariamente papel impreso; reimprimir mismo documento |
| CloseIncident | open → reviewing → resolved / accepted_pending / escalated | Cierre Z considera incidentes según política; nunca ocultar estado desconocido |

**Prueba contractual futura obligatoria:** cambiar de Venta a Historial/Caja, cerrar diálogo, redimensionar la pantalla y reabrir mantiene SaleDraft/PaymentSession/AttemptID y el total confirmado. Un pago UNKNOWN no cambia automáticamente a rechazado.

