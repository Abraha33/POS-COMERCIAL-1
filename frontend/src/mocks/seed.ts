import type {
  Branch, CountryPack, Register, Company, CustomerRecord, Employee, InventoryAlert, InventoryCount, PayableRecord, Product, PurchaseOrder,
  ReceivablePayment, ReceivableRecord, Sale, Shift, StockLevel, SaleReturn, StockMovement, Supplier, Transfer,
} from '@/shared/contracts';

const BRANCH = 'br-001';

export const products: Product[] = [
  { id: 'prd-001', sku: 'SKU-001', barcode: '7701234567890', name: 'Arroz 500 g', brand: 'Diana', category: 'Granos', unit: 'und', price: 2800, cost: 2100, taxCategory: 'excluido', taxRate: 0, active: true },
  { id: 'prd-002', sku: 'SKU-002', barcode: '7701234567891', name: 'Aceite 1 L', category: 'Aceites', unit: 'und', price: 12500, cost: 9800, taxCategory: 'gravado', taxRate: 0.19, active: true, brand: 'Oleosol', presentations: [{ name: 'Caja x12', factor: 12, price: 142500 }, { name: 'Paca x6', factor: 6, price: 72000 }] },
  { id: 'prd-003', sku: 'SKU-003', barcode: '7701234567892', name: 'Azúcar 1 kg', category: 'Granos', unit: 'und', price: 4200, cost: 3300, taxCategory: 'excluido', taxRate: 0, active: true },
  { id: 'prd-004', sku: 'SKU-004', barcode: '7701234567893', name: 'Leche entera 1 L', category: 'Lácteos', unit: 'und', price: 4600, cost: 3700, taxCategory: 'excluido', taxRate: 0, active: true },
  { id: 'prd-005', sku: 'SKU-005', barcode: '7701234567894', name: 'Detergente 1 kg', category: 'Aseo', unit: 'und', price: 9800, cost: 7400, taxCategory: 'gravado', taxRate: 0.19, active: true },
  { id: 'prd-006', sku: 'SKU-006', name: 'Café molido 250 g', category: 'Bebidas', unit: 'und', price: 8900, cost: 6900, taxCategory: 'excluido', taxRate: 0, active: false },
];

/** Clientes tal como se persisten; la API añade `outstandingBalance` y `overdueBalance` (mocks/derive.ts). */
export const customers: CustomerRecord[] = [
  { id: 'cus-001', name: 'Tienda La Esquina', documentType: 'NIT', taxId: '900123456-1', taxResponsibility: 'R-99-PN', phone: '3001112233', email: 'compras@laesquina.example', active: true, creditLimit: 1_500_000, addresses: [{ label: 'Principal', line: 'Cra 7 # 45-10', city: 'Bogotá' }] },
  { id: 'cus-002', name: 'Restaurante El Sazón', documentType: 'NIT', taxId: '901234567-2', taxResponsibility: 'R-99-PN', email: 'admin@elsazon.example', active: true, creditLimit: 800_000 },
  { id: 'cus-003', name: 'Cliente mostrador', documentType: 'CC', taxId: '222222222222', taxResponsibility: 'R-99-PN', active: true, creditLimit: 0 },
];

export const suppliers: Supplier[] = [
  { id: 'sup-001', name: 'Distribuidora Andina', taxId: '800765432-9', active: true, paymentTermsDays: 30, taxResponsibility: 'O-13' },
  { id: 'sup-002', name: 'Lácteos del Valle', taxId: '800111222-3', active: true, paymentTermsDays: 15, taxResponsibility: 'R-99-PN' },
];

export const employees: Employee[] = [
  { id: 'emp-001', name: 'Laura Gómez', role: 'cajero', branchId: BRANCH, active: true },
  { id: 'emp-002', name: 'Andrés Rojas', role: 'bodeguero', branchId: BRANCH, active: true },
  { id: 'emp-003', name: 'María Pérez', role: 'admin', branchId: BRANCH, active: true },
  { id: 'emp-004', name: 'Carlos Dueño', role: 'propietario', branchId: BRANCH, active: true },
  { id: 'emp-005', name: 'Sofía Ruiz', role: 'bodeguero', branchId: 'br-002', active: true },
  { id: 'emp-006', name: 'Pedro Compras', role: 'comprador', branchId: BRANCH, active: true },
  { id: 'emp-007', name: 'Ana Cartera', role: 'cartera', branchId: BRANCH, active: true },
];

