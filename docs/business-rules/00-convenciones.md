# Convenciones transversales

> Estado: **APROBADA** según la respuesta del dueño del negocio a `99-preguntas-abiertas.md`.
> Quedan aclaraciones menores (A1…A8) en ese mismo archivo; hasta resolverlas, aplica el valor por defecto indicado.

| ID | Regla |
|----|-------|
| BR-GEN-01 | **Contrato y UI: pesos enteros (COP), sin centavos.** El backend calcula internamente (base gravable, IVA, costos, prorrateos) con 4–6 decimales y solo redondea en el total de la factura (BR-GEN-05). |
| BR-GEN-02 | Cantidades: decimal con hasta 3 decimales (permite pesables). Unidad definida por el producto. |
| BR-GEN-03 | Fechas `YYYY-MM-DD`; instantes ISO 8601 UTC. Zona de negocio `America/Bogota`. |
| BR-GEN-04 | Tasas (IVA, descuentos %) son fracciones `0..1` (IVA 19 % = `0.19`). |
| BR-GEN-05 | **El redondeo se hace sobre el total de la factura, nunca por línea.** Si el pago incluye efectivo, un ítem automático "Ajuste al peso" (`roundingAdjustment`, positivo o negativo) lleva el total a un valor pagable con la moneda circulante (múltiplos de $50). `total = Σ líneas + roundingAdjustment`. (Dirección exacta del ajuste: A1.) |
| BR-GEN-06 | El **servidor es la autoridad** de precios, impuestos y totales; el cliente solo envía cantidades, descuentos y pagos. |
| BR-GEN-07 | Toda operación que modifica estado lleva un identificador de operación del cliente (idempotencia). Ver BR-VEN-11. |
| BR-GEN-08 | Los registros transaccionales (ventas, movimientos) **no se borran**; se anulan con operación inversa y rastro. |
| BR-GEN-09 | Errores con formato único `{code, message, details?}`; los códigos son parte del contrato. |
| BR-GEN-10 | **Multi-sede desde el día 1**: toda tabla de inventario, caja, turno y venta lleva `branchId`. |
