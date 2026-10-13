# REP — Reportes, historial y auditoría (grupo 8)

**Aprobación funcional:** usuario, 2026-10-12. **Versión:** v1.0 funcional. **Estado técnico:** informes por implementar/probar; no acreditar cifras ni cierres fiscales. **Alcance:** REP-01..REP-09.

## Capas de información
1. **Operativa**: turno/caja, ventas, cobros, pedidos, inventario, zonas, incidentes; tiempo de actualización visible.
2. **Gerencial**: empresa/sede, períodos, productos, clientes, márgenes comprobables, stock, cartera y cumplimiento.
3. **Contable**: libros, impuestos, CxC/CxP, ajustes y cierre desde autoridad ERPNext/CON, sin inventar ledger propio de reportes.

Un KPI debe tener fórmula, origen, filtros, acceso por rol, periodicidad y trazabilidad hacia documentos; jamás sumar movimientos internos como nuevos ingresos.

## Flujos
| ID | Resultado / responsables | Controles y excepciones |
|---|---|---|
| REP-01 | Informe X provisional, supervisores/cajero autorizado: corte consultable múltiples veces SIN cerrar turno | Declarar ámbito/fecha, incluir ventas, medios, deuda nueva, recaudos cartera, egresos, transferencias e incidencias |
| REP-02 | Informe Z definitivo único por caja/turno, numeración y custodia, revisión/aprobación | No borrar registros, no duplicar cierre, conservar diferencias/autorizaciones y estados no resueltos |
| REP-03 | Consolidado diario por sede y cajas/turnos, manager | Sumar sólo hechos únicos; trasferencias internas neutralizadas; POS X/Z ≠ libros contables |
| REP-04 | Historial buscable de ventas, pagos, facturas, clientes, anulaciones, devoluciones | Trazabilidad hasta originales, vistas por permiso, nunca reescribir hechos |
| REP-05 | KPIs comerciales: ventas netas, categorías, turnos/empleados, hora, ticket, productos y margen si es verificable | Marcar estimado vs contable, devoluciones e impuestos adecuadamente considerados |
| REP-06 | Stock, entradas/salidas/traslados, rotación, diferencias y conteo diario por zonas | Prioridad zona ≠ estado conteo; cobertura por fecha, discrepancia abierta, reincidencia |
| REP-07 | Cartera (CxC/CxP), vencimientos, abonos, proveedores y saldos | Fuente TES/CON única; abonos antiguos no crean ventas/compras nuevas |
| REP-08 | Auditoría acciones: ejecutor/aprobador/revisor, motivo, cambios, afectación y evidencia | Datos privados y registro no destructivo; permisos, retención y exportaciones controladas |
| REP-09 | Filtros/exportaciones y reportes programables según capacidad | Auditoría de exportación, acceso multitenant, protección de datos, paginación y fallas |

## Informe X/Z integral aprobado como ampliación F10/CAJ-07
**X** = resumen provisional al instante de consulta; se puede emitir múltiples veces sin cerrar. **Z** = corte definitivo con ID único e instante de cierre, asociado a responsables y entrega de custodia; no altera/borrar ventas por sí mismo.

Cada cierre revisa:
- Facturación: contado, crédito, documentos fiscales aceptados/rechazados/pendientes, impuestos, descuentos, notas y anulaciones.
- Ingresos: efectivo de venta, recaudos de créditos anteriores, anticipos, transferencias verificadas y no verificadas, tarjeta, devoluciones y otros fondos.
- Egresos: gastos, compras pagadas, abonos/pagos totales proveedor, retiros, reembolsos y anticipos, con soporte.
- Custodia: fondo inicial, entregas, caja fuerte, consignaciones, traslados y fondos en tránsito.
- Arqueo: efectivo esperado vs contado por denominación, sobrantes/faltantes, observaciones y autorizaciones.
- Incidencias: transacciones inciertas, documentos faltantes y aprobaciones pendientes; política formal sobre cierre con pendientes.
- Cierre caja/turno ≠ cierre contable del período, e Informe Z **es reporte interno**; no reemplaza documentos electrónicos/fiscales DIAN.

El POS debe **precargar cifras y mostrar solo incidencias que requieren intervención**. Contador puede auditar resumen con drill-down a fuente, nunca obligar a cajero a construir libro mayor.

## Panel gerencial: indicadores aprobados para diseño
- Ventas netas por sede/período.
- Dinero conciliado caja/bancos, pendiente por verificar separado.
- Inventario/rotación/diferencias.
- Conteos por zonas: cobertura dentro de frecuencia, pendientes por aprobar, reincidencia.
- Cuentas por cobrar y pagar con vencimientos.
- Incidencias abiertas y tiempos de resolución.
Los KPIs no contienen valores inventados ni semáforos engañosos. Cualquier cifra estimada lleva etiqueta y fecha.

## Roles y acceso
- Cajero: información del turno/caja, X cuando permiso; Z si es su responsabilidad y autorizaciones satisfechas.
- Supervisor: incidencias, autorizaciones, diferencias y consolidado de su ámbito.
- Gerencia/tesorería: cuentas, caja, KPIs, cierres y conciliación por sede/empresa.
- Contador: libros/reportes regulados y evidencia contable.
- Auditor: registros inmutables/soportes según permiso.
Exportaciones sensibles sólo a roles habilitados y registradas.

## Criterios de aceptación
1. Ejecutar X dos veces no cierra turno ni borra movimientos.
2. Ejecutar Z dos veces bajo mismo cierre no crea dos cierres ni duplica asientos.
3. Un cierre que tiene venta crédito nueva, recaudo de factura antigua, abono a proveedor, gasto y traslado a caja fuerte refleja cada rubro en su lugar correcto.
4. Consolidar dos cajas con traslado entre ellas no suma doble ingresos.
5. Factura aceptada pero impresora fallida se informa como fiscal aceptada/impresión fallida.
6. Producto contado pero diferencia sin aprobar: cobertura y discrepancia se reportan por separado.
7. Gerencia puede filtrar fecha/sede/producto y navegar a documento fuente; otro tenant no puede consultar esos datos.
8. Un informe de margen refleja si es estimación o dato contable con costeo oficial.
9. Exportación no expone datos de cuentas/fotografías sin permiso y registra actor/fecha.

## Pendientes técnicos
Definir fórmula exacta por KPI, zonas horarias, cortes, latencia, paginación, fuente ERPNext, criterios fiscales de soporte y retención legal; contabilidad/DIAN validan lo suyo. No usar dashboards como evidencia de corrección transaccional.
