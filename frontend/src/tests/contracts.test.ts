import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contracts } from '@/shared/contracts/registry';

const examplesDir = path.resolve(import.meta.dirname, '../../../contracts/examples');

describe('contratos compartidos', () => {
  for (const [name, contract] of Object.entries(contracts)) {
    it(`${name}: el ejemplo cumple su schema y declara DocType Frappe`, () => {
      expect(contract.doctype.length).toBeGreaterThan(0);
      expect(() => contract.schema.parse(contract.example)).not.toThrow();
    });

    it(`${name}: contracts/examples/${name}.json coincide con el ejemplo del frontend`, () => {
      const shared: unknown = JSON.parse(readFileSync(path.join(examplesDir, `${name}.json`), 'utf8'));
      expect(shared).toEqual(contract.example);
    });
  }
});
