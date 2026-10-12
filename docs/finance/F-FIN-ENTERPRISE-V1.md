# F-FIN — Modelo funcional financiero ESTÁNDAR EMPRESARIAL

**Vigencia funcional:** 2026-10-12. **Estado:** propuesta consolidada, sin código ni validación contable/fiscal aprobada. **Sustituye** al modelo simplificado temporalmente considerado ese mismo día. **Alcance:** CAJ-01..07 + TES-01..06 + CON-01..05 = 18 flujos. Incorporar pagos de gastos/compras/abonos de proveedores desde caja dentro de CAJ-05/TES-06, sin inflar el conteo.

## 1. Principio y arquitectura
SaaS multitenant → POS/Caja (ejecución) → Tesorería (custodia, saldos, conciliación) → Contabilidad (libros/ajustes/reportes) con trazabilidad hacia documentos de negocio. **No necesariamente en cascada temporal:** los asientos pueden generarse por documento autorizado sin esperar arqueo. Utilizar ERPNext como motor contable previsto; POS Core expone contratos/adaptadores, nunca segundo libro mayor ad hoc.

La UI muestra solo las capacidades apropiadas a cada empleado. Una empresa pequeña puede agrupar funciones en una persona; registrar conflicto o excepción cuando un actor inicia, autoriza y concilia la misma operación. Perfil no sustituye autorización granular por acción/sede/cuenta/límite.

## 2. Políticas empresariales propuestas
| Política | Regla |
|---|---|
| TENANCY | Aislamiento empresa, sede, caja y ámbito de lectura/escritura; libros por empresa |
| RESPONSABILIDAD | Configurable por caja o cajero, con custodio nominal, turno y cambio auditado |
| SEGREGACIÓN | Ejecutar / aprobar / conciliar permisos independientes; doble aprobación en acciones sensibles según umbral |
| LÍMITES | Importes máximos, frecuencia, destino, proveedores y cuentas habilitadas por empresa |
| PAGO MÚLTIPLE | Intentos separados por pago, importe y medio; duplicación no altera saldo; saldo confirmado correcto |
| EVIDENCIA | Múltiples fotos en transferencia manual; fotografía nunca equivale a acreditación |
| MOVIMIENTOS | Tipo, origen, destino, soporte, ejecutor, autorizador, receptor |
| CUSTODIA | Conteo de entrega/recepción; dinero en tránsito rastreable |
| ARQUEO | Por denominaciones COP, preferiblemente ciego; diferencias visibles/no autocompensadas |
| CONCILIACIÓN | Operativa diaria de incidencias; bancaria periódica configurable y trazable |
| CORRECCIONES | Reversos/ajustes referenciados, sin borrado destructivo de operación publicada |
| DUPLICADOS | Idempotencia en ventas, pagos, desembolsos, reembolsos, importación extractos |
| DISPONIBILIDAD | Sin red no simular confirmaciones bancarias/fiscales; pagos inciertos deben consultarse |
| IMPUESTOS | Por producto/cliente/jurisdicción según configuración fiscal validada, nunca constante hardcodeada |
| ARCHIVO | Comprobantes privados, retención y acceso con políticas legales y de seguridad |
| MULTISEDE | Consolidados por empresa y segregación de sedes; movimientos intersede con contrapartes correctas |

**No fijar umbrales monetarios arbitrarios.** Configuración por empresa y validación contable.

## 3. Responsables
- Cajero: venta/cobro, evidencia, gastos y pagos al proveedor **autorizados**; no elegir cuentas contables.
- Cajero responsable: fondo/apertura, arqueo, custodia; rol nominal por turno configurable.
- Supervisor: autorización de devoluciones, descuentos, diferencias y salidas sobre umbral.
- Administrador/propietario: configuración, cuentas, verificación de ingreso desde teléfono, control de riesgos, autorizaciones.
- Tesorería/financiero: bancarización, extractos, conciliación, cartera y proveedores, fondos en tránsito.
- Contador: marco contable, plan de cuentas, impuestos, reconocimiento, ajustes y cierres.
- Auditor: acceso de lectura a eventos/soportes permitidos.
Reglas RBAC + capabilities + límites contextuales; nunca seguridad basada solo en botones ocultos.

## 4. Caja — 7 flujos

### CAJ-01 — Asignación y responsabilidad
**Flujo:** configurar sede/caja/terminal → elegir responsabilidad por caja o persona → asignar usuario/turno y operadores → aceptar custodia.
**Roles:** administrador configura, responsable acepta, supervisor releva.
**Excepciones:** ausencias, turnos solapados, caja compartida, sustituciones urgentes.
**Aceptar:** cada operación atribuye empresa+sede+caja+turno+ejecutor; custodio identificado, cambios de custodia registrados, incompatibilidades bloqueadas.