export const sales: Sale[] = [
  {
    id: 'sal-001', number: 'POS-0001', date: '2026-10-01', customerId: 'cus-003', cashierId: 'emp-001', branchId: BRANCH, shiftId: null,
    lines: [{ productId: 'prd-001', quantity: 2, unitPrice: 2800, discount: 0, returnedQuantity: 0 }], payments: [{ method: 'efectivo', amount: 5600 }], roundingAdjustment: 0, total: 5600, status: 'pagada',
  },
  {
    id: 'sal-002', number: 'POS-0002', date: '2026-09-20', customerId: 'cus-001', cashierId: 'emp-001', branchId: BRANCH, shiftId: null,
    lines: [{ productId: 'prd-002', quantity: 32, unitPrice: 12500, discount: 0, returnedQuantity: 0 }], payments: [{ method: 'credito', amount: 400000 }], roundingAdjustment: 0, total: 400000, status: 'credito',
  },
  {
    id: 'sal-003', number: 'POS-0003', date: '2026-10-03', customerId: 'cus-002', cashierId: 'emp-001', branchId: BRANCH, shiftId: null,
    lines: [
      { productId: 'prd-003', quantity: 5, unitPrice: 4200, discount: 0, returnedQuantity: 0 },
      { productId: 'prd-004', quantity: 6, unitPrice: 4600, discount: 600, returnedQuantity: 0 },
    ],
    payments: [{ method: 'efectivo', amount: 20000 }, { method: 'nequi', amount: 28000 }], roundingAdjustment: 0, total: 48000, status: 'pagada',
  },
];

export const stockLevels: StockLevel[] = [
  ...products.map((p, i) => ({ productId: p.id, branchId: BRANCH, onHand: 40 + i * 15, inTransit: 0, minimum: 20 })),
  // Sede 2: existencias iniciales para pruebas de traslado.
  { productId: 'prd-001', branchId: 'br-002', onHand: 10, inTransit: 0, minimum: 5 },
  { productId: 'prd-002', branchId: 'br-002', onHand: 10, inTransit: 0, minimum: 5 },
];

export const branches: Branch[] = [
  { id: 'br-001', name: 'Sede Principal', active: true },
  { id: 'br-002', name: 'Sede Norte', active: true },
];
/**
 * Paquete de país CO (v0.7.0, PROPUESTA): nueve canales explícitos; ninguno se oculta dentro de otro. Los textos son
 * es-CO; la traducción por idioma llega con la infraestructura de i18n.
 */
const reference = { key: 'reference', label: 'Número de referencia o aprobación', required: true, input: 'text' } as const;
const payer = { key: 'payer', label: 'Nombre del pagador', required: false, input: 'text' } as const;
const phone = { key: 'phone', label: 'Celular de origen', required: false, input: 'digits' } as const;
export const countryPack: CountryPack = {
  countryCode: 'CO',
  currency: { code: 'COP', minorUnits: 0 },
  paymentChannels: [
    { id: 'efectivo', label: 'Efectivo', type: 'cash', method: 'efectivo', requiresProof: false, fields: [], destinations: [] },
    {
      id: 'nequi', label: 'Nequi', type: 'wallet', method: 'nequi', requiresProof: true, fields: [reference, phone, payer],
      destinations: [{ id: 'nequi-1', label: 'Nequi del negocio · 300 ••• 4567' }],
    },
    {
      id: 'daviplata', label: 'DaviPlata', type: 'wallet', method: 'daviplata', requiresProof: true, fields: [reference, phone, payer],
      destinations: [{ id: 'dp-1', label: 'DaviPlata del negocio · 310 ••• 8821' }],
    },
    {
      id: 'bancolombia', label: 'Bancolombia', type: 'bank_transfer', method: 'transferencia', requiresProof: true,
      fields: [reference, payer], destinations: [{ id: 'bc-ah', label: 'Ahorros Bancolombia ••• 1234' }],
    },
    {
      id: 'otros-bancos', label: 'Otros bancos', type: 'bank_transfer', method: 'transferencia', requiresProof: true,
      fields: [reference, { key: 'bank', label: 'Banco de origen', required: true, input: 'text' }, payer],
      destinations: [{ id: 'bc-ah', label: 'Ahorros Bancolombia ••• 1234' }],
    },
    {
      id: 'bre-b', label: 'Bre-B', type: 'instant_key', method: 'transferencia', requiresProof: true,
      fields: [reference, { key: 'key', label: 'Llave usada', required: false, input: 'text' }, payer],
      destinations: [{ id: 'breb-1', label: 'Llave Bre-B del negocio' }],
    },
    {
      id: 'datafono', label: 'Tarjeta / datáfono', type: 'card_terminal', method: 'tarjeta', requiresProof: false,
      fields: [
        { key: 'authCode', label: 'Código de aprobación', required: true, input: 'text' },
        { key: 'last4', label: 'Últimos 4 dígitos', required: false, input: 'digits' },
        { key: 'terminal', label: 'Terminal', required: false, input: 'text' },
      ],
      destinations: [],
    },
    { id: 'credito', label: 'Crédito', type: 'credit', method: 'credito', requiresProof: false, fields: [], destinations: [] },
    {
      id: 'pse', label: 'PSE / pasarela', type: 'gateway', method: 'transferencia', requiresProof: true,
      fields: [{ key: 'reference', label: 'Código de transacción (CUS)', required: true, input: 'text' }, payer],
      destinations: [{ id: 'pse-1', label: 'Pasarela de la empresa' }],
    },
  ],
  documentTypes: [
    { id: 'factura-electronica', label: 'Factura electrónica de venta', hint: 'Requiere cliente con datos fiscales validados.', isDefault: false },
    { id: 'documento-equivalente-pos', label: 'Documento equivalente electrónico POS', hint: 'Para ventas de mostrador sin factura.', isDefault: true },
  ],
  cashDenominations: [
    ...[100000, 50000, 20000, 10000, 5000, 2000, 1000].map((v) => ({ id: `bill-${v}`, kind: 'bill' as const, value: v })),
    ...[1000, 500, 200, 100, 50].map((v) => ({ id: `coin-${v}`, kind: 'coin' as const, value: v })),
  ],
};

