# Productos

> Estado: **APROBADA** (ver `00-convenciones.md`).

| ID | Regla |
|----|-------|
| BR-PRO-01 | `sku` es único en la compañía y no cambia una vez el producto tiene movimientos. |
| BR-PRO-02 | `barcode`, si existe, es único. (Códigos múltiples por producto: fuera de esta versión.) |
| BR-PRO-03 | **`price` es el precio de venta con IVA incluido** (Estatuto del Consumidor). La base gravable es `price / (1 + taxRate)`, calculada con decimales internos. |
| BR-PRO-04 | `taxCategory` ∈ `gravado`, `exento`, `excluido`, `impoconsumo`. Exento y excluido tienen tarifa 0 pero se **separan contablemente**. Tarifas: `0.19` (general), `0.05` (especial), `0` (exento/excluido), `0.08` (impoconsumo, soportado; activación: A6). |
| BR-PRO-05 | Un producto `active=false` no se puede vender ni comprar, pero conserva su historial. |
| BR-PRO-06 | **Valoración: costo promedio ponderado** (NIIF PYMES). `cost` es el costo promedio vigente; cada entrada lo recalcula. PEPS solo si luego se gestionan lotes con vencimiento. |
| BR-PRO-07 | Crear/editar productos requiere permiso `products.edit`. |

Errores: `SKU_DUPLICATED` (409), `BARCODE_DUPLICATED` (409), `VALIDATION_ERROR` (422).
