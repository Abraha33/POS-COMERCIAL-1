import { http, HttpResponse } from 'msw';
import { db } from '../db';

/** Lecturas de los módulos que aún no tienen mutaciones. Cada módulo moverá aquí su propio archivo al implementarlas. */
export const readonlyHandlers = [
  http.get('/api/customers', () => HttpResponse.json(db.customers)),
  http.get('/api/suppliers', () => HttpResponse.json(db.suppliers)),
  http.get('/api/employees', () => HttpResponse.json(db.employees)),
  http.get('/api/sales', () => HttpResponse.json(db.sales)),
  http.get('/api/stock/levels', () => HttpResponse.json(db.stockLevels)),
  http.get('/api/stock/movements', () => HttpResponse.json(db.stockMovements)),
  http.get('/api/purchase-orders', () => HttpResponse.json(db.purchaseOrders)),
  http.get('/api/receivables', () => HttpResponse.json(db.receivables)),
  http.get('/api/payables', () => HttpResponse.json(db.payables)),
];
