# PED — Pedidos, preparación y despacho (grupo 7 / POS F08)

**Aprobación funcional de la propuesta:** usuario, 2026-10-12. **Estado de entrega:** implementación y profundización técnica de F08 permanecen **APLAZADAS** (decisión D-010); aprobar un diseño base NO adelanta su posición en roadmap. **Versión:** v1.0 de base funcional, sin código.

## Objetivo y UX
Bandeja compacta de pedidos estilo pipeline con prioridad clara, responsable de preparación y trazabilidad del retiro/despacho. Semáforo **de estado** distinto del indicador **de urgencia**. F08 integra pedidos con venta F04/F06, stock/reservas INV-09, caja CAJ-03, facturación y entregas, sin duplicar cobros ni salidas de inventario.

## Flujo propuesto (ocho subflujos)
| ID | Secuencia / responsable | Excepciones / criterio |
|---|---|---|
| PED-01 | Cajero/comercial crea pedido → cliente → productos/UOM/precios → pago, retiro/domicilio y fecha prometida → persistir borrador/confirmación | Cliente/stock/precio cambiado, fecha inválida; el pedido no es automáticamente venta fiscal ni entrega |
| PED-02 | Motor prioriza pedidos por fecha prometida y riesgo de incumplimiento, luego estado de pago, y antigüedad dentro del mismo nivel; prioridad especial autorizada con motivo | Regla configurable; no perder historial de prioridad; ver colas por estado y criticidad |
| PED-03 | Bandeja muestra pendiente, preparando, listo, incidencia, despachado/entregado con color+texto+íconos independientes de prioridad | No depender solo de rojo/verde; no marcar entregado por haber cobrado |
| PED-04 | Supervisor asigna ayudante; ayudante acepta y comienza preparación; puede reasignar con auditoría | Ausencia, turno cambiado, dos preparadores simultáneos |
| PED-05 | Ayudante selecciona cantidades reales, faltantes/sustituciones con confirmación de cliente si impactan producto/importe | Picking parcial, producto agotado, reserva vencida; no mutar factura original |
| PED-06 | Verificador revisa línea/cantidad/estado → empaca → marca listo; guarda evidencia cuando requiera política | Empaque incorrecto, sustitución no autorizada; no confiar en 'preparando' como 'listo' |
| PED-07 | Encargado entrega en tienda o despacha con transportista/cliente → comprobación de entrega y hora | Entrega parcial, rechazo, transportista sin confirmación; despacho ≠ entrega |
| PED-08 | Responsable gestiona edición/cancelación, faltantes, pedidos parciales y devoluciones vinculadas a F07/TES-04 | Si tiene pago, reserva, factura o entrega, requiere compensación controlada y permisos |

## Estados y dimensiones
- Estado de procesamiento: draft, pending, picking, packing/verification, ready, dispatched, delivered, incident, canceled (el modelo definitivo se mapeará a contrato).
- Estado de pago: unpaid / partial / paid / pending_verification (independiente de procesamiento).
- Estado de stock: not_reserved / partial_reserved / reserved / consumed/despatched.
- Estado de entrega: pending / in_transit / partial / delivered / disputed.
Un único estado 'verde' NO prueba pago, factura o despacho; mantener proyecciones independientes.
- Fase de almacén y estado fiscal/contable pueden evolucionar independientemente.

## Prioridad aprobada como política configurable
Se acepta la **propuesta reciente** de fecha comprometida + riesgo de incumplimiento → pago verificado → llegada. **Reemplaza como propuesta predeterminada** el orden histórico puramente pagados/parciales/no pagados, pero **conserva ese esquema como opción configurable por empresa**. Cada pedido muestra la razón de su puesto en la cola. La priorización es independiente del permiso para despachar sin cobrar. No priorizar un pago en verificación como confirmado.

## Integraciones y riesgos
- Inventario: reservar ≠ descontar stock; despacho con cantidad entregada real y ajuste de disponibilidad según integración.
- Facturación: momento de emisión depende de normativa; pedido pagado ahora y entregado después no implica emitir dos documentos.
- Precio: cambio de pedido requiere recalcular conforme CAT, conservar snapshots y aprobación.
- Cambio por producto sustituto requiere permiso y recalcular diferencias; no entregar otro SKU ocultamente.
- Reembolsos/cancelaciones usan TES-04/F07; no borrar documentos publicados.
- Multisede: disponibilidad real por bodega; evitar promesas que sumen stock de otra sede sin traslado.
- Acceso rápido desde Venta; ubicación específica del botón flotante permanece pendiente de UX.
- F08 puede usar un semáforo sencillo de pedidos en mock desde ahora, sin implementar logística completa.

## Pruebas de aceptación
1. Pedido pagado parcialmente aparece con pago independiente y estado de preparación; no se marca pagado hasta verificar saldo o acuerdo de crédito.
2. Pedido vence hoy, otro está pagado para mañana: según política de riesgo, primero el urgente; cambiar política a prioridad pago altera orden de forma trazable.
3. Dos ayudantes intentan tomar el mismo pedido: una asignación efectiva.
4. Pedido por 10 unidades, se recogen 6: registra falta de 4 y permite parcial según autorización; evita descontar 10 del stock.
5. Sustitución de artículo requiere confirmación y diferencia de precio/impuesto si corresponde.
6. Pedido listo pero aún no entregado: no se informa al cliente como entrega finalizada.
7. Pedido cancelado con anticipo aprobado: liberar reservas y compensar/reembolsar mediante flujo financiero, no borrar pago.
8. Cambio de cliente/fecha/ruta no destruye historial ni duplicación de sale/order IDs.
9. Conteo de inventario en paralelo con picking: operaciones concurrentes se reflejan sin inventar stock disponible.

**Pendientes de implementación:** transición exacta de estados, logística por empresa, medios de entrega, integración ERPNext Sales Order/Delivery Note/Stock Reservation y fiscalidad. No declarar F08 construido por aprobación de este contrato.

