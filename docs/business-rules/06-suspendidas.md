# Ventas suspendidas

> Estado: **PROPUESTA — pendiente de aprobación del dueño.** No está en el contrato `openapi.yaml`.

| ID | Regla |
|----|-------|
| BR-SUS-01 | Suspender conserva el carrito (líneas, cantidades, descuentos, cliente) para atender a otro cliente y reanudar después. |
| BR-SUS-02 | Una suspendida **no reserva stock, no mueve caja ni genera número de venta**. El stock y los precios se validan al cobrar. |
| BR-SUS-03 | Se guardan **localmente en el navegador, por caja** (`localStorage`); las ve cualquier turno de esa caja en ese equipo. |
| BR-SUS-04 | Para reanudar, la venta actual debe estar vacía (evita perder líneas). |
| BR-SUS-05 | Cerrar el turno no bloquea por suspendidas; se avisa que no se cobrarán en ese turno. |
| BR-SUS-06 | El descuento autorizado con PIN no se conserva al suspender: se vuelve a pedir al cobrar. |

## Pendientes de decisión (SUP)
- ¿Deben vivir en el servidor (visibles desde otra caja o tras cambiar de equipo)? Requiere contrato `hold/resume`.
- ¿Caducidad (p. ej. descartar a las 24 h) y límite de suspendidas por caja?
- ¿Quién puede descartar una suspendida de otro cajero?

## Qué NO cubre
Si se limpia el almacenamiento del navegador o se cambia de equipo, las suspendidas se pierden.
