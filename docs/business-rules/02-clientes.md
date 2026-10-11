# Clientes y cartera

> Estado: **APROBADA** (ver `00-convenciones.md`).

| ID | Regla |
|----|-------|
| BR-CLI-01 | `documentType`+`taxId` es único por compañía. Existe un "Cliente mostrador" (consumidor final, `222222222222`) para ventas sin identificar. |
| BR-CLI-02 | `creditLimit` es el cupo máximo de saldo pendiente. `0` = no puede comprar a crédito. |
| BR-CLI-03 | Una venta a crédito se rechaza si `saldoPendiente + créditoDeLaVenta > creditLimit` (`CREDIT_LIMIT_EXCEEDED`, 409). |
| BR-CLI-04 | El crédito exige un cliente identificado (no mostrador). |
| BR-CLI-05 | Los abonos se aplican a las facturas más antiguas primero. |
| BR-CLI-06 | **Plazo estándar 30 días; 3 días de gracia.** Un cliente con facturas vencidas fuera del periodo de gracia queda bloqueado para nuevo crédito (`CUSTOMER_BLOCKED_OVERDUE`, 409). |
| BR-CLI-07 | **Listo para la DIAN desde el inicio:** `documentType` ∈ `CC`, `NIT`, `CE`, `TI`, `PPT`, `PEP`; `taxResponsibility` (responsabilidad tributaria); correo electrónico. El correo es obligatorio para clientes identificados y opcional para consumidor final (A3). |
