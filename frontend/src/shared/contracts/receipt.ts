import { z } from 'zod';

export const saleReceiptDocumentSchema = z.object({ saleId: z.string(), saleNumber: z.string(), copyNumber: z.number().int().nonnegative(), issuedAt: z.string(), documentType: z.string(), content: z.string() });
export type SaleReceiptDocument = z.infer<typeof saleReceiptDocumentSchema>;
export const reprintCreateSchema = z.object({ reason: z.string().min(3).optional() });
export type ReprintCreate = z.infer<typeof reprintCreateSchema>;
export const reprintRecordSchema = z.object({ id: z.string(), saleId: z.string(), copyNumber: z.number().int().positive(), requestedAt: z.string(), requestedBy: z.string(), reason: z.string().nullable() });
export type ReprintRecord = z.infer<typeof reprintRecordSchema>;