### CAJ-02 — Apertura y fondo
**Flujo:** contar monedas y billetes COP por denominaciones → origen de fondos → observación y diferencia → confirmación apertura.
**Roles:** cajero responsable; supervisor excepciones.
**Excepciones:** fondo no coincide, caja abierta, diferencia de conteo, apertura offline restringida.
**Aceptar:** fondo inicial auditable, conteo reproducible, un solo turno activo válido, sin duplicación de apertura.

### CAJ-03 — Cobros y pagos mixtos
**Flujo:** carrito/venta y total → pagos independientes (efectivo, tarjeta, banco/Nequi/Daviplata/Bre-B, crédito) → confirmar cada resultado → saldo/cambio → venta.
**Roles:** cajero, supervisor para crédito/override.
**Excepciones:** parcial, múltiples de mismo medio, rechazado, excedente, datáfono incierto, saldo abierto.
**Aceptar:** suma confirmada precisa; pendientes separados; no doble cobro por reintento; crédito autorizado es obligación, no dinero bancario.

### CAJ-04 — Verificación bancaria externa
**Flujo:** destino configurado → cajero capta varias imágenes y previsualiza/repite → envía a administrador → responsable revisa y comprueba acreditación oficialmente → aprueba/rechaza o pide evidencia.
**Roles:** cajero captura; responsable de cuenta verifica desde móvil; auditor visualiza según permiso.
**Excepciones:** fotos ilegibles, QR comprobante expirado, monto distinto, recibo reciclado, no acreditado, sin conexión.
**Aceptar:** fotos vinculadas y versionadas, revisión autorizada con actor+fecha+referencia, ninguna simple foto confirma pago.

### CAJ-05 — Gastos, compras y pagos a proveedores en caja
**Flujo:** elegir gasto/compra contado/abono/pago total/retiro/reposición/anticipo → seleccionar beneficiario/proveedor → factura(s) antiguas o nuevas → importe y origen (caja o banco permitido) → comprobar saldo/permisos/soporte → autorizar → ejecutar.
**Roles:** cajero habilitado, administrador aprobador, Compras valida mercancía/documentación.
**Excepciones:** efectivo insuficiente, pago mayor a saldo, factura duplicada o disputada, anticipo sin factura, falta soporte, error tras procesar.
**Aceptar:** pago único aplicable a varias facturas, reducción CxP y origen monetario real; pagar compra ya contabilizada NO genera otra compra/costo; "saldar" ≠ "anular".

### CAJ-06 — Custodia y traslados
**Flujo:** solicitar traslado caja/caja fuerte/otra caja → aprobar si aplica → entregar → contar/aceptar recepción → diferencia o fondos en tránsito.
**Roles:** entregador, receptor, supervisor excepciones.
**Excepciones:** recepción parcial, diferencia, traslado no recibido, sustitución responsable.
**Aceptar:** no registrar gasto/ingreso interno ficticio; origen/destino equivalentes, importe e historial de custodios; no doble recepción.

### CAJ-07 — Control, conciliación y cierre integral de caja
**Flujo:** informe X repetible → conciliación documental de facturación, ingresos, egresos y custodia → conteo ciego por denominación cuando se configure → diferencia/incidencias → observación/aprobación → cierre e informe Z. Detalle: [CASH-CONTROL-AND-CLOSE.md](CASH-CONTROL-AND-CLOSE.md).
**Roles:** cajero responsable y revisor con permiso.
**Excepciones:** faltantes, sobrantes, transferencia en verificación, pago pendiente, soporte/documento faltante, autorización pendiente y cierre interrumpido.
**Aceptar:** efectivo esperado/contado separados; documentos y pagos electrónicos conciliados sin contarlos como efectivo; diferencia/incidencia auditada; X no cierra; Z es único/auditable; turno cerrado bloquea nuevas transacciones; cierre no genera doble contabilización.

## 5. Tesorería — 6 flujos

### TES-01 — Conciliación operativa de cobros
**Flujo:** agrupar pagos por cuenta/fecha → revisar verificación → conciliar comprobantes contra acreditaciones → incidencias.
**Roles:** financiero, administrador verificador.
**Excepciones:** referencia duplicada, dato incompleto, monto dispar, mismo movimiento en dos ventas.
**Aceptar:** confirmado tiene evidencia independiente; pendiente/rechazado permanece identificable; no duplicación.

### TES-02 — Conciliación bancaria
**Flujo:** importar CSV/Excel/extracto oficial por cuenta/período → deduplicar → sugerir matches → revisar discrepancias → confirmar enlace.
**Roles:** tesorería/contador.
**Excepciones:** comisiones, ingresos sin identificar, abonos agrupados, fechas diferentes, reversos, extracto duplicado.
**Aceptar:** cada movimiento conciliado una sola vez o pendiente justificado; conservar original, sin crear segunda venta ni cobro.

