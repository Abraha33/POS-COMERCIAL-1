# Mapa de pantallas

Estado del núcleo: las pantallas ancla existen y muestran datos simulados. Las pantallas reales se construyen en la fase paralela.

| Módulo | Ruta ancla | Permiso | Hoy | Por construir (fase paralela) |
|--------|-----------|---------|-----|-------------------------------|
| POS | `/pos` | `pos.sell` | Lista de ventas | Venta, caja, cobros, devoluciones, turnos |
| Productos | `/products` | `products.view` | **Slice completo de referencia** | Categorías, importación, imágenes |
| Inventarios | `/inventory` | `inventory.view` | Existencias | Conteos, ajustes, traslados |
| Compras | `/purchases` | `purchases.view` | Órdenes | Crear orden, recepción |
| Clientes | `/customers` | `customers.view` | Lista | Ficha, historial |
| Cuentas por cobrar | `/receivables` | `receivables.view` | Lista | Abonos, estado de cuenta |
| Cuentas por pagar | `/payables` | `payables.view` | Lista | Pagos, programación |
| Reportes | `/reports` | `reports.view` | KPIs básicos | Ventas, inventario, cartera |
| Administración | `/administration` | `admin.manage` | Empleados | Usuarios, empresas, sedes, config |

Roles simulados: propietario, admin, cajero, bodeguero, comprador, cartera (`frontend/src/app/config/permissions.ts`).
