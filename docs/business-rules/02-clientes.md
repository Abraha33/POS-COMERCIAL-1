# Clientes y cartera

> Estado: **PROPUESTA — pendiente de aprobación.** Ver `00-convenciones.md`.

| ID | Regla |
|----|-------|
| BR-CLI-01 | `taxId` (NIT/CC) es único por compañía. Existe un "Cliente mostrador" genérico (`222222222-2`) para ventas sin identificar. |
| BR-CLI-02 | `creditLimit` es el cupo máximo de saldo pendiente. `0` = no puede comprar a crédito. |
| BR-CLI-03 | Una venta a crédito se rechaza si `saldoPendiente + totalVenta > creditLimit` (`CREDIT_LIMIT_EXCEEDED`, 409). |
| BR-CLI-04 | El crédito exige un cliente identificado (no mostrador). |
| BR-CLI-05 | Los abonos se aplican a las facturas más antiguas primero ⚠. |
| BR-CLI-06 | Un cliente con saldo vencido > 0 queda bloqueado para nuevo crédito ⚠ (confirmar días de gracia). |
