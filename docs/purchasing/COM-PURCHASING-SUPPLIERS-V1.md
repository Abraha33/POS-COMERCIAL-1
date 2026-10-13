# COM — Compras y proveedores (grupo 5)

**Aprobación funcional:** usuario 2026-10-12. **Versión:** v1.0 funcional, no implementación. **Alcance:** COM-01..COM-08. **Dos modos** configurables: compra rápida y compra controlada, con un único modelo transaccional/comprobable.

## Objetivo
Hacer compras ágiles en un comercio pequeño y permitir órdenes/aprobaciones/recepciones parciales en uno mayor. Integrar registro de proveedor, compras, inventario INV y pagos a proveedores desde caja CAJ-05 / TES-06 **sin crear una segunda cuentas por pagar**.

## Secuencias aprobadas
- **Compra rápida** (habilitada por política): seleccionar proveedor → registrar productos efectivamente recibidos y documento de respaldo → validar impuestos/costo → confirmar recepción → contabilizar factura/gasto según corresponda → pagar de contado o quedar en deuda. Esta UX compacta NO omite transacciones obligatorias.
- **Compra controlada**: solicitud/reabastecimiento → orden de compra autorizada → recepción total/parcial → factura del proveedor vinculada → pago parcial/total/anticipo y conciliación.
- **Incidencias**: faltante, sobrante, producto dañado, precios/impuestos distintos, factura duplicada o impugnada quedan trazados antes de aceptación/aplicación.

## Flujos
| ID | Tarea/Responsable | Invariantes, excepciones y aceptación |
|---|---|---|
| COM-01 | Admin/Compras crea proveedor → identifica fiscalmente/contactos/condiciones/cuentas validadas → activa/desactiva | Cuenta de banco modificada requiere verificación reforzada; no borrar proveedor con histórico; protección datos |
| COM-02 | Compras revisa stock mínimo, ventas recientes, comprometido y mercancía en tránsito → propone reposición | La sugerencia es sólo propuesta; no comprar automáticamente ni usar datos desactualizados sin alerta |
| COM-03 | Compras prepara orden → supervisor aprueba según límite → envía → modifica/anula por documento trazable | No puede facturarse o recibirse dos veces por retry; modificación posterior requiere revisión; se admite orden opcional en compra rápida |
| COM-04 | Receptor cuenta mercancía (total/parcial) → separa recibido, aceptado, rechazado/dañado, pendiente → publica movimiento aceptado | Pedido 10, llegan 6, rechaza 1 → sólo 5 aceptados se vuelven vendibles si política lo permite; facturas no sustituyen conteo |
| COM-05 | Administrativo/Compras registra factura proveedor → vincula orden/recepción → valida cantidades, precio, impuestos y duplicados → crea obligación | Duplicados por proveedor/número; disputa congela pago; obligación no equivale a desembolso |
| COM-06 | Compras/contador registra flete/descuento/gastos de importación aplicables y su clasificación; distribuye costos con regla validada | No asumir todo flete capitalizable ni prorrateo automático; reconocimiento y costos revisados por contador |
| COM-07 | Compras prepara devolución proveedor → identifica artículos y condición → salida/nota/deuda ajustada y conciliación | Parcial, mercancía aún no recibida, soporte de crédito pendiente; no devolver cantidades superiores a las aceptadas |
| COM-08 | Caja/tesorería paga compra contado, abono de facturas anteriores/nuevas, pago total o anticipo → aplica a documentos | Reutilizar CAJ-05 y TES-06. Un pago para varias facturas; no duplicar gasto/compra/stock al pagar |

## Políticas y perfiles
- Habilitar compra sin orden según empresa/importe/rol; nunca forzar cinco pasos para una compra inmediata válida.
- Separación de quien solicita, quien recibe, quien autoriza gasto, quien paga y quien concilia cuando organización lo permite; acceso granular y auditoría cuando coincide en un empleado.
- Inventario registra ingreso con **recepción aceptada**, no por emisión de orden o mero pago. Momento exacto de reconocimiento contable de factura/mercancía depende de ERPNext y tratamiento aplicable.
- Facturas y saldos en CxP son autoridad financiera; un abono **no** registra ingreso de mercancía ni costo de compra otra vez.
- Recepción admite mercancía vendible y mercancía en cuarentena/no vendible; registrar diferencia con observación y soporte.
- Si precio cambió respecto a orden: bloquear auto-aprobación fuera de tolerancia configurada; no inventar porcentaje de tolerancia.
- Consignaciones y anticipos no se convierten arbitrariamente en factura pagada sin aplicación documentada.

## Pruebas de aceptación
1. Compra rápida de 3 artículos recibidos y pagados en efectivo: inventario/costo/obligación/pago registrados **una sola vez**, caja disminuye correctamente.
2. Orden de 10, recepción 6 (1 dañado), posterior recepción 4; distinguir aceptado, rechazado y pendiente sin inventar stock.
3. Factura con precio distinto: incidencia y autorización; no aceptar importe silenciosamente.
4. Factura duplicada por proveedor/número: se detecta antes de crear doble cuenta por pagar.
5. Abono desde caja a proveedor con facturas viejas/nuevas: saldo por factura correcto, salida única de caja y sin duplicar compra.
6. Un pago repartido entre varias facturas produce asignaciones precisas y anticipo residual solo si se autoriza.
7. Cambio de cuenta bancaria del proveedor requiere verificación y auditoría; no se aplica silenciosamente.
8. Devolución parcial al proveedor afecta mercancía y obligación con documentos correspondientes; sin pagos repetidos.
9. Reintentar recepción tras timeout no duplica inventario ni pagos.

## Contratos y relaciones
CAT: producto/UOM/costos; INV: recepción/traslado/no vendible; F-FIN: CAJ-05/TES-06/CON-02; REP: compras y proveedores. Adaptar ERPNext Purchase Order/Receipt/Invoice/Payment Entry/Return **sólo después** de probar comportamiento en versión de uso. Costeo, retenciones, documentos soporte y recepción contable requieren contador/asesor fiscal.