### TES-03 — Transferencias internas/consignaciones
**Flujo:** retirar dinero → entregar/caja fuerte/fondos en tránsito → consignar a banco → verificar abono.
**Roles:** custodios, tesorería.
**Excepciones:** demora de acreditación, monto recibido distinto, soporte faltante, consignación devuelta.
**Aceptar:** transferencia interna no es ingreso nuevo; dinero rastreable en tránsito y cuentas origen/destino.

### TES-04 — Reversiones y reembolsos
**Flujo:** buscar original → elegibilidad/cantidad/importe → aprobación → operar reverso o desembolso → asociar inventario/ajuste fiscal cuando aplique → conciliar.
**Roles:** solo personal autorizado; tesorería supervisa.
**Excepciones:** doble devolución, parcial, reverso incierto, otro medio, saldo insuficiente.
**Aceptar:** importe máximo controlado; operación original intacta; ajuste/reembolso idempotente y trazable.

### TES-05 — Cuentas por cobrar
**Flujo:** crédito autorizado → factura/deuda/vencimiento → abono/anticipo → aplicar a documento(s) → actualizar saldo → control de vencidos.
**Roles:** tesorería, cajero para cobros permitidos, administrador aprueba crédito.
**Excepciones:** cupo insuficiente, pago no asignado, sobrepago, nota crédito, vencimiento.
**Aceptar:** saldo por cliente exacto; abono no duplica ingreso por venta; anticipos identificables.

### TES-06 — Cuentas por pagar
**Flujo:** recepción+factura/obligación → validación → cronograma → pagar total/parcial/múltiples facturas → aplicar/conciliar.
**Roles:** Compras documenta; cajero ejecuta permitido; tesorería controla; supervisor autoriza.
**Excepciones:** factura repetida, proveedor/cuenta alterado, diferencia pedido-recepción, documento disputado, anticipo, sobrepago.
**Aceptar:** cada factura muestra saldo y pagos; aplicación correcta a antiguas/nuevas; cuenta bancaria cambiada requiere verificación; pagar no genera otra compra.

## 6. Contabilidad — 5 flujos

### CON-01 — Parametrización/plan de cuentas
**Flujo:** contador define cuentas ingresos/IVA/inventario/costo/caja/banco/CxC/CxP/gastos → asignación a medios/capacidades → revisión/publicación por empresa.
**Excepciones:** cuenta inválida, inactiva, sede/centro faltante, cambio retrospectivo.
**Aceptar:** operaciones soportadas tienen mapeo contable correcto, versionado, sin elegir cuentas manualmente en POS.

### CON-02 — Asientos automáticos
**Flujo:** evento/doc de negocio confirmado → ERPNext publica efecto válido → ledger/stock/costo enlazados → revisión de fallos.
**Excepciones:** request repetido, asiento incompleto, desacople POS/ERPNext, contabilización al cierre, reversión.
**Aceptar:** débitos=créditos, no duplicados; fuente rastreable; momento de reconocimiento probado según ERPNext real.

### CON-03 — Impuestos y documentos fiscales
**Flujo:** determinar documento y tarifa por regla real → transmisión PT/DIAN cuando aplica → aceptación/rechazo/contingencia → entrega al cliente → impresión opcional.
**Excepciones:** numeración, rechazo, caída servicio, consumidor final no elegible, notas ajuste, impresora.
**Aceptar:** estado fiscal y documento conforme a autoridad; transmisión ≠ validación ≠ entrega ≠ impresión; no crear segundo documento al reimprimir.

### CON-04 — Informes y auditoría
**Flujo:** filtrar empresa/sede/período → consultar libros/caja/cartera/proveedores → indicadores e informes → trazabilidad.
**Excepciones:** sync atrasado, saldo sin conciliar, permisos, datos incompletos.
**Aceptar:** cifras rastreables a origen, ámbito de acceso seguro y fecha de actualización visible.

### CON-05 — Ajustes y cierre periódico
**Flujo:** conciliar → revisar obligaciones/impuestos → registrar ajustes con soporte y aprobación → cerrar período → bloquear edición común.
**Excepciones:** factura tardía, período cerrado, ajuste retroactivo, diferencia sin explicar.
**Aceptar:** correcciones no destructivas, cierre contable distinto de cierre de turno, revisión contable demostrable.

