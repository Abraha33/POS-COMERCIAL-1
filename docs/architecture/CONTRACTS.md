# Contratos compartidos

Especificación compartida frontend/backend: `contracts/openapi.yaml` + `contracts/examples/*.json`.
Implementación en el frontend: `frontend/src/shared/contracts/*.ts` (Zod + tipos inferidos + `example`). Registro completo: `registry.ts`.
Toda respuesta HTTP se valida contra su schema en `frontend/src/shared/api/client.ts`.

## Contratos de interfaz

Los contratos de dominio no prescriben la composición visual. La fuente de las regiones, cardinalidad visual,
comportamiento de pantalla, responsive y accesibilidad vive en `docs/ui-contracts/`; el paquete inicial de Venta rápida
empieza en `docs/ui-contracts/UI-CONTRACTS-INDEX.md`. La regla es: contrato de dominio → adapter API → contrato UI →
componente → plantilla → pantalla → flow → pruebas.

## Consolidación funcional vigente

El contrato de dominio no se interpreta aislado. La fuente de requisitos de producto
es [PROJECT-STATE.md](../PROJECT-STATE.md), que remite al
[registro de decisiones](../decisions/2026-10-12-DECISION-REGISTER.md), los
flujos POS `F01--F14` y los 18 flujos financieros `CAJ/TES/CON`.

La documentación funcional define intención y criterios de aceptación; este archivo,
OpenAPI, Zod, MSW y las pruebas solo acreditan lo que esté contrastado con el árbol
actual. Una regla contable, fiscal, bancaria o de hardware marcada `PROPUESTA` o
`VALIDACIÓN` no se convierte en integración real por aparecer aquí.

| Contrato | Archivo | DocType Frappe/ERPNext |
|----------|---------|------------------------|
| Product | `product.ts` | Item |
| Customer | `party.ts` | Customer |
| Supplier | `party.ts` | Supplier |
| Employee | `party.ts` | Employee |
| Sale | `sale.ts` | POS Invoice |
| StockMovement | `stock.ts` | Stock Ledger Entry |
| PurchaseOrder | `purchase.ts` | Purchase Order |
| Receivable | `ledger.ts` | Sales Invoice (saldo pendiente) |
| Payable | `ledger.ts` | Purchase Invoice (saldo pendiente) |

## Endpoints simulados (MSW)
`/api/v1/products` (GET, POST, PUT `/:id`), `/customers`, `/suppliers`, `/employees`, `/sales`,
`/stock/levels`, `/stock/movements`, `/purchase-orders`, `/receivables`, `/payables` (todos bajo `/api/v1`).

## Operaciones transaccionales (v0.3.0)
`POST /api/v1/pos/sales` (idempotente), `POST /api/v1/pos/sales/{id}/void`, `GET /api/v1/pos/shifts/current`,
`POST /api/v1/pos/shifts`, `POST /api/v1/pos/shifts/{id}/close`, `POST /api/v1/auth/login`, `GET /api/v1/auth/session`, `POST /api/v1/auth/supervisor-approvals`,
`POST /api/v1/pos/shifts/{id}/movements`, `GET|POST /api/v1/inventory/transfers`, `POST /api/v1/inventory/transfers/{id}/receive`,
`GET /api/v1/inventory/alerts`.
Reglas: `docs/business-rules/`. Detalle y verificaciones automáticas: `contracts/README.md`.

## Pendiente de la integración real
Mapeo campo a campo contra Frappe (nombres y tipos), autenticación, paginación del lado servidor,
concurrencia de inventario y pagos reales. Los mocks no prueban nada de eso.

## Contrato v0.5.0 (PROPUESTA, `x-approval: proposed`)
Nuevos: `GET /pos/shifts`, `GET /pos/sales/{id}/returns`, `GET /receivables/{id}/payments`, `POST /customers/{id}/payments`,
`POST /purchase-orders/{id}/cancel`, `POST /inventory/adjustments`, `POST /inventory/counts`,
`GET /reports/sales-summary|aging|inventory-valuation`, `PUT /branches/{id}`, `GET|PUT /company`.
Cambios de forma (rompen consumidores): `Sale.shiftId`, `SaleLine.returnedQuantity`, `Receivable`/`Payable` con
`branchId`, `balance`, `status`, `daysOverdue`; `Customer` con `outstandingBalance`, `overdueBalance`;
`taxResponsibility` es enum DIAN; `receive` devuelve `PurchaseOrderReceipt` (`effect` opcional).
Permisos nuevos: `customers.edit`, `receivables.pay`, `payables.pay`, `purchases.receive`.
Reglas: `docs/business-rules/08-v0.5-ajustes-conteos-cartera-reportes.md`.
