import { z } from 'zod';
import type { Contract } from './common';

const partyBase = {
  id: z.string(),
  name: z.string().min(1),
  taxId: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  active: z.boolean(),
};

/** BR-CLI-07: tipos de documento DIAN. */
export const documentTypeSchema = z.enum(['CC', 'NIT', 'CE', 'TI', 'PPT', 'PEP']);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const customerSchema = z.object({
  ...partyBase,
  documentType: documentTypeSchema,
  taxResponsibility: z.string().min(1),
  creditLimit: z.number().int().nonnegative(),
});
export type Customer = z.infer<typeof customerSchema>;
export const customerContract: Contract<typeof customerSchema> = {
  doctype: 'Customer',
  schema: customerSchema,
  example: {
    id: 'cus-001', name: 'Tienda La Esquina', documentType: 'NIT', taxId: '900123456-1', taxResponsibility: 'R-99-PN',
    phone: '3001112233', email: 'compras@laesquina.example', active: true, creditLimit: 1_500_000,
  },
};

export const supplierSchema = z.object({ ...partyBase, paymentTermsDays: z.number().int().nonnegative() });
export type Supplier = z.infer<typeof supplierSchema>;
export const supplierContract: Contract<typeof supplierSchema> = {
  doctype: 'Supplier',
  schema: supplierSchema,
  example: { id: 'sup-001', name: 'Distribuidora Andina', taxId: '800765432-9', active: true, paymentTermsDays: 30 },
};

export const employeeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  role: z.enum(['cajero', 'bodeguero', 'comprador', 'cartera', 'admin', 'propietario']),
  branchId: z.string(),
  active: z.boolean(),
});
export type Employee = z.infer<typeof employeeSchema>;
export const employeeContract: Contract<typeof employeeSchema> = {
  doctype: 'Employee',
  schema: employeeSchema,
  example: { id: 'emp-001', name: 'Laura Gómez', role: 'cajero', branchId: 'br-001', active: true },
};

/** Cuerpos de alta/edición (el servidor asigna el `id`). */
export const customerInputSchema = customerSchema.omit({ id: true });
export type CustomerInput = z.infer<typeof customerInputSchema>;
export const customerInputContract: Contract<typeof customerInputSchema> = {
  doctype: 'Customer',
  schema: customerInputSchema,
  example: {
    name: 'Ferretería El Tornillo', documentType: 'NIT', taxId: '901555777-4', taxResponsibility: 'R-99-PN',
    phone: '3105550000', email: 'compras@eltornillo.example', active: true, creditLimit: 500000,
  },
};

export const supplierInputSchema = supplierSchema.omit({ id: true });
export type SupplierInput = z.infer<typeof supplierInputSchema>;
export const supplierInputContract: Contract<typeof supplierInputSchema> = {
  doctype: 'Supplier',
  schema: supplierInputSchema,
  example: { name: 'Importadora Sur', taxId: '800999111-5', active: true, paymentTermsDays: 45 },
};

export const employeeInputSchema = employeeSchema.omit({ id: true });
export type EmployeeInput = z.infer<typeof employeeInputSchema>;
export const employeeInputContract: Contract<typeof employeeInputSchema> = {
  doctype: 'Employee',
  schema: employeeInputSchema,
  example: { name: 'Julián Torres', role: 'comprador', branchId: 'br-001', active: true },
};

export const branchSchema = z.object({ id: z.string(), name: z.string().min(1), active: z.boolean() });
export type Branch = z.infer<typeof branchSchema>;
export const branchContract: Contract<typeof branchSchema> = {
  doctype: 'Branch',
  schema: branchSchema,
  example: { id: 'br-001', name: 'Sede Principal', active: true },
};
