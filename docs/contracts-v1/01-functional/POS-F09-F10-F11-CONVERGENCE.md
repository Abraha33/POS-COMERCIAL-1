# POS F09/F10/F11 — Cierre de responsabilidades y alcances

**Etapa 1 de integración funcional.** No crear subdominios contables nuevos. Reutilizar F-FIN, REP, COM, CLI y CAT aprobados.

## F09 — Movimientos de caja
**Definido en CAJ-05 y CAJ-06.** La UI del cajero ofrece operaciones preconfiguradas: gasto, compra contado, pago proveedor (vieja/nueva factura y múltiples), anticipo, retiro/reposición, transferir a caja fuerte/caja/banco. Un formulario dinámico solicita sólo importe, medio/origen, beneficiario/documentos y soporte requeridos por política. Requiere saldo disponible según medio, permiso/umbral y autorización cuando aplica; los movimientos internos no son ingresos nuevos. Rechazado/UNKNOWN y error posterior a ejecución no deben permitir duplicación por reintento.

**Pendiente técnico y de configuración:** límites por empresa, obligatoriedad de soporte, segregación, tolerancias y adapter Payment Entry/Stock Entry/contable. No redefinir concepto del movimiento.

## F10 — Control y cierre integral
**Definido en CAJ-07 y REP-01..03.** Proceso: X provisional → conciliar ventas de contado y crédito, notas/documentos fiscales, recaudos de cartera, pagos mixtos, gastos, compras/proveedores, anticipos, retornos/reembolsos y traslados/custodia → arqueo físico por denominación → diferencias/incidencias/revisión → Z definitivo único por turno/caja → consolidado sede. Cierre contable mensual separado del turno y del Z. **Contar efectivo** distinto de conciliar pagos electrónicos/bancos/facturas.

Excepciones: documento fiscal pendiente/rechazado, transferencia en verificación, pago card UNKNOWN, falta/sobra de dinero, cierre interrumpido, movimientos tardíos y supervisión no disponible. Política de cierre con pendientes requiere reglas configurables: registrar y escalar o bloquear solo cuando normativa/riesgo lo exija. Ni X ni Z crean pago nuevo por sí mismos.

## F11 — Historia y auditoría
**Definido en REP-04..09.** Búsqueda por venta, factura, turno, caja, cliente, producto, rango fecha, usuario, medio, estado, error/incidencia y sede. Resultados compactos con detalles/documentos asociados y acciones contextuales: ver, reimprimir **mismo documento**, reenviar, solicitar cambio/devolución, consultar pagos y eventos. No corregir o anular mediante mutación destructiva; flujos F07/TES-04/CON aplicables. Auditor con permisos lectura, evidencia privada protegida, exportaciones auditadas.

## Aceptación cruzada
1. Gasto efectivo de 20 → reduce efectivo esperado del turno y mantiene soporte/actor, sin nueva venta.
2. Pago de 100 a dos facturas proveedor → una salida monetaria y dos asignaciones CxP, informe X/Z lo clasifica como proveedor.
3. Cobro de crédito antiguo → entra dinero, no aumenta ventas actuales.
4. En un traslado de caja a caja fuerte se registran custodias, consolidado no duplica ingresos.
5. X repetido no cierra, Z repetido no duplica cierres ni asientos; reporte refleja diferencias y pagos inciertos.
6. Reimprimir venta fiscal aceptada no emite segunda factura.
7. Historial de usuario A sin permisos de sede B no deja consultar ni exportar B.

**Estado:** alcance funcional suficientemente definido, API/UI/pruebas aún por derivar. Reservar asuntos legales y fiscales para especialistas.

