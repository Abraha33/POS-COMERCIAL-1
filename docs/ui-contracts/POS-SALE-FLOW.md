# POS — flow de venta rápida

**Estado:** v0.1. Las operaciones marcadas como `SIMULATED` o `PROPOSED` dependen de mocks; no prueban backend, DIAN, banco ni hardware.

## Objetivo

Permitir que un operador abra su turno, encuentre productos, arme una venta, cobre con un método permitido y obtenga un recibo operativo sin perder el contexto de la operación.

## Precondiciones

- Sesión autenticada y permisos de la acción. `GET /auth/session` sigue pendiente como fuente única de UI.
- Caja disponible y turno abierto para cobrar; `GET /pos/registers` y `POST /pos/shifts` son la fuente contractual.
- Catálogo, cliente y reglas de precio disponibles desde sus adapters.

## Flujo principal

1. El usuario entra a Venta rápida.
2. Si no hay turno, abre caja; la UI debe explicar y ofrecer la acción posible.
3. Busca por texto, código de barras, SKU, categoría, marca, disponibilidad, frecuentes o presentación.
4. Selecciona producto/presentación y agrega una línea al carrito.
5. Ajusta cantidad, descuento o cliente. Las acciones protegidas solicitan aprobación cuando el contrato lo exige.
6. Puede suspender, reiniciar o recuperar una venta sin perder datos no confirmados.
7. Abre el checkout, selecciona tipo de documento y uno o más pagos válidos.
8. Confirma la venta mediante `POST /pos/sales` con idempotencia.
9. Muestra resultado, recibido/cambio cuando aplique y recibo operativo simulado.
10. Opcionalmente crea o vincula un pedido; su ciclo posterior es pendiente → en proceso → listo → despachado → entregado.

## Flujos alternos

| Caso | Comportamiento requerido | Estado |
|---|---|---|
| Sin stock | Explicar el faltante; pedir PIN si la regla permite stock negativo. | APPROVED/SIMULATED |
| Descuento o precio protegido | Solicitar `approvalToken`; no permitir autoaprobación. | APPROVED/SIMULATED |
| Crédito | Exigir cliente y validar cupo/vencimiento según contrato. | APPROVED/SIMULATED |
| Pago insuficiente | Resaltar el saldo pendiente sin perder el carrito. | APPROVED/SIMULATED |
| Transferencia con evidencia | Mantener el pago como pendiente/verificable; una foto no confirma el pago. | PROPOSED |
| Operación incierta/offline | Conservar operación y exponer estado de sincronización; no reintentar a ciegas. | PROPOSED |
| Devolución/anulación | Iniciar desde detalle/historial con motivo, cantidades retornables y permisos. | PARTIAL/PROPOSED |

## Invariantes de UI

- Cambiar de vista no puede perder el checkout activo: debe demostrarse con prueba de regresión antes de cualquier rediseño.
- Un carrito tiene 0..n líneas; una venta confirmable tiene 1..n.
- Solo puede existir un checkout activo por venta y un modal de acción crítica activo a la vez.
- El estado visible nunca puede afirmar que un documento es fiscal, que un pago está confirmado por banco o que una impresión física ocurrió sin evidencia contractual.
- La venta no vacía el carrito ante un error recuperable.

## Criterios de aceptación

- Apertura → venta → cobro → recibo ejecutable con mocks.
- Efectivo, mixto y crédito presentan errores contractuales accionables.
- Suspender/recuperar/reiniciar no duplica líneas ni operaciones.
- Pedido y entrega programada se muestran como `PROPOSED` hasta que sus contratos estén aprobados.
