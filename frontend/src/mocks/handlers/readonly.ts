import { http, HttpResponse } from 'msw';
import { db } from '../db';

/** Lecturas de los módulos que aún no tienen mutaciones. Cada módulo moverá aquí su propio archivo al implementarlas. */
export const readonlyHandlers = [
  http.get('/api/v1/customers', () => HttpResponse.json(db.customers)),
  http.get('/api/v1/suppliers', () => HttpResponse.json(db.suppliers)),
  http.get('/api/v1/employees', () => HttpResponse.json(db.employees)),
  http.get('/api/v1/sales', () => HttpResponse.json(db.sales)),
  http.get('/api/v1/stock/levels', () => HttpResponse.json(db.stockLevels)),
  http.get('/api/v1/stock/movements', () => HttpResponse.json(db.stockMovements)),
  http.get('/api/v1/purchase-orders', () => HttpResponse.json(db.purchaseOrders)),
  http.get('/api/v1/receivables', () => HttpResponse.json(db.receivables)),
  http.get('/api/v1/payables', () => HttpResponse.json(db.payables)),
];
