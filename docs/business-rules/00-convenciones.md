# Convenciones transversales

> Estado: **PROPUESTA — pendiente de aprobación.** Las reglas con ⚠ son supuestos míos que debes confirmar o corregir
> (ver `99-preguntas-abiertas.md`). Hasta aprobarse, ni frontend ni backend deben tratarlas como definitivas.

| ID | Regla |
|----|-------|
| BR-GEN-01 | Dinero: **entero en pesos colombianos (COP)**, sin decimales, en todo contrato y base de datos. ⚠ |
| BR-GEN-02 | Cantidades: número decimal con hasta 3 decimales (permite pesables). Unidad definida por el producto. |
| BR-GEN-03 | Fechas: `YYYY-MM-DD`; instantes: ISO 8601 UTC. La zona de negocio es `America/Bogota`. |
| BR-GEN-04 | Tasas (IVA, descuentos %) son fracciones `0..1` (IVA 19 % = `0.19`). |
| BR-GEN-05 | Redondeo de impuestos: se calcula **por línea** y se redondea al peso (half-up); el total es la suma de líneas. ⚠ |
| BR-GEN-06 | El **servidor es la autoridad** de precios, impuestos y totales; el cliente solo envía cantidades y descuentos. |
| BR-GEN-07 | Toda operación que modifica estado lleva un identificador de operación del cliente (idempotencia). Ver `03-ventas.md`. |
| BR-GEN-08 | Los registros transaccionales (ventas, movimientos) **no se borran**; se anulan con una operación inversa y rastro. |
| BR-GEN-09 | Errores con formato único `{code, message, details?}`; los códigos son parte del contrato. |
