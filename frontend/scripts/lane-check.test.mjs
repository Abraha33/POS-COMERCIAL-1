import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { classify, findOverlaps, globToRegExp, laneFromBranch, matchesAny } from './lib/lanes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(path.join(here, '..', '..', 'lanes.json'), 'utf8'));

test('globs: ** cruza carpetas y * no', () => {
  assert.ok(globToRegExp('a/b/**').test('a/b/c/d.ts'));
  assert.ok(globToRegExp('a/*.css').test('a/x.css'));
  assert.ok(!globToRegExp('a/*.css').test('a/b/x.css'));
  assert.ok(globToRegExp('a/p*.test.*').test('a/pos-x.test.tsx'));
});

test('un carril puede tocar lo suyo y su pedido al integrador', () => {
  const r = classify(config, 'inventory', [
    'frontend/src/features/inventory/InventoryPage.tsx',
    'frontend/src/tests/inventory-screens.test.tsx',
    'docs/qa/requests/lane-inventory.md',
  ]);
  assert.equal(r.ok, true);
});

test('tocar el módulo de otro carril es violación y dice de quién es', () => {
  const r = classify(config, 'inventory', ['frontend/src/features/customers/CustomersPage.tsx']);
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].owner, 'customers');
});

test('lo serializado solo es del integrador', () => {
  for (const f of ['contracts/openapi.yaml', 'frontend/src/shared/api/queries.ts', 'frontend/src/routes/index.tsx', 'frontend/package.json']) {
    const r = classify(config, 'reports', [f]);
    assert.equal(r.ok, false, f);
    assert.equal(r.violations[0].owner, 'integrator', f);
  }
});

test('un archivo sin dueño también se rechaza', () => {
  const r = classify(config, 'reports', ['README.nuevo.md']);
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].owner, null);
});

test('lo del carril gana a lo serializado (las pruebas del módulo viven en src/tests)', () => {
  const r = classify(config, 'pos-proofs', ['frontend/src/tests/pos-proofs.test.ts', 'frontend/e2e/pos-proofs.spec.ts']);
  assert.equal(r.ok, true);
});

test('el integrador puede tocar todo; un carril desconocido falla', () => {
  assert.equal(classify(config, 'integrator', ['contracts/openapi.yaml']).ok, true);
  assert.throws(() => classify(config, 'no-existe', ['x']));
});

test('ningún archivo real tiene dos dueños', () => {
  const sample = [
    'frontend/src/features/pos/sale-draft/saleDraft.ts',
    'frontend/src/features/pos/payment-session/paymentSession.ts',
    'frontend/src/features/pos/mixed/MixedPayments.tsx',
    'frontend/src/features/pos/proofs/gateway.ts',
    'frontend/src/features/pos/QuickSale.tsx',
    'frontend/src/features/pos/PosPage.tsx',
    'frontend/src/features/pos/pos.css',
    'frontend/src/features/pos/orders/orders.ts',
    'frontend/src/tests/pos-proofs.test.ts',
    'frontend/src/tests/pos-quick-sale.test.tsx',
    'frontend/src/tests/pos-orders-ui.test.tsx',
    'frontend/src/tests/pos-ops-ui.test.tsx',
    'frontend/e2e/pos-sales.spec.ts',
  ];
  assert.deepEqual(findOverlaps(config, sample), []);
});

test('la rama lane/<nombre> da el carril', () => {
  assert.equal(laneFromBranch('lane/inventory'), 'inventory');
  assert.equal(laneFromBranch('feat/pos-proofs'), null);
  assert.ok(matchesAny('docs/lanes/x.md', ['docs/lanes/*.md']));
});

test('todos los carriles tienen rama, puerto único y al menos una ruta', () => {
  const ports = new Set();
  for (const [name, lane] of Object.entries(config.lanes)) {
    assert.equal(lane.branch, `lane/${name}`, name);
    assert.ok(lane.owns.length > 0, name);
    assert.ok(!ports.has(lane.port), `puerto repetido ${lane.port}`);
    ports.add(lane.port);
  }
  assert.ok(!ports.has(config.trunkPort));
});
