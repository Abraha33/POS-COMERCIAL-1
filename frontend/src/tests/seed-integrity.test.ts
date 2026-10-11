import { describe, expect, it } from 'vitest';
import { contracts } from '@/shared/contracts/registry';
import { createSeed } from '@/mocks/seed';
import { toCustomer, toPayable, toReceivable } from '@/mocks/derive';
import { setClock } from '@/shared/utils/clock';
import { mockNow } from '@/mocks/db';

describe('integridad del seed de mocks', () => {
  const s = createSeed();
  const ids = (rows: { id: string }[]) => new Set(rows.map((r) => r.id));
  const productIds = ids(s.products);
  const customerIds = ids(s.customers);
  const supplierIds = ids(s.suppliers);

  it('cada registro cumple su contrato', () => {
    s.products.forEach((r) => contracts.product.schema.parse(r));
    // El seed guarda los registros; la API les añade los derivados (saldo, estado, mora).
    setClock(mockNow);
    s.customers.forEach((r) => contracts.customer.schema.parse(toCustomer(r)));
    s.suppliers.forEach((r) => contracts.supplier.schema.parse(r));
    s.employees.forEach((r) => contracts.employee.schema.parse(r));
    s.sales.forEach((r) => contracts.sale.schema.parse(r));
    s.stockMovements.forEach((r) => contracts.stockMovement.schema.parse(r));
    s.purchaseOrders.forEach((r) => contracts.purchaseOrder.schema.parse(r));
    s.receivables.forEach((r) => contracts.receivable.schema.parse(toReceivable(r)));
    s.payables.forEach((r) => contracts.payable.schema.parse(toPayable(r)));
  });

  it('las ventas apuntan a productos y clientes existentes', () => {
    for (const sale of s.sales) {
      if (sale.customerId) expect(customerIds.has(sale.customerId)).toBe(true);
      sale.lines.forEach((l) => expect(productIds.has(l.productId)).toBe(true));
    }
  });

  it('inventario y compras apuntan a productos y proveedores existentes', () => {
    s.stockLevels.forEach((l) => expect(productIds.has(l.productId)).toBe(true));
    s.stockMovements.forEach((m) => expect(productIds.has(m.productId)).toBe(true));
    for (const po of s.purchaseOrders) {
      expect(supplierIds.has(po.supplierId)).toBe(true);
      po.lines.forEach((l) => expect(productIds.has(l.productId)).toBe(true));
    }
  });

  it('cartera apunta a ventas, clientes, compras y proveedores existentes', () => {
    const saleIds = ids(s.sales);
    const poIds = ids(s.purchaseOrders);
    for (const r of s.receivables) {
      expect(customerIds.has(r.customerId)).toBe(true);
      if (r.saleId) expect(saleIds.has(r.saleId)).toBe(true);
    }
    for (const p of s.payables) {
      expect(supplierIds.has(p.supplierId)).toBe(true);
      if (p.purchaseOrderId) expect(poIds.has(p.purchaseOrderId)).toBe(true);
    }
  });

  it('los totales de venta coinciden con sus líneas', () => {
    for (const sale of s.sales) {
      const sum = sale.lines.reduce((acc, l) => acc + l.quantity * l.unitPrice - l.discount, 0);
      expect(sale.total).toBe(sum + sale.roundingAdjustment);
      const paid = sale.payments.reduce((acc, pay) => acc + pay.amount, 0);
      expect(paid).toBeGreaterThanOrEqual(sale.total);
    }
  });
});