## 7. Reglas contables para no confundir dinero con ingreso
- Trasladar COP 300.000 de caja a caja fuerte: caja registradora -300.000; caja fuerte +300.000; efectivo total empresa no cambia; no crear venta ni gasto.
- Abonar factura antigua de proveedor: baja CxP y efectivo/banco, sin comprar de nuevo.
- Cobrar factura de crédito antigua: baja CxC y sube caja/banco, sin venta adicional.
- Datáfono líquido menos comisión: preservar cobro bruto; comisión/retención diferenciada contablemente.
- Anticipos cliente/proveedor: saldos por aplicar, no imputación automática arbitraria a ventas/compras.
- Arqueo: físico efectivo en caja; pago digital confirmado no es billete disponible, diferencia no se oculta.
- Impresión fallida: transacción y documento siguen intactos.

## 8. Modelo de estado e invariantes
```text
CashShift: unopened -> open -> counting -> under_review -> closed
PaymentAttempt: created -> pending -> confirmed | rejected | unknown; unknown -> resolved only by trusted query
Verification: queued -> reviewing -> approved | rejected | more_evidence
CashDisbursement: draft -> approval_pending -> approved -> executed / rejected; correction separate
Transfer: prepared -> sent -> in_transit -> received | disputed
Reconciliation: unmatched -> proposed -> reviewed -> matched | exception
Payable/Receivable: open -> partial -> settled (or adjusted), overdue as orthogonal flag
FiscalDoc: draft -> submitted -> accepted | rejected | contingency
PrintJob: queued -> sent_to_device -> failed | acknowledged (when device allows)
```
No garantizar que estos sean nombres exactos de estados ERPNext; mapear vía adaptador.

## 9. Controles de seguridad y excepción
- Aislar empresas/usuarios/cuentas/soportes por permiso, no solo UI.
- No borrar pagos ejecutados ni imágenes después del envío sin auditoría; evidencias privadas/cifrado/retención.
- Requiere idempotencyKey en venta/pago/compra/pago proveedor/reversión e importación de extractos.
- Si falla red al confirmar, consultar status por identificador antes de reintentar.
- Si cajero es también administrador, mantener rastro de doble función y configurar controles de excepción de riesgo.
- Permisos de devolver o reembolsar separados de permiso de ver ventas.
- Controles de cierre para períodos fiscales, conciliaciones y transacciones pendientes.

## 10. Validación profesional y técnica pendiente
**Contador colombiano:** marco de información financiera aplicable, plan de cuentas/centros, reconocimiento, inventario, anticipo, CxC/CxP, gastos/retiros, faltantes/sobrantes, comisiones, retenciones, conciliación/cierres, conservación soportes.
**Especialista fiscal colombiano/PT:** FEV vs documento equivalente electrónico POS, momento de expedición, resolución y numeración, impuestos/tarifas, notas crédito/débito/ajustes, contingencias, identificación clientes, documento soporte, entrega al adquirente, vigencia DIAN.
**Pruebas ERPNext reales:** POS Opening/Closing Entry, POS Invoice vs Sales Invoice, momento de contabilización y stock antes/después del cierre, Payment Entry, Payment Reconciliation, Bank Transaction/Reconciliation, notas/returns y duplicados concurrentes.
**Seguridad:** límites y aprobaciones, permisos server-side, datos bancarios y comprobantes, auditoría de identidad, pruebas entre sedes/tenants.
**Internacionalización:** localización fiscal por país con integradores externos, obligaciones legales y protección de datos a validar antes de ofrecer servicios en cada país.

## 11. Criterios de aceptación extremos
1. Venta COP 100.000 pagada COP 50.000 Nequi (pendiente) y COP 50.000 efectivo: confirmado 50.000 y 50.000 por verificar; al aprobar Nequi, saldar; sin doble asiento.
2. Dos transferencias independientes a mismo o distinto banco con varias fotos por intento.
3. Terminal queda incierta: sin reintento destructivo; registro y consulta de resultado.
4. Proveedor con tres facturas; un pago COP 250.000 aplicado a dos, saldo correcto y una sola salida en origen.
5. Supervisor deniega gasto: caja no disminuye.
6. Custodia caja → caja fuerte COP 300.000 sin duplicar ingreso.
7. Faltante en arqueo COP 20.000 con incidencia y revisión, no ajuste silencioso.
8. Reembolsos parciales y repetidos protegidos.
9. Extracto repetido no duplica movimientos.
10. Factura transmitida/validada pero impresora falla: misma factura permite reimpresión.
11. Cierre mensual impide edición directa retroactiva; ajustes controlados.
12. Ninguna operación entre tenants/sedes fuera del ámbito autorizado.

**Estado final:** funcionalmente documentado; aprobado solamente el **modelo estándar empresarial** y las decisiones A del registro. Políticas de umbrales, modelos contables y fiscalidad quedan pendientes de firma técnica/profesional.

