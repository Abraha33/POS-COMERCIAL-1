# Productos

> Estado: **PROPUESTA — pendiente de aprobación.** Ver `00-convenciones.md`.

| ID | Regla |
|----|-------|
| BR-PRO-01 | `sku` es único en la compañía y no cambia una vez el producto tiene movimientos. |
| BR-PRO-02 | `barcode`, si existe, es único; un producto puede tener más de un código (pendiente: modelo de códigos múltiples ⚠). |
| BR-PRO-03 | `price` es el precio de venta **con IVA incluido** ⚠ (afecta cálculo de impuesto en BR-VEN-03). |
| BR-PRO-04 | `taxRate` permitido: `0`, `0.05`, `0.19` ⚠ (confirmar tarifas y productos excluidos/exentos). |
| BR-PRO-05 | Un producto `active=false` no se puede vender ni comprar, pero conserva su historial. |
| BR-PRO-06 | `cost` es informativo para reportes; el costo contable lo define el método de valoración (pendiente ⚠: promedio / PEPS). |
| BR-PRO-07 | Crear/editar productos requiere permiso `products.edit`. |

Errores: `SKU_DUPLICATED` (409), `BARCODE_DUPLICATED` (409), `VALIDATION_ERROR` (422).
