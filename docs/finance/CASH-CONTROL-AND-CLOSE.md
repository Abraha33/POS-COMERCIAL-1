# Control, conciliación y cierre integral de caja — F10 / CAJ-07

**Decisión:** D-044, aprobada por el dueño el 2026-10-12.
**Estado de implementación:** PARTIAL y simulada. Este contrato no acredita ERPNext,
DIAN, banco, datáfono, impresora ni contabilización real.

## Propósito

F10 no es solamente contar efectivo. Es el proceso único de control del turno que
reúne conciliación documental, movimientos monetarios, custodia, arqueo físico e
informe final, sin pedir al cajero que ejecute contabilidad.

El efectivo se arquea físicamente. Facturas, crédito, cartera, proveedores, gastos,
transferencias y documentos fiscales se concilian contra sus documentos, estados y
soportes.

## Alcance de control

| Grupo | Control requerido |
|---|---|
| Facturación | emitidas, anuladas, devoluciones, notas, impuestos, descuentos, numeración y pendientes/rechazadas |
| Crédito y cartera | ventas a crédito, cupo/autorización, vencimiento, abonos, anticipos y saldo |
| Ingresos | ventas del turno, recaudos de cartera y otros ingresos, separados por medio |
| Efectivo | fondo, cobros, devoluciones, retiros, reposiciones, contado y diferencia |
| Electrónicos | tarjeta, Nequi, Daviplata, banco, Bre-B, mixtos, evidencia y pendientes |
| Egresos | compras de contado, gastos, abonos/pagos a proveedores, anticipos y reembolsos |
| Custodia | traslados caja/caja fuerte/otra caja/banco y fondos en tránsito |
| Pedidos | anticipos, pagos recibidos, entregas posteriores y saldos pendientes |
| Incidencias | diferencias, soporte faltante, pago incierto, autorización/documento pendiente |

## Flujo de ocho etapas

1. **Informe X:** corte provisional repetible que no bloquea operaciones ni reinicia
   acumulados.
2. **Ventas y facturación:** revisar contado/crédito, descuentos, impuestos,
   anulaciones, devoluciones y estado documental/fiscal.
3. **Ingresos:** clasificar ventas actuales, cartera, anticipos y otros ingresos por
   medio, separando confirmado de pendiente.
4. **Egresos:** revisar gastos, compras, pagos a proveedores, anticipos, retiros y
   reembolsos con soporte y documento origen.
5. **Custodia:** verificar origen/destino, responsable, recepción y fondos en tránsito.
6. **Arqueo físico:** contar denominaciones; comparar efectivo contado con esperado.
7. **Incidencias:** explicar o aprobar diferencias; resolver, bloquear o dejar abierta
   formalmente cada incidencia según política.
8. **Cierre e Informe Z:** congelar resumen, numerar informe, registrar responsables y
   entrega de custodia. El turno cerrado bloquea nuevas operaciones.

## Reglas de separación

| Operación | Venta del turno | Efectivo de caja |
|---|---|---|
| Factura nueva a crédito | aumenta | no aumenta |
| Cobro en efectivo de factura antigua | no crea otra venta | aumenta |
| Pago en efectivo de factura antigua a proveedor | no crea compra | disminuye |
| Compra a crédito | crea obligación | no disminuye hasta pagar |

Un pago electrónico pendiente o incierto no se contabiliza como efectivo ni se da por
confirmado por una fotografía. Los movimientos internos de custodia no son ingreso o
gasto. Cerrar no borra ni reescribe transacciones históricas.

## Informes

| Informe X | Informe Z |
|---|---|
| Provisional, repetible, sin cierre | Definitivo, único, numerado y auditable |
| Muestra acumulados e incidencias actuales | Congela cifras, responsables e incidencias del corte |
| Sirve para prevenir diferencias durante el turno | Formaliza cierre por turno/caja |

El Z incluye empresa, sede, caja, responsable, turno, numeración, ventas, impuestos,
descuentos, crédito, recaudos, anticipos, gastos, compras, proveedores, reembolsos,
custodia, efectivo esperado/contado/diferencia, documentos pendientes e incidencias.
El consolidado diario por sede agrega cierres de varias cajas/turnos sin sustituirlos.

El informe Z de Holamigo es control interno. No sustituye factura electrónica ni
documento equivalente electrónico POS exigible por la DIAN.

## Roles, estados y aceptación

- Cajero: consulta X, adjunta soportes, cuenta efectivo y solicita autorización.
- Supervisor: revisa incidencias, diferencias y autorizaciones pendientes.
- Tesorería/contador: concilian electrónicamente y validan reglas/periodos según rol.

Estados: en_revisión, pendiente_de_soporte, pendiente_de_verificación,
pendiente_de_autorización, listo_para_cierre, cerrado y cerrado_con_incidencias.

Se acepta cuando el sistema prepara los totales por grupo, exige únicamente las
intervenciones necesarias, mantiene confirmado/pediente separado, produce X repetible,
genera Z único y preserva el detalle original consultable.
