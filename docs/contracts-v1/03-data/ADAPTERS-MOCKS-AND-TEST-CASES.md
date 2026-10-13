# Etapa 3 — Adapters, fixtures y catálogo de escenarios MSW (no ejecutables)

**Estado:** contrato especificado, NO código ni handlers/fixtures reales. Pruebas **no ejecutadas**; se entregan entradas y respuestas esperadas como escenarios para etapa 4. **Excluidos:** PED/F08 y OFFLINE/F13. **Dependencias:** [Schema Catalog](SCHEMA-CATALOG.md), [Operation Matrix](OPERATION-MATRIX.md), [State and Permissions](STATE-AND-PERMISSION-CONTRACTS.md).

## 1. Adapters por responsabilidad
| Puerto lógico (interfaz futura) | Actor y operación | Adaptador previsto, NO confirmado | Restricción |
|---|---|---|---|
| CatalogRepository | search/get/upsert/variants | Frappe/ERPNext Items/UOM vía POS Core | No exponer DocTypes directamente al frontend |
| PricingService | quote/explanation/rules | POS Core → ERPNext Item Price/Pricing Rule o lógica autorizada | El servidor es fuente precio efectivo, no cliente |
| StockLedgerPort | stock/receipt/transfer/adjust/count snapshot | POS Core → ERPNext Stock Ledger/Entry/Reconciliation | Movimiento publicado solo una vez |
| ZoneSchedulePort | zonas/urgencia/sesiones/reconteos | Componente Holamigo propio + stock oficial ERPNext | Zona operativa ≠ bodega contable sin modelar |
| PurchasingPort | proveedores/orden/recepción/factura | POS Core → ERPNext Purchase Order/Receipt/Invoice | Validar fecha de afectación de stock/ledger y parcialidad |
| ReceivablesPort | cliente/crédito/abono/anticipo | POS Core → ERPNext Customer/GL/Payment Entry | Cupo y corrida concurrente requiere autoridad transaccional |
| ReturnPort | caso/cambio/inspección/documentos | POS Core + ERPNext Return/Stock + fiscal PT | No inventar nota fiscal ni reembolso confirmado |
| PaymentPort | payment attempts/settlements/refunds | Servicio de cobros + PSP/datáfono/banco según método | UNKNOWN requiere consulta por ID; no doble cargo |
| EvidencePort | fotos múltiples/versiones/acceso/retención | Almacenamiento privado autorizable | Foto no verifica acreditación; no publicar URLs sensibles |
| CashAndTreasuryPort | turnos/apertura/movimientos/X/Z/conciliaciones | POS Core + ERPNext POS Opening/Closing, Payment Entry, Bank Transaction | No duplicar asientos por corte X/Z |
| AccountingPort | reglas de cuentas/impuestos/cierre | ERPNext, validado por contador/PT | No construir libro mayor paralelo |
| ReportingPort | consultas/cortes/kpi/historial | Proyecciones/read models desde documentos autorizados | KPI con fuente y `asOf`, sin nuevas transacciones |
| SettingsAndPermissionPort | tenant/sede/capabilities/roles/cuentas/periféricos | Frappe/config Holamigo con verificación backend | Cambios versionados; permisos no dependen de UI |
| PrintPort | job/reprint/status dispositivo | Adaptador periférico a validar | Sent-to-device ≠ printed, jamás repetir emisión fiscal |

Cada adapter debe exponer `capabilities`, `health`, `mappingVersion`, `readiness` y condiciones de falta de soporte. Si ERPNext no admite una operación: reportar `UNSUPPORTED` y mock para UX; nunca falsear éxito.

## 2. Convención de fixture declarativo
Cada caso deberá definir: `scenarioId`, `domain`, `operationId`, `initialAggregateState`, `actorPermissions`, `tenant/site`, `input`, `expectedResponse`, `resultingState`, `createdRefs`, `expectedAuditEvents`, `expectedQueryInvalidations`, `networkCondition`, `testCategory`.
Todos los IDs/datos financieros de escenarios serán sintéticos, sin imágenes personales reales, cuentas bancarias ni documentos fiscales verdaderos. Si un mock devuelve `confirmed`, marcar claramente **SIMULADO**, jamás como validación real del banco/DIAN.

