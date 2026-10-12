# QA — Matriz de bloqueadores y criterios de aceptación (2026-10-12)

**No es evidencia de que una prueba haya pasado.** Cada check requiere ejecución reproducible en frontend real y/o entorno Frappe+ERPNext.

## P0 — antes de unir desarrollo paralelo
- [ ] Auditar commit/branch del working tree local `capa-2-responsive` y fuentes `pos-proofs`; demostrar qué está realmente implementado en PrimeReact.
- [ ] Resolver y probar persistencia de `SaleDraft` y `PaymentSession` fuera de `QuickSale` / PosPage; cambios de vista, refresh y overlays no pierden estado.
- [ ] Un dueño de shells/router/stores/OverlayHost, otros agentes por features y worktrees; contratos compartidos congelados.
- [ ] Separar venta suspendida, checkout pendiente, pago incierto y venta comprometida.
- [ ] Modelar identificación de operación, versiones y idempotency key en servicios financieros; no duplicar intento tras timeout.

## P1 — durante vertical slice y antes de integración real
- [ ] Auditar OpenAPI actual (38 operaciones reportadas), reglas 00–07 y matriz funcional (86 funciones reportadas) sin tratarlos como confirmados.
- [ ] Precio por volumen + UOM + cliente + impuestos por producto, sin tarifa global fija.
- [ ] Mock explícito y test E2E de cliente arriba del carrito, búsqueda multiatributo y ficha dos niveles.
- [ ] Cobro mixto, cambio, tarjetas rechazo/timeout, crédito autorizado, captura múltiple y verificación móvil.
- [ ] Reintentos de impresión y estados separados emisión fiscal/entrega/impresión.
- [ ] Roles/permisos server-side y aislamiento multitenant/multisede.
- [ ] Conteos con ayudante/cajero/supervisor; diferencias no ajustan stock automáticamente.
- [ ] Movimientos de caja, abono de proveedores y cierre con impacto contable validado.
- [ ] Offline/tethering: red real vs red local vs cola durable; transferencias no confirmadas offline.

## E2E de venta / cliente / producto
| Escenario | Esperado |
|---|---|
| SKU/barcode exacto de producto único | Se agrega en un paso si política permite, sin modal innecesario |
| Búsqueda 'vaso plástico blanco' por atributos existentes | Combina filtros y muestra resultados comprobables |
| Producto con variante/presentación múltiple | Ficha permite elegir UOM, cantidad y precio; no mezcla escala con caja/paquete |
| Cambiar cliente o aumentar volumen | Recalcular lista/precio/total, validar incompatibilidades |
| Cliente nuevo/edición rápida | Campos pertinentes, permiso, validación; conserva carrito |
| Entrar a Pedidos y regresar | Mismo borrador/cliente/líneas/checkout; sin nueva venta |
| Suspender borrador sin pagos | Se recupera y revalida; no crear dos borradores iguales |
| Pago empezado y navegar | Estado sigue en 'cobro pendiente', nunca 'suspendido' silencioso |

## E2E de pagos y evidencias
| Escenario | Esperado |
|---|---|
| 100.000 COP: efectivo 50.000 + Nequi 50.000 sin verificar | Confirmado 50.000 / pendiente 50.000, saldo libre asignable 0, venta no tratada totalmente pagada |
| 100.000 COP: dos transferencias de 50.000 | Dos PaymentAttempt, dos grupos de evidencia/verificaciones |
| Adjuntar tres fotos y rehacer una antes de Enviar | Todas las fotos aceptadas se asocian al intento; no sobrescribir histórico enviado |
| Responsable aprueba desde teléfono | Confirmación con cuenta, actor, fecha, mecanismo; caja recibe actualización |
| Foto falsificada o QR expirado | Rechazo/pedir nueva evidencia; no ingreso contable |
| Datáfono rechazado/cancelado | Regresar al inicio del cobro; draft preservado |
| Datáfono timeout tras posible débito | Queda UNKNOWN; no recobrar hasta consultar |
| Transferencia no acreditada | Estado pendiente/rechazado; no cuenta como cobrado |
| Impresora desconectada después de validación | Misma venta/documento, reimpresión segura |
| Nueva factura fiscal al reimprimir | Prohibido |
| Pedido pagado y entregado después | Vinculación pedido + pago + documento, sin doble cobro |

