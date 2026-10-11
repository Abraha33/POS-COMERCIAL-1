# Contratos compartidos

Especificación compartida frontend/backend: `contracts/openapi.yaml` + `contracts/examples/*.json`.
Implementación en el frontend: `frontend/src/shared/contracts/*.ts` (Zod + tipos inferidos + `example`). Registro completo: `registry.ts`.
Toda respuesta HTTP se valida contra su schema en `frontend/src/shared/api/client.ts`.

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
