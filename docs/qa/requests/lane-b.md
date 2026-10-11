# Peticiones del carril B (productos e inventario) a shared/

1. **Sedes (`GET /branches`)**: no hay contrato de sedes. La UI solo conoce el nombre de la sede de la sesión; las demás se muestran como `Sede br-002`. PROPUESTA: `branchSchema { id, name }` + hook `useBranches` en `shared/api/queries`.
2. **Sede del usuario en la sesión**: `buildSession` fija `branch` en `br-001` para cualquier rol. El botón "Recibir" se muestra siempre y el servidor decide (BR-INV-04 -> `FORBIDDEN`). Con la sede real del empleado se podría ocultar o explicar de antemano.
3. **Mock de productos**: `POST/PUT /products` no valida `SKU_DUPLICATED`/`BARCODE_DUPLICATED` (BR-PRO-01/02) ni devuelve el formato `ApiErrorBody`. La UI valida contra el catálogo cargado y mapea esos códigos si el servidor real los devuelve.
4. **Ajustes y conteos**: sin contrato (alertas `STOCK_NEGATIVE` no se pueden resolver desde la UI). Pendiente A4 (diferencias enviado/recibido).
5. **Timeouts en suites existentes**: `app.test.tsx`, `pos-quick-sale.test.tsx` y `pos-cash-held.test.tsx` fallan por arranque en frío (>5 s en el primer render) también sin mis cambios; sugerir `testTimeout` global mayor en `vitest.config`.

## Estado (contract/v0.5.0)
1. **Atendida:** `useBranches` ya existía; `PUT /branches/{id}` añadido.
2. **Atendida:** `Session.branch` sale del empleado (mocks `GET /auth/session` y selector simulado vía `sessionFor`). El botón "Recibir" puede condicionarse a la sede.
3. **Atendida:** `POST/PUT /products` responden `SKU_DUPLICATED`/`BARCODE_DUPLICATED` con `Error`.
4. **Atendida:** `POST /inventory/adjustments` y `POST /inventory/counts` (BR-AJU/BR-CNT, hooks `useCreateStockAdjustment`/`useCreateInventoryCount`). **Pendiente:** diferencias enviado/recibido de traslados (A4).
5. **Ya resuelta:** `testTimeout` global 20 s.
