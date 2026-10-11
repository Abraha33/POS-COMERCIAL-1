# Peticiones del carril C (Compras) al integrador

1. **Permiso de recepción para bodeguero (BR-COM-01).** La regla dice que el bodeguero también recibe órdenes, pero
   `rolePermissions.bodeguero` no incluye `purchases.view`/`purchases.create`, así que no ve `/purchases` ni puede
   recibir. Pedir: permiso `purchases.receive` (o dar `purchases.view` + acción de recibir). Hoy la UI exige
   `purchases.create` para enviar y recibir.
2. **Cancelar orden.** El estado `cancelada` existe en el contrato pero no hay endpoint (`/purchase-orders/:id/cancel`).
   La UI solo lo muestra y filtra.
3. **Detalle de efecto de recepción.** `POST /purchase-orders/:id/receive` devuelve solo la orden; la UI reconstruye
   "stock antes/después, costo promedio, cuenta por pagar" releyendo `products`, `stock-levels` y `payables`.
   Opcional: devolver ese resumen en la respuesta.
4. **Tests globales con timeout de 5 s.** En esta máquina fallan por tiempo (sin cambios míos) `app.test.tsx` (productos)
   y `pos-*.test.tsx`; mi archivo fija `vi.setConfig({ testTimeout: 30000 })`. Sugerencia: `testTimeout` mayor en
   `vitest.config`.
