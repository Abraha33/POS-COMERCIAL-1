import { describe, expect, it } from 'vitest';
import { contracts } from '@/shared/contracts/registry';

describe('contratos compartidos', () => {
  for (const [name, contract] of Object.entries(contracts)) {
    it(`${name}: el ejemplo cumple su schema y declara DocType Frappe`, () => {
      expect(contract.doctype.length).toBeGreaterThan(0);
      expect(() => contract.schema.parse(contract.example)).not.toThrow();
    });
  }
});
