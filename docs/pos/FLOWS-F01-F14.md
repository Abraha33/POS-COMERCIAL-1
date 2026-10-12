# POS — Inventario y mapa de flujos F01–F14

**Fuente:** decisiones del 2026-10-12, no verificación del working tree. **Clasificación funcional:** Avanzado = suficientemente descrito para vertical slice mock; Parcial = excepciones o contratos pendientes; Aplazado = profundizar después.

| ID | Flujo / responsables | Secuencia operativa | Estado / pendiente |
|---|---|---|---|
| F01 | Acceso (cajero/admin) | Identidad → tenant/sede → terminal/caja → permisos → turno válido | Avanzado. API y roles efectivos por probar |
| F02 | Apertura (cajero responsable) | Seleccionar caja → contar denominaciones COP → diferencia/observaciones → aceptar custodia → abrir | Avanzado. Integración contable |
| F03 | Turno (cajero/supervisor) | Activo, pausa, bloqueo, relevo y cierre; registrar custodia y permisos | Avanzado. Transiciones y condiciones de relevo |
| F04 | Venta rápida (cajero) | Buscar producto → ficha si precisa → variante/UOM/precio por volumen → cliente → carrito | Avanzado. Nuevo contrato 2 niveles y búsqueda atributos |
| F05 | Carrito suspendido (cajero) | Suspender borrador sin pagos comprometidos → navegar → recuperar y revalidar | Avanzado. Persistencia, reserva e incompatibilidad con pagos pendientes |
| F06 | Cobro / facturación (cajero/admin) | Checkout → pago(s) parciales/mixtos → verificaciones → venta → documento fiscal → entrega electrónica/impresión/entrega física | Avanzado. Integración e incertidumbre |
| F07 | Devoluciones (autorizado) | Buscar venta → validar cantidades → motivo → autorizar → reembolso/cambio → inventario/documento ajuste | Parcial. Detalle de efectos, permisos |
| F08 | Pedidos (cajero/despachador/admin) | Crear pedido → bandeja semáforo → preparar, incidencia, verificar, despachar → entrega | **Base funcional aprobada PED-01..08**; implementación y profundidad técnica APLAZADAS. Ver ../orders/PED-ORDERS-FULFILLMENT-V1.md |
| F09 | Movimientos financieros en caja | Gasto/compra/abono proveedor/retiro/reposición → permiso → soporte → registrar | Parcial. Derivado CAJ-05 |
| F10 | Control, conciliación y cierre integral X/Z | Revisar facturas contado/crédito, recaudos, compras, gastos, proveedores, traslados, arqueo y diferencias → X provisional / Z definitivo | **Definido funcionalmente** con REP-01..03/CAJ-07; integración y QA pendientes |
| F11 | Historial y reportes | Buscar operaciones, filtros, X/Z, consolidado, KPIs, inventario, cartera y auditoría por permisos | **Base funcional aprobada REP-01..09**, fuentes e implementación pendientes |
| F12 | Autorizaciones (supervisor/admin) | Solicitud con contexto → permiso y umbral → aprobar/rechazar → evento auditado | Avanzado. Autorización de verificación bancaria diferenciada |
| F13 | Offline y sincronización | Detectar red → operar sólo acciones seguras → cola local → reconciliar incertidumbres → sincronizar | Parcial. Seguridad y API |
| F14 | Configuración POS (admin) | Caja/terminal/turno/medios/cuentas/QR/impresoras/reglas/usuarios | Parcial. Modelo de datos y despliegue |

## Contratos ampliatorios aprobados el 2026-10-12

- [Catálogo y precios CAT-01..08](../catalog/CAT-PRODUCTS-PRICING-V1.md) alimenta F04/F06.
- [Inventarios INV-01..10](../inventory/INV-ZONES-CYCLE-STOCK-V1.md), conteo **diario por zonas**, semáforo de urgencia separado de estado.
- [Compras COM-01..08](../purchasing/COM-PURCHASING-SUPPLIERS-V1.md) se vincula a CAJ-05 y TES-06, sin duplicación contable.
- [Pedidos PED-01..08](../orders/PED-ORDERS-FULFILLMENT-V1.md): definición funcional base aprobada; **no adelantar construcción F08**.
- [Reportes REP-01..09](../reports/REP-REPORTS-AUDIT-V1.md): cierre integral X/Z y auditoría.

## Relaciones críticas
- F01/F02/F03 son precondiciones de una operación transaccional; F04/F05/F06 comparten contexto pero **no el mismo estado de ciclo de vida**.
- F06 se relaciona con F08 mediante pedido/venta/pagos sin doble cargo; F08 conserva decisión expresa de aplazar su profundización.
- F06/F07/F09/F10/F11 y F14 consumen capacidades comunes CAJ/TES/CON de F-FIN; no duplicar una segunda caja/contabilidad.
- F12 controla descuentos, precios especiales, anulaciones, reembolsos y desembolsos; revisión de comprobantes usa permiso propio.
- F13 intercepta toda operación susceptible de timeout, estado incierto o sincronización.
- F04 debe vincular producto/presentación/unidad/cantidad a reglas de pricing, lista de cliente, impuesto y stock sin datos inventados.
- F11 debe permitir inspeccionar cada evento original y sus correcciones, no modificar documentos históricos.
- F07 sólo ejecución por personal autorizado, el cajero ordinario puede consultar o solicitar según permisos.
- Los informes y fiscalidad no se consideran resueltos por incluir botones de prueba.

## Orden de vertical slices
0. Auditar árbol vigente y contracts; estado persistente, dominio de errores e idempotencia.
1. F04 + F05: búsqueda, ficha, cliente, carrito, suspensión/recuperación.
2. F06 + F12: pagos, fotos, verificaciones administrativas, confirmación, documentos/impresión mock.
3. F01 + F02 + F03: acceso, caja y turnos.
4. F09 + F10: caja, proveedores, custodia, arqueo; pruebas contables.
5. F07/F11/F14/F13: postventa, consulta, config, offline.
6. F08 después de nueva aprobación funcional, luego resto ERP.

## Criterio para declarar un flujo listo
Aprobar entradas/salidas, estados, permisos, errores, evidencias, criterios de aceptación, tests y conectores reales aplicables. 'Mock completo' y 'producción certificada' son estados distintos. Desarrollar la UI no autoriza enviar documentos a DIAN ni realizar cargos bancarios.

