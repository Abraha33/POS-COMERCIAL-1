# Peticiones del carril A (POS) al integrador

1. **contract:** `GET /pos/sales/{id}/returns` (o `returnedQuantity` por línea en `Sale`) para mostrar lo ya devuelto.
   Hoy la UI solo conoce lo devuelto en la sesión y depende de `RETURN_EXCEEDS_SOLD` del servidor (BR-DEV-01).
2. **core:** configurar el locale de PrimeReact en español (`aria.close`, etc.): el botón de cerrar de los diálogos
   sigue anunciándose como "Close".
3. **core:** `src/tests/app.test.tsx` ("productos lista datos simulados…") falla de forma intermitente en esta máquina, también sin cambios del
   carril (usa `findByText` con 1 s); revisar el timeout. Los tests POS pasan con `{ timeout: 20000 }` por describe.
4. **core (opcional):** exponer en el contrato de `Sale` el `shiftId` para que la UI pueda anticipar el `FORBIDDEN`
   de anulación (turno cerrado) en vez de esperar la respuesta del servidor.

## Estado (contract/v0.5.0)
1. **Atendida:** `Sale.shiftId`, `SaleLine.returnedQuantity` y `GET /pos/sales/{id}/returns` (BR-DEV-07/08). La UI aún no los consume.
2. **Atendida:** locale `es` de PrimeReact en el arranque (`app/config/primeLocale.ts`).
3. **Atendida en config:** `testTimeout` 20 s y `asyncUtilTimeout` 5 s; con carga alta aún hay flakiness intermitente en `pos-*` (pasan aisladas).
4. **Atendida:** `Sale.shiftId` (ver 1).
