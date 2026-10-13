# Solicitud del carril reports

## Filtro por caja en ventas

- **Operación:** `GET /reports/sales-summary`
- **Campo/parámetro solicitado:** parámetro opcional `registerId` (o el nombre que defina el contrato) para acotar el resumen y sus agregados a una caja.
- **Por qué lo necesita la pantalla:** gerencia debe poder conciliar ventas por caja además de fecha y sede cuando una sede opera más de una caja.
- **Mientras tanto:** la pantalla solo envía `from`, `to` y `branchId`, que son los filtros aprobados por D-066; no muestra un selector de caja ni inventa un filtro local.

## Costo promedio por sede en valorización

- **Operación:** `GET /reports/inventory-valuation`
- **Campo solicitado:** respuesta `costBasis: branch_weighted_average` con `unitCost` calculado por sede.
- **Por qué lo necesita la pantalla:** la valorización aprobada por BR-REP-03 debe reflejar el costo promedio ponderado de cada sede, no un costo global del producto.
- **Mientras tanto:** la pantalla muestra explícitamente cuando el mock responde `product_cost`; no presenta ese valor como costo promedio por sede ni altera el contrato.