## 3. Escenarios MSW por dominio (catálogo, sin generar handlers)
| ID | Operación | Fixture inicial / respuesta simulada | Criterio para tests |
|---|---|---|---|
| CAT-S01 | CAT.Q03 | cliente especial y cantidad volumen, reglas solapadas con precedencia | Se explica regla ganadora y snapshot sin acumulación accidental |
| CAT-S02 | CAT.Q01 | búsqueda por material/color/producto atributos confirmados | Resultados correctos y estado vacío/ambiguo explícito |
| CAT-E01 | CAT.C05 | batch previo ya publicado | Mismo lote no crea SKU duplicado |
| INV-S01 | INV.Q02 | siete zonas, 2 rojas (diferencia/vencimiento), 2 amarillas, 2 verdes, 1 gris | Prioridad y estado 'en aprobación' se muestran separados |
| INV-S02 | INV.C04/C05 | Conteo inicia 10:00; entre conteo y capturas sale 2 y entra 3 de SKU | Expected ajustado por eventos, sin falso faltante |
| INV-E01 | INV.C06 | Usuario no autorizado / ajuste conflictivo | Bloqueo; stock oficial sin cambios |
| INV-E02 | INV.C02 | pedido 10; recibido 6, aceptado 5, dañado 1 | Disponible +5, no +10 ni +6 |
| COM-S01 | COM.C03 | compra rápida recibida/aceptada y pago contado | Un stock entry y un desembolso, sin compra doble |
| COM-E01 | COM.C04 | factura proveedor número duplicado | Respuesta DUPLICATE_INVOICE con doc original |
| COM-S02 | COM.C05 | devolución parcial de mercancía aceptada | Stock/deuda/pago referencias coherentes |
| CLI-S01 | CLI.C04 | abono verificado 90 aplicado a facturas 30 y 50, anticipo 10 | Una entrada 90, dos aplicaciones, anticipo 10 |
| CLI-E01 | CLI.C03 | cupo disponible 100; ventas simultáneas 70+70 | Una queda bloqueada salvo override |
| RET-S01 | RET.C03 | factura 10 unidades, ya devolvió 3, solicita 4 | Remanente 3 tras publicar, efectos separados |
| RET-E01 | RET.C01 | solicita 8 cuando remanente 7 | QTY_EXCEEDED, draft intacto |
| RET-S02 | RET.C05 | venta crédito no recaudado, nota ajusta deuda | No entregar efectivo inexistente |
| RET-E02 | RET.C05 | PSP aceptó refund pero backend recibe timeout | UNKNOWN, consulta al proveedor; no duplicar refund |
| FIN-S01 | FIN.C02/C04 | venta 100.000, efectivo 50.000 confirmado, Nequi 50.000 en revisión | paidConfirmed 50.000, assignedPending 50.000; factura no totalmente cobrada |
| FIN-S02 | FIN.C03 | tres fotos, se reemplaza una antes de enviar | Dos+ fotos finales asociadas; no acreditar banco por foto |
| FIN-S03 | FIN.C06 | un pago 250.000 repartido a facturas proveedor elegibles | Una salida de caja + N aplicaciones contables |
| FIN-S04 | FIN.C07/C08 | traslado 300.000 caja a caja fuerte | Total empresa constante; custodia cambia |
| FIN-E01 | FIN.C10 | cerrar Z con diferencia e incidente pendiente | Exigir autorización o registrar caso por política; nunca ocultar |
| FIN-E02 | FIN.C10 | reintento idéntico de cierre ya confirmado | mismo Z, ninguna duplicación de GL/caja |
| FIN-E03 | FIN.C11 | extracto CSV importado dos veces | movimientos duplicados detectados; no ingreso nuevo |
| REP-S01 | REP.Q01/Q02 | dos X y un Z por turno | X no cierra, Z fijo y numerado |
| REP-S02 | REP.Q03 | dos cajas con traslado interno entre ellas | Consolidado no suma traslado como ingreso |
| REP-S03 | REP.Q05 | zona capturada, diferencia sin aprobar | Cobertura física vs reconciliación diferentes |
| REP-E01 | REP.C01 | cajero intentando exportar bancos de otra sede | Rechazo de permiso y auditoría |
| ADM-S01 | ADM.C05 | cuenta destino cambia mientras PaymentAttempt antiguo pendiente | El intento antiguo conserva cuenta snapshot; nuevo usa nueva versión |
| ADM-E01 | ADM.C03 | desactivar caja con turno abierto | ACTIVE_SHIFT_CONFLICT, sin pérdida de historial |
| ADM-E02 | ADM.C04 | usuario eliminado del rol intenta comando directo | PERMISSION_DENIED de servidor aunque UI siga cacheada |

