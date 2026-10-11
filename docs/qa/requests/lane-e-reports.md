# Peticiones del carril E-Reportes a shared / core

Todo se calcula en el navegador sobre las listas completas; estas peticiones reducen esa limitación.

1. **Endpoints agregados** (`contract:`): `/reports/sales-summary?from&to&branchId`, `/reports/inventory-valuation`, `/reports/aging`.
   Hoy se descargan listas completas (`/sales`, `/stock/levels`, `/receivables`, `/payables`); no escala a datos reales.
2. **Lectura compartida de turnos** (`core:`): `useShifts()` (historial con cuadre y diferencia). Sin ella la sección "Caja" queda "pendiente".
3. **Sedes** (`core:`): `useBranches()` con nombre; los filtros y tablas muestran el id (`br-001`) porque `branchName` solo existe en `mocks/http.ts`.
4. **Costo promedio ponderado** (`contract:`): el valor de inventario usa `product.cost`; BR-INV-05 habla de costo promedio ponderado por sede.
5. **Fecha de referencia** (`core:`): cartera vencida usa la constante `2026-10-11` (mock). Debería venir del servidor o de un reloj compartido.
6. **Cartera por sede** (`contract:`): `receivable`/`payable` no tienen `branchId`; el filtro de sede no les aplica.

## Estado (contract/v0.5.0)
1. **Atendida:** `/reports/sales-summary`, `/reports/aging`, `/reports/inventory-valuation` (hooks en `shared/api/reports.ts`). **Pendiente:** que la pantalla los consuma.
2. **Atendida:** `useShifts()` (`GET /pos/shifts`).
3. **Atendida:** `useBranches()` ya existía.
4. **Parcial:** `costBasis` declara el costo; el mock sirve `product_cost` (el seed no tiene costo por sede). El backend debe devolver `branch_weighted_average`.
5. **Atendida:** reloj compartido (`today()`).
6. **Atendida:** `branchId` en `Receivable`/`Payable` y filtro `branchId` en `/reports/aging`.
