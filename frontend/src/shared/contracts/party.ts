import { z } from 'zod';
import { money, type Contract } from './common';

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

/**
 * Catálogo cerrado de responsabilidades tributarias DIAN (A7, PROPUESTA v0.5.0):
 * O-13 gran contribuyente, O-15 autorretenedor, O-23 agente de retención de IVA,
 * O-47 régimen simple de tributación, R-99-PN no aplica / otros.
 */
export const taxResponsibilitySchema = z.enum(['O-13', 'O-15', 'O-23', 'O-47', 'R-99-PN']);
export type TaxResponsibility = z.infer<typeof taxResponsibilitySchema>;

/** Campos que persiste el cliente (alta/edición). */
export const customerRecordSchema = z.object({
  ...partyBase,
  documentType: documentTypeSchema,
  taxResponsibility: taxResponsibilitySchema,
  creditLimit: z.number().int().nonnegative(),
});
export type CustomerRecord = z.infer<typeof customerRecordSchema>;

/** v0.5.0: `outstandingBalance` y `overdueBalance` los calcula el servidor (autoridad) a la fecha de hoy. */
export const customerSchema = customerRecordSchema.extend({
  outstandingBalance: money,
  overdueBalance: money,
});
export type Customer = z.infer<typeof customerSchema>;
export const customerContract: Contract<typeof customerSchema> = {
  doctype: 'Customer',
  schema: customerSchema,
  example: {
    id: 'cus-001', name: 'Tienda La Esquina', documentType: 'NIT', taxId: '900123456-1', taxResponsibility: 'R-99-PN',
    phone: '3001112233', email: 'compras@laesquina.example', active: true, creditLimit: 1_500_000,
    outstandingBalance: 300000, overdueBalance: 0,
  },
};

export const supplierSchema = z.object({
  ...partyBase,
  paymentTermsDays: z.number().int().nonnegative(),
  taxResponsibility: taxResponsibilitySchema.optional(),
});
export type Supplier = z.infer<typeof supplierSchema>;
export const supplierContract: Contract<typeof supplierSchema> = {
  doctype: 'Supplier',
  schema: supplierSchema,
  example: {
    id: 'sup-001', name: 'Distribuidora Andina', taxId: '800765432-9', active: true, paymentTermsDays: 30,
    taxResponsibility: 'O-13',
  },
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
export const customerInputSchema = customerRecordSchema.omit({ id: true });
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

/** PUT /branches/{id} (PROPUESTA v0.5.0): solo nombre y estado. */
export const branchInputSchema = branchSchema.omit({ id: true });
export type BranchInput = z.infer<typeof branchInputSchema>;
export const branchInputContract: Contract<typeof branchInputSchema> = {
  doctype: 'Branch',
  schema: branchInputSchema,
  example: { name: 'Sede Principal', active: true },
};

/** Datos de la empresa (GET/PUT /company, PROPUESTA v0.5.0). */
export const companySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  taxId: z.string().min(1),
  taxResponsibility: taxResponsibilitySchema,
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});
export type Company = z.infer<typeof companySchema>;
export const companyContract: Contract<typeof companySchema> = {
  doctype: 'Company',
  schema: companySchema,
  example: {
    id: 'co-001', name: 'Comercial Demo S.A.S.', taxId: '900555444-3', taxResponsibility: 'O-13',
    address: 'Calle 10 # 5-20, Bogotá', phone: '6015550000', email: 'contabilidad@comercialdemo.example',
  },
};

export const companyInputSchema = companySchema.omit({ id: true });
export type CompanyInput = z.infer<typeof companyInputSchema>;
export const companyInputContract: Contract<typeof companyInputSchema> = {
  doctype: 'Company',
  schema: companyInputSchema,
  example: {
    name: 'Comercial Demo S.A.S.', taxId: '900555444-3', taxResponsibility: 'O-13',
    address: 'Calle 10 # 5-20, Bogotá', phone: '6015550000', email: 'contabilidad@comercialdemo.example',
  },
};

/** Etiquetas legibles del catálogo DIAN de responsabilidades tributarias. */
export const taxResponsibilityLabels: Record<TaxResponsibility, string> = {
  'O-13': 'O-13 Gran contribuyente',
  'O-15': 'O-15 Autorretenedor',
  'O-23': 'O-23 Agente de retención de IVA',
  'O-47': 'O-47 Régimen simple de tributación',
  'R-99-PN': 'R-99-PN No aplica / otros',
};
