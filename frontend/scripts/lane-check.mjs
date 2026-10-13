// Comprueba que un carril solo toque lo suyo. Funciona igual desde cualquier herramienta (Claude, Codex, OpenCode).
//   pnpm lane:check                       carril = rama actual (lane/<nombre>)
//   pnpm lane:check --lane inventory      carril explícito
//   pnpm lane:check --base feat/pos-proofs --json
//   pnpm lane:check --lane inventory --files a.ts,b.ts   (prueba sin git)
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, laneFromBranch } from './lib/lanes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
};

const root = git(here, 'rev-parse', '--show-toplevel');
if (!root) {
  console.error('No se pudo localizar la raíz del repositorio git.');
  process.exit(2);
}
const config = JSON.parse(readFileSync(path.join(root, 'lanes.json'), 'utf8'));
const branch = git(root, 'branch', '--show-current');
const lane = arg('lane') ?? laneFromBranch(branch);
if (!lane || (lane !== 'integrator' && !config.lanes[lane])) {
  console.error(`Carril no reconocido: "${lane ?? branch}". Usa --lane con uno de: ${['integrator', ...Object.keys(config.lanes)].join(', ')}`);
  process.exit(2);
}

let files;
const explicit = arg('files');
if (explicit) {
  files = explicit.split(',').map((f) => f.trim()).filter(Boolean);
} else {
  const base = arg('base') ?? config.trunk;
  const mergeBase = git(root, 'merge-base', 'HEAD', base);
  if (!mergeBase) {
    // Sin base no se revisó nada: nunca se reporta como "todo bien".
    console.error(`❌ No se pudo calcular la base de comparación con "${base}". Verifica que la rama exista (git fetch) o pasa --base.`);
    process.exit(2);
  }
  const sets = [
    git(root, 'diff', '--name-only', `${mergeBase}...HEAD`),
    git(root, 'diff', '--name-only'),
    git(root, 'diff', '--name-only', '--cached'),
    git(root, 'ls-files', '--others', '--exclude-standard'),
  ];
  files = [...new Set(sets.flatMap((s) => s.split('\n')).map((f) => f.trim()).filter(Boolean))];
}

const result = classify(config, lane, files);
if (args.includes('--json')) {
  console.log(JSON.stringify({ lane, files: files.length, ...result }, null, 2));
} else if (result.ok) {
  console.log(`✅ Carril "${lane}": ${files.length} archivo(s) cambiado(s), todos dentro de su propiedad.`);
} else {
  console.error(`❌ Carril "${lane}": ${result.violations.length} archivo(s) fuera de su propiedad:\n`);
  for (const v of result.violations) console.error(`  · ${v.file}\n      → ${v.reason}`);
  console.error(`\nSi necesitas ese cambio, pídelo en docs/qa/requests/lane-${lane}.md y el integrador lo publica primero.`);
}
process.exit(result.ok ? 0 : 1);