## E2E financiero estándar
| Caso | Esperado |
|---|---|
| Caja asignada a cajero responsable por turno | Historial custodio y ejecutores sin ambigüedad |
| Fondo por monedas y billetes | Fondo inicial y diferencia con evidencia |
| Cajero paga gasto autorizado | Salida de efectivo y registro con soporte, sin pago duplicado |
| Cajero abona factura proveedor antigua y reciente | Disminución CxP por factura; no gasto/compra repetida |
| Proveedor tiene 3 facturas; un pago 250.000 a dos | Asignación y saldos correctos |
| Traslado caja → caja fuerte COP 300.000 | Caja -300.000, caja fuerte +300.000; dinero total sin cambio |
| Arqueo: faltante COP 20.000 | Diferencia/observación/aprobación, nunca ajuste oculto |
| Extracto banco importado dos veces | Duplicados rechazados; movimientos trazables |
| Reembolso repetido o parcial | No sobrepasa importe y no se ejecuta dos veces |
| Cierre mensual contable | Impide escritura corriente retrospectiva, ajustes controlados |
| Usuario de sede A intenta documento B | Rechazo de servidor, no solo esconder pantalla |

## Gate profesional y de producción
- [ ] Contador define plan de cuentas, marco aplicable, costos/inventario, CxC/CxP, IVA/retenciones, gastos/soportes, cierres y comisiones.
- [ ] Fiscal/PT valida FEV, DEE-POS, notas, numeración, oportunidad de expedición, DIAN, contingencias y entrega.
- [ ] ERPNext prueba POS Opening/Closing, stock real antes/después del cierre, Sales/POS Invoice, ledger, PaymentEntry y conciliación.
- [ ] Banco/datáfono simula rechazo/timeout/aprobado concurrente, conciliación segura.
- [ ] Seguridad: scope tenant/sede/caja/usuario, registros append-only, evidencia privada, protección de datos y retención.
- [ ] Operación: dispositivos/periféricos, fallas, restauración, supervisión, carga 60–70 pedidos diarios como escenario operativo, rendimiento target 150–200ms solo cuando medible, no promesa.
- [ ] QA unit/E2E/performance/a11y documentados con reporte y versión exacta.

## Resultado final posible por tarea
- PROPOSED: reglas redactadas, no verificadas.
- MOCK PASS: UI/interacción comprobada con fixtures.
- INTEGRATION PASS: API real y persistencia en backend probadas.
- READY FOR PILOT: escenarios bancarios/fiscales/contables validados por especialistas.
- PRODUCTION READY: controles legales, operativos, seguridad, respaldo, disponibilidad y pruebas de carga completados.

No usar porcentajes conversacionales como medición real del código.

## Casos nuevos por aprobación de CAT / INV / COM / PED / REP — 2026-10-12

**Todos pendientes de ejecutar**; aprobación funcional no significa PASS. Estos casos complementan F04/F10 y F-FIN sin reemplazar pruebas de transacción.

### CAT (productos/precios)
- [ ] Unidades caja/paquete/unidad/metro con factor exacto y escala por volumen no confundida con UOM.
- [ ] Cliente con lista especial y volumen: precio determinista y regla ganadora registrada; promociones no acumulables por defecto; permiso para descuento manual.
- [ ] Importación CSV/Excel con error por fila, deduplicación SKU y reintento sin borrar historial.
- [ ] Cambiar cliente, cantidad y vigencia en carrito recalcula y explica el cambio; venta publicada conserva snapshot.

### INV (diario por zonas)
- [ ] Empresa con siete zonas produce bandeja **diaria** priorizada rojo/amarillo/verde/gris; configuraciones permiten cualquier número de zonas y frecuencia.
- [ ] Zona roja por diferencia no pasa a verde solo por concluir captura: sigue incidencia hasta conciliación/revisión.
- [ ] Distinguir contador ayudante, capturador cajero y aprobador supervisor en auditoría.
- [ ] Conteo inicia a una hora definida, después ocurren venta, ingreso y traslado del mismo SKU: reconciliar movimiento hasta instante físico por ítem sin inventar faltante.
- [ ] Mismo SKU en dos zonas se agrega sin doble saldo oficial; zona probable no crea stock virtual.
- [ ] Conteo sin aprobar no muta stock; ajustes concurrentes/idempotentes con aislamiento por empresa.
- [ ] Recepción parcial, devolución cuarentena y venta concurrente respetan disponibilidad/negativos.

