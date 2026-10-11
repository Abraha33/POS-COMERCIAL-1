#!/usr/bin/env node
/**
 * core:check — verifica los 8 gates del núcleo. Solo si TODOS pasan imprime
 * "READY FOR PARALLEL SCREEN CONSTRUCTION" y escribe CORE_READY.md.
 * Si falla alguno, borra CORE_READY.md y sale con código 1.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const has = (rel) => existsSync(path.join(root, rel));

const run = (label, args) => {
  process.stdout.write(`  · ${label} … `);
  const r = spawnSync('pnpm', args, { cwd: root, shell: true, encoding: 'utf8' });
  const ok = r.status === 0;
  console.log(ok ? 'ok' : 'FALLÓ');
  return { ok, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
};

const tail = (text, n = 12) => text.trim().split('\n').slice(-n).join('\n');
const gates = [];
const gate = (id, name, ok, detail = '') => gates.push({ id, name, ok, detail });

console.log('\nERP/POS — verificación del núcleo\n');

// ---- Módulos declarados (fuente de verdad para gates 3, 6, 8)
const modulesSrc = read('src/app/config/modules.ts');
const moduleIds = [...modulesSrc.matchAll(/\{ id: '([a-z]+)', label/g)].map((m) => m[1]);

// ---- Ejecuciones pesadas (una sola vez cada una)
console.log('Ejecutando comprobaciones:');
const typecheck = run('tsc --noEmit', ['typecheck']);
const build = run('vite build', ['exec', 'vite', 'build']);
const lint = run('eslint (límites entre módulos)', ['lint']);

const tmp = mkdtempSync(path.join(tmpdir(), 'core-check-'));
const vitestOut = path.join(tmp, 'vitest.json');
const vitest = run('vitest', ['exec', 'vitest', 'run', '--reporter=json', `--outputFile="${vitestOut}"`]);
let vitestFiles = {};
try {
  const json = JSON.parse(readFileSync(vitestOut, 'utf8'));
  for (const f of json.testResults) {
    vitestFiles[path.basename(f.name)] = f.assertionResults.length > 0 && f.status === 'passed';
  }
} catch {
  vitestFiles = {};
}

const genOut = path.join(tmp, 'schema.d.ts');
const genRun = run('tipos generados desde openapi.yaml', ['exec', 'openapi-typescript', '../contracts/openapi.yaml', '-o', `"${genOut}"`]);
let genFresh = false;
try {
  const norm = (t) => t.replaceAll(String.fromCharCode(13), '');
  genFresh = genRun.ok && norm(readFileSync(genOut, 'utf8')) === norm(read('src/shared/api/generated/schema.d.ts'));
} catch {
  genFresh = false;
}
rmSync(tmp, { recursive: true, force: true });

const e2e = run('playwright (smoke + a11y)', ['exec', 'playwright', 'test']);
const storybook = run('storybook build', ['exec', 'storybook', 'build', '--quiet']);
const conformance = run('conformidad por HTTP (mock)', ['conformance']);

// ---- Gate 1
gate(1, 'La aplicación compila y navega',
  typecheck.ok && build.ok && e2e.ok,
  [!typecheck.ok && `tsc:\n${tail(typecheck.out)}`, !build.ok && `build:\n${tail(build.out)}`, !e2e.ok && `e2e:\n${tail(e2e.out)}`]
    .filter(Boolean).join('\n'));

// ---- Gate 2
{
  const problems = [];
  if (!has('src/app/layouts/AppShell.tsx')) problems.push('falta AppShell');
  if (!/PrimeReactProvider/.test(has('src/app/providers/AppProviders.tsx') ? read('src/app/providers/AppProviders.tsx') : '')) problems.push('falta PrimeReactProvider');
  if (!/primereact\/resources\/themes\//.test(read('src/main.tsx'))) problems.push('tema PrimeReact no importado en main.tsx');
  if (!/"primereact":\s*"10\.9\.9"/.test(read('package.json'))) problems.push('PrimeReact no está fijado en 10.9.9');
  if (vitestFiles['app.test.tsx'] !== true) problems.push('app.test.tsx (shell/permisos) no pasa');
  gate(2, 'App Shell y PrimeReact configurados', problems.length === 0, problems.join('; '));
}

// ---- Gate 3
{
  const problems = [];
  const ownership = has('../docs/architecture/MODULE_OWNERSHIP.md') ? read('../docs/architecture/MODULE_OWNERSHIP.md') : '';
  const routes = read('src/routes/index.tsx');
  if (moduleIds.length === 0) problems.push('no se pudo leer src/app/config/modules.ts');
  for (const id of moduleIds) {
    if (!has(`src/features/${id}/index.ts`)) problems.push(`${id}: falta src/features/${id}/index.ts`);
    if (!routes.includes(`@/features/${id}'`)) problems.push(`${id}: sin ruta ancla en src/routes`);
    if (!ownership.includes(`\`${id}\``)) problems.push(`${id}: sin dueño en docs/architecture/MODULE_OWNERSHIP.md`);
  }
  gate(3, 'Mapa de rutas y propiedad por módulo', problems.length === 0, problems.join('; '));
}

// ---- Gate 4
{
  const problems = [];
  if (!has('src/shared/contracts/registry.ts')) problems.push('falta registry.ts');
  if (vitestFiles['contracts.test.ts'] !== true) problems.push('contracts.test.ts no pasa (ejemplos Zod vs contracts/examples)');
  if (vitestFiles['openapi.test.ts'] !== true) problems.push('openapi.test.ts no pasa (spec válida, ejemplos vs OpenAPI, mocks vs contrato)');
  if (!has('../contracts/openapi.yaml')) problems.push('falta contracts/openapi.yaml');
  if (!genFresh) problems.push('tipos generados desactualizados: ejecuta `pnpm gen:api` y commitea');
  gate(4, 'Contratos compartidos con tipos y ejemplos', problems.length === 0, problems.join('; '));
}

// ---- Gate 5
{
  const problems = [];
  if (vitestFiles['seed-integrity.test.ts'] !== true) problems.push('seed-integrity.test.ts no pasa');
  if (vitestFiles['conformance.mock.test.ts'] !== true) problems.push('conformance.mock.test.ts no pasa (mock incumple reglas aprobadas)');
  if (vitestFiles['fixtures.test.ts'] !== true) problems.push('fixtures.test.ts no pasa (regenerar: UPDATE_FIXTURES=1 pnpm test fixtures)');
  if (!conformance.ok) problems.push(`conformidad por HTTP falló:\n${tail(conformance.out)}`);
  gate(5, 'Mocks coherentes y conformes al contrato', problems.length === 0, problems.join('; '));
}

// ---- Gate 6
{
  const problems = [];
  for (const f of ['ScreenTemplate', 'DataTablePage', 'FormField']) {
    if (!has(`src/shared/ui/${f}.tsx`)) problems.push(`falta shared/ui/${f}`);
  }
  const featuresDir = path.join(root, 'src/features');
  const sources = readdirSync(featuresDir, { recursive: true })
    .map(String).filter((f) => f.endsWith('.tsx'))
    .map((f) => read(`src/features/${f.split(path.sep).join('/')}`));
  const count = (re) => sources.filter((src) => re.test(src)).length;
  if (count(/ScreenTemplate|DataTablePage/) < 5) problems.push('menos de 5 archivos de features usan ScreenTemplate/DataTablePage');
  if (count(/from 'primereact\/datatable'|DataTablePage/) < 5) problems.push('las tablas no usan DataTable de PrimeReact / DataTablePage');
  if (count(/FormField/) < 1) problems.push('ninguna feature usa FormField');
  gate(6, 'Plantillas de pantalla, formulario y tabla en uso', problems.length === 0, problems.join('; '));
}

// ---- Gate 7
gate(7, 'Storybook, Vitest y Playwright ejecutan en verde',
  storybook.ok && vitest.ok && e2e.ok,
  [!storybook.ok && `storybook:\n${tail(storybook.out)}`, !vitest.ok && `vitest:\n${tail(vitest.out)}`, !e2e.ok && 'playwright falló (ver gate 1)']
    .filter(Boolean).join('\n'));

// ---- Gate 8
{
  const problems = [];
  if (!has('../docs/architecture/BRANCHING.md')) problems.push('falta docs/architecture/BRANCHING.md');
  if (!lint.ok) problems.push(`eslint:\n${tail(lint.out)}`);
  gate(8, 'Reglas de ramas e integración vigentes', problems.length === 0, problems.join('; '));
}

// ---- Informe
const allOk = gates.every((g) => g.ok);
console.log('\nGate  Resultado  Descripción');
for (const g of gates) console.log(`  ${g.id}   ${g.ok ? '  ✅     ' : '  ❌     '} ${g.name}`);
for (const g of gates.filter((x) => !x.ok)) console.log(`\n❌ Gate ${g.id} — ${g.name}\n${g.detail}`);

const gitHead = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' });
const commit = gitHead.status === 0 ? gitHead.stdout.trim() : 'sin commits';
const readyFile = path.join(root, 'CORE_READY.md');

if (allOk) {
  const body = [
    '# CORE READY — READY FOR PARALLEL SCREEN CONSTRUCTION',
    '',
    `Verificado: ${new Date().toISOString()}  ·  commit: ${commit}`,
    '',
    '| Gate | Resultado | Descripción |',
    '|------|-----------|-------------|',
    ...gates.map((g) => `| ${g.id} | ✅ | ${g.name} |`),
    '',
    'Este archivo lo genera `pnpm core:check` y se borra si el chequeo vuelve a fallar.',
    'Reglas para los agentes: `docs/architecture/BRANCHING.md` y `docs/architecture/MODULE_OWNERSHIP.md`.',
    '',
  ].join('\n');
  writeFileSync(readyFile, body);
  console.log('\n✅ CORE READY — READY FOR PARALLEL SCREEN CONSTRUCTION');
  console.log('   Se puede iniciar la construcción paralela de pantallas por módulo.');
  console.log('   Detalle en CORE_READY.md\n');
  process.exit(0);
} else {
  if (existsSync(readyFile)) rmSync(readyFile);
  console.log('\n⛔ NOT READY — el núcleo no cumple todos los gates. No iniciar construcción paralela.\n');
  process.exit(1);
}
