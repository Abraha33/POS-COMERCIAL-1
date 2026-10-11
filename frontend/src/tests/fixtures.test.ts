import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSeed } from '@/mocks/seed';
import { TEST_PASSWORD, testUsers } from '@/mocks/test-users';

/**
 * contracts/fixtures es lo que el backend de desarrollo debe cargar para pasar la suite de conformidad.
 * Se genera desde el seed del mock; regenerar con: UPDATE_FIXTURES=1 pnpm test fixtures
 */
const fixturesDir = path.resolve(import.meta.dirname, '../../../contracts/fixtures');

const expected = {
  'seed.json': createSeed(),
  'users.json': {
    note: 'Usuarios y PIN de PRUEBA para desarrollo y conformidad. Nunca usar en producción.',
    password: TEST_PASSWORD,
    users: testUsers,
  },
};

describe('contracts/fixtures', () => {
  for (const [file, content] of Object.entries(expected)) {
    it(`${file} coincide con el seed de los mocks`, () => {
      const target = path.join(fixturesDir, file);
      const serialized = `${JSON.stringify(content, null, 2)}\n`;
      if (process.env.UPDATE_FIXTURES === '1') writeFileSync(target, serialized);
      expect(existsSync(target), `falta ${file}; ejecuta UPDATE_FIXTURES=1 pnpm test fixtures`).toBe(true);
      expect(JSON.parse(readFileSync(target, 'utf8'))).toEqual(JSON.parse(serialized));
    });
  }
});
