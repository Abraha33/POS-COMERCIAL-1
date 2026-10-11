import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { Validator } from '@seriousme/openapi-schema-validator';
import { parse } from 'yaml';
import { beforeAll, describe, expect, it } from 'vitest';
import { handlers } from '@/mocks/handlers';

const contractsDir = path.resolve(import.meta.dirname, '../../../contracts');
const specPath = path.join(contractsDir, 'openapi.yaml');
const spec = parse(readFileSync(specPath, 'utf8')) as {
  paths: Record<string, Record<string, { 'x-status'?: string }>>;
  components: { schemas: Record<string, unknown> };
};

/** examples/<archivo>.json -> schema de components.schemas contra el que debe validar. */
const exampleSchema: Record<string, string> = {
  product: 'Product', customer: 'Customer', supplier: 'Supplier', employee: 'Employee', sale: 'Sale',
  stockMovement: 'StockMovement', purchaseOrder: 'PurchaseOrder', receivable: 'Receivable', payable: 'Payable',
  apiError: 'Error', saleCreate: 'SaleCreate', saleReceipt: 'SaleReceipt', saleVoid: 'SaleVoid',
  shift: 'Shift', shiftOpen: 'ShiftOpen', shiftClose: 'ShiftClose', login: 'Login', authSession: 'AuthSession',
  shiftMovement: 'ShiftMovement', approvalRequest: 'ApprovalRequest', approval: 'Approval',
  transferCreate: 'TransferCreate', transfer: 'Transfer', inventoryAlert: 'InventoryAlert',
};

describe('contracts/openapi.yaml', () => {
  it('es una especificación OpenAPI válida', async () => {
    const validator = new Validator();
    const result = await validator.validate(specPath);
    expect(result.valid, JSON.stringify(result, null, 2)).toBe(true);
  });

  describe('ejemplos compartidos', () => {
    let ajv: Ajv2020;
    beforeAll(() => {
      ajv = new Ajv2020({ strict: false, allErrors: true });
      addFormats(ajv);
      ajv.addSchema(spec, 'openapi');
    });

    it('cada ejemplo tiene schema asignado y viceversa', () => {
      const files = readdirSync(path.join(contractsDir, 'examples')).map((f) => f.replace(/\.json$/, '')).sort();
      expect(files).toEqual(Object.keys(exampleSchema).sort());
    });

    for (const [file, schemaName] of Object.entries(exampleSchema)) {
      it(`${file}.json cumple components.schemas.${schemaName}`, () => {
        const validate = ajv.getSchema(`openapi#/components/schemas/${schemaName}`);
        expect(validate, `no existe el schema ${schemaName}`).toBeDefined();
        const example: unknown = JSON.parse(readFileSync(path.join(contractsDir, 'examples', `${file}.json`), 'utf8'));
        expect(validate?.(example), JSON.stringify(validate?.errors)).toBe(true);
      });
    }
  });

  describe('mocks MSW frente al contrato', () => {
    const mocked = new Set(
      handlers.map((h) => {
        const info = (h as unknown as { info: { method: string; path: string } }).info;
        const route = String(info.path).replace(/^\/api\/v1/, '').replace(/:(\w+)/g, '{$1}');
        return `${String(info.method).toLowerCase()} ${route}`;
      }),
    );
    const simulated = new Set<string>();
    for (const [route, ops] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        if (op['x-status'] === 'simulated') simulated.add(`${method} ${route}`);
      }
    }

    it('todo endpoint simulado en el contrato tiene handler', () => {
      expect([...simulated].filter((s) => !mocked.has(s))).toEqual([]);
    });

    it('todo handler de mock está declarado en el contrato como simulated', () => {
      expect([...mocked].filter((m) => !simulated.has(m))).toEqual([]);
    });
  });
});