## 4. Errores de transporte/recuperación SIN diseñar F13 offline
- **Request inválido antes de enviarse**: no se crea operación, se corrige y reenvía.
- **409 revisión**: recuperar versión actual y elegir resolver diferencias; conservar borrador de usuario.
- **403 permiso**: no enviar acción repetidamente; mostrar permiso insuficiente y opción de autorización formal si existe.
- **Timeout de POST financiero/stock**: consulta por `operationId/idempotencyKey` con backoff controlado y decisión humana cuando servicio externo no informa; no emitir nuevo intento económico.
- **Respuesta de dispositivo/fiscal desconocida**: mantener estado parcial y advertencia; no reemitir documento/cobro automáticamente.
- Esta sección solo cubre integridad de estados inciertos para operaciones *con conexión normal*, **no** modela venta offline, sincronización, cola local ni conciliación de cambios desconectados.

## 5. Contratos futuros de pruebas (no ejecutadas aquí)
- Contrato DTO: valid/invalid/idempotent/unauthorized/revision; validación Zod/frontend y backend independiente.
- Unit dominio: precio/UOM/dinero, score zona, diferencia movimiento concurrente, aplicación multi-factura.
- UI: carga, vacío, error, 403, conflicto, pending, UNKNOWN; foco/escape/teclado y lector barcode.
- E2E: caso normal, error y recuperación por vertical; capturas 1366/768/375, consola sin errores y axe.
- Integración: ERPNext/DIAN/banco/dispositivo con respuestas confiables y profesional contable/fiscal.
- Benchmark: metas de respuesta configurable, no declarar 150–200 ms hasta medir.
- No inferir 'test PASS' de un fixture, captura o texto de este archivo.

## 6. Gate de diseño terminado frente a implementación
Este catálogo satisface **especificar** escenarios MSW/fixtures para etapa 3. Generar handlers, archivos JSON reales, tests, snapshots y mocks operando pertenece a **etapa 4** explícitamente excluida.

## 7. Escenarios esenciales POS que complementan los dominios
| ID | Operación | Fixture | Resultado esperado |
|---|---|---|---|
| POS-S01 | POS.C02/C03/C04 | SaleDraft 3 líneas, cliente, regla precio, suspender y recuperar | Rehidratación por ID+revision, precios revalidados, sin borrar cliente |
| POS-S02 | POS.C05/C06 | total 100.000; efectivo 50.000, Nequi 50.000 (pendiente) | PaymentSession conserva leg IDs, pagado confirmado 50.000, pendiente asignado 50.000 |
| POS-S03 | POS.Q03 | usuario navega a reportes y vuelve, cierre de modal de cobro | PaymentSession íntegra, no se reinicia ni duplica |
| POS-E01 | POS.C07 | datáfono timeout con posible débito | PaymentAttempt UNKNOWN, consultar origen, no doble cargo |
| POS-E02 | POS.C07 | click doble / retry POST con igual idempotencyKey | Una venta publicada y mismo resultado de operación |
| POS-E03 | POS.C08 | fiscal aceptado, impresora falla | Mismo fiscal/documento; nuevo PrintJob sin reemisión |
| POS-E04 | POS.C09/C10 | aprobación precio cambia el total antes de ejecución | Se invalida ApprovalSnapshot anterior, necesita nueva aprobación |
| POS-E05 | POS.C06 | transferencia 3 fotos, una rehecha antes de enviar | Estado evidencia versionado, aprobar foto ≠ acreditar dinero |