/** Una caja por sede (reg-00N para br-00N, ver `sessionFor`). La base esperada de reg-002 queda sin configurar a propósito. */
export const registers: Omit<Register, 'status' | 'occupiedBy'>[] = [
  { id: 'reg-001', name: 'Caja 1', branchId: 'br-001', terminal: { id: 'ter-001', name: 'Terminal 1' }, expectedOpening: 100000 },
  { id: 'reg-002', name: 'Caja 1', branchId: 'br-002', terminal: { id: 'ter-002', name: 'Terminal 1' }, expectedOpening: null },
];
export const saleReturns: SaleReturn[] = [];
export const shifts: Shift[] = [];
export const transfers: Transfer[] = [];
export const alerts: InventoryAlert[] = [];

export const stockMovements: StockMovement[] = [
  { id: 'stk-001', date: '2026-09-29', productId: 'prd-001', branchId: BRANCH, type: 'entrada', quantity: 100, reference: 'PO-0001' },
  { id: 'stk-002', date: '2026-10-01', productId: 'prd-001', branchId: BRANCH, type: 'salida', quantity: 2, reference: 'POS-0001' },
  { id: 'stk-003', date: '2026-10-03', productId: 'prd-003', branchId: BRANCH, type: 'salida', quantity: 5, reference: 'POS-0003' },
];

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-001', number: 'PO-0001', date: '2026-09-28', supplierId: 'sup-001',
    lines: [{ productId: 'prd-001', quantity: 100, unitCost: 2100 }], total: 210000, status: 'recibida',
  },
  {
    id: 'po-002', number: 'PO-0002', date: '2026-10-05', supplierId: 'sup-002',
    lines: [{ productId: 'prd-004', quantity: 60, unitCost: 3700 }], total: 222000, status: 'enviada',
  },
];

export const receivables: ReceivableRecord[] = [
  { id: 'rec-001', customerId: 'cus-001', saleId: 'sal-002', branchId: BRANCH, issued: '2026-09-20', due: '2026-10-20', amount: 400000, paid: 100000 },
];

export const payables: PayableRecord[] = [
  { id: 'pay-001', supplierId: 'sup-001', purchaseOrderId: 'po-001', branchId: BRANCH, issued: '2026-09-28', due: '2026-10-28', amount: 210000, paid: 0 },
];

/** Datos de la empresa (GET/PUT /company, v0.5.0). */
export const company: Company = {
  id: 'co-001', name: 'Comercial Demo S.A.S.', taxId: '900555444-3', taxResponsibility: 'O-13',
  address: 'Calle 10 # 5-20, Bogotá', phone: '6015550000', email: 'contabilidad@comercialdemo.example',
};
export const receivablePayments: ReceivablePayment[] = [];
export const inventoryCounts: InventoryCount[] = [];

export const createSeed = () => structuredClone({
  products, customers, suppliers, employees, sales, stockLevels, stockMovements, purchaseOrders, receivables, payables,
  shifts, transfers, alerts, branches, saleReturns, registers, countryPack, company, receivablePayments, inventoryCounts,
});
export type MockDb = ReturnType<typeof createSeed>;
