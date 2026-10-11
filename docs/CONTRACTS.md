# Contratos compartidos

Fuente: `src/shared/contracts/*.ts` (Zod + tipos inferidos + `example`). Registro completo: `registry.ts`.
Toda respuesta HTTP se valida contra su schema en `src/shared/api/client.ts`.

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
`/api/products` (GET, POST, PUT `/:id`), `/api/customers`, `/api/suppliers`, `/api/employees`, `/api/sales`,
`/api/stock/levels`, `/api/stock/movements`, `/api/purchase-orders`, `/api/receivables`, `/api/payables`.

## Pendiente de la integración real
Mapeo campo a campo contra Frappe (nombres y tipos), autenticación, paginación del lado servidor,
concurrencia de inventario y pagos reales. Los mocks no prueban nada de eso.
