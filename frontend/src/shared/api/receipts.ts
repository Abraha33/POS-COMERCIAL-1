import { api } from './client';
import { reprintRecordSchema, saleReceiptDocumentSchema } from '@/shared/contracts';
import type { ReprintCreate } from '@/shared/contracts';
import { z } from 'zod';
export const getSaleReceipt = (saleId: string) => api.get(`/pos/sales/${saleId}/receipt`, saleReceiptDocumentSchema);
export const createSaleReprint = (saleId: string, input: ReprintCreate) => api.post(`/pos/sales/${saleId}/reprints`, input, saleReceiptDocumentSchema);
export const listSaleReprints = (saleId: string) => api.get(`/pos/sales/${saleId}/reprints`, z.array(reprintRecordSchema));