### COM (compras)
- [ ] Compra rápida completa y controlada producen igual movimiento contable cuando representan mismos hechos, sin duplicar la compra.
- [ ] Orden 10 unidades → aceptar 5, 1 rechazada, 4 pendientes → segunda recepción y saldo correcto.
- [ ] Diferencia de factura respecto a precio/recepción se bloquea/revisa; factura duplicada no genera obligación doble.
- [ ] Pago desde caja a tres facturas/anticipo actualiza CxP y efectivo una sola vez.
- [ ] Devolución proveedor parcial afecta stock y deuda con documentos relacionados.

### PED (contrato aprobado, implementación aplazada)
- [ ] Fecha prometida/riesgo, pago y antigüedad ordenan cola según regla actual; política alternativa pagados primero disponible.
- [ ] Status de preparación, pago, stock y entrega se muestran independientes; badge semáforo tiene texto.
- [ ] Pedidos 10 unidades y despacho parcial 6 conserva pendiente 4, no descuenta dos veces.
- [ ] Sustitución de SKU requiere consentimiento/autorización y recalcula precios/impuestos.
- [ ] Cancelar pedido pagado libera reserva y tramita devolución por F07/TES-04 sin borrar pagos.

### REP (X/Z, historial y gerencia)
- [ ] Dos consultas de X no cierran turno; Z repetido no genera segundo cierre ni movimientos duplicados.
- [ ] Cierre incluye venta crédito nueva, recaudo factura vieja, gasto, abono proveedor y traslado interno sin doble ingreso.
- [ ] Consolidación por sede de varias cajas excluye sumar ingresos dos veces al trasladar dinero entre ellas.
- [ ] Producto contado en zona pero pendiente de autorización muestra cobertura y discrepancia por separado.
- [ ] KPI ventas netas/conciliado/cartera/inventario muestra fuente, período, corte y situación de sincronización.
- [ ] Consultas y exportaciones respetan tenant, sede, rol y evidencias privadas.

## Gates de salida por grupo
1. Contrato funcional aprobado (cumplido en CAT/INV/COM/PED/REP para los 43 subflujos).
2. Contratos API/eventos/estados/roles y parametrización trazable (PENDIENTE).
3. Pruebas unitarias y E2E con mocks y casos de error (PENDIENTE).
4. Pruebas de integración ERPNext, inventario, permisos, fiscalidad, contabilidad cuando corresponda (PENDIENTE).
5. Piloto real y aprobación operativa (PENDIENTE).

## Etapas 1–3 documentadas — NUEVO CHECKLIST (2026-10-12)

Este checklist es documental: **NO marcar ninguna prueba E2E/unit/integración como PASS** por existir contrato.

- [x] Etapa 1: propuestas F07, CLI, ADM y convergencia F09/F10/F11 creadas y enlazadas (revisión negocio para nuevas P pendiente).
- [x] Etapa 2: nueve paquetes UI de seis secciones + Foundation creados en `docs/contracts-v1/02-ui/` (cotejo con código actual pendiente).
- [x] Etapa 3: schemas Zod conceptuales, operaciones lógicas, state machines, roles, adapter ports, mock scenario catalog y trazabilidad en `docs/contracts-v1/03-data/` (mapeo a OpenAPI actual pendiente).
- [x] Excluidos F08 Pedidos y F13 Offline de nuevas especificaciones de este encargo; etapa 4 no iniciada.
- [ ] Verificar branch frontend, OpenAPI y contratos de finanzas reales.
- [ ] Ratificar hipótesis F07 (consumidor/fiscal), CLI (crédito) y ADM (permisos/destinos).
- [ ] Diseñar y ejecutar en trabajo posterior Zod, MSW, pruebas UI/QA y adapter ERPNext; fuera del encargo actual.

Documentación: [índice de contratos etapas 1–3](contracts-v1/README.md). El indicador 38 % preparación frontend o 73 % funcional informado por Codex no queda certificado por este checklist; solo una auditoría basada en entregables y pruebas permite recalcularlo.

