# Inventario y traslados

> Estado: **APROBADA** (ver `00-convenciones.md`).

| ID | Regla |
|----|-------|
| BR-INV-01 | Existencias por producto **y sede** (`branchId`). Multi-sede desde el inicio (BR-GEN-10). |
| BR-INV-02 | Stock negativo (venta con PIN o venta offline) genera una alerta `STOCK_NEGATIVE` — "Ajuste de inventario requerido" — visible en el panel del administrador hasta que se resuelva con un ajuste. |
| BR-INV-03 | **Traslado en dos pasos.** 1) `enviado`: descuenta de la sede origen y suma a `inTransit`. 2) `recibido`: el encargado de la sede destino confirma y el sistema suma a su inventario. Sin paso 2 el inventario no aparece en destino. |
| BR-INV-04 | Solo el encargado de la sede destino puede recibir (`FORBIDDEN`). Un traslado `recibido` es inmutable. |
| BR-INV-05 | Valoración por costo promedio ponderado (BR-PRO-06). Las entradas por compra recalculan el costo; los traslados lo conservan. |
| BR-INV-06 | Movimientos: `entrada`, `salida`, `ajuste`, `traslado_envio`, `traslado_recepcion`; todos con referencia al documento origen. |

Pendiente: diferencias entre cantidad enviada y recibida (A4).
