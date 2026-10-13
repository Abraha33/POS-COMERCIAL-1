// Crea un carril de trabajo: worktree + rama lane/<nombre> + instalación + puerto, sin tocar ningún otro.
//   pnpm lane:new inventory                       crea ../lane-inventory desde la rama troncal
//   pnpm lane:new inventory --base <ref>          base explícita
//   pnpm lane:new inventory --dest D:\ruta        carpeta explícita
//   pnpm lane:new inventory --dry-run             muestra qué haría, sin crear nada
//   pnpm lane:new inventory --no-install          sin pnpm install
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const valueFlags = new Set(['--base', '--dest']);
const name = args.find((a, i) => !a.startsWith('--') && !valueFlags.has(args[i - 1]));
const arg = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const run = (cwd, cmd, a) => spawnSync(cmd, a, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
const fail = (msg) => {
  console.error(`❌ ${msg}`);
  process.exit(1);
};

const root = run(here, 'git', ['rev-parse', '--show-toplevel']).stdout.trim();
if (!root) fail('No se pudo localizar la raíz del repositorio git.');
const config = JSON.parse(readFileSync(path.join(root, 'lanes.json'), 'utf8'));
const lane = config.lanes[name ?? ''];
if (!lane) fail(`Carril desconocido: "${name ?? ''}". Disponibles: ${Object.keys(config.lanes).join(', ')}`);

const base = arg('base') ?? config.trunk;
const dest = path.resolve(arg('dest') ?? path.join(root, '..', `lane-${name}`));
const dry = args.includes('--dry-run');

// Nada se pisa: si la rama o la carpeta ya existen, se detiene.
if (run(root, 'git', ['rev-parse', '--verify', '--quiet', `refs/heads/${lane.branch}`]).status === 0) {
  fail(`La rama ${lane.branch} ya existe. Usa el worktree existente o elige otro carril.`);
}
if (existsSync(dest)) fail(`La carpeta ya existe: ${dest}`);
if (run(root, 'git', ['rev-parse', '--verify', '--quiet', base]).status !== 0) fail(`La base no existe: ${base}`);

console.log(`Carril:   ${name} — ${lane.title}`);
console.log(`Rama:     ${lane.branch}  (desde ${base} @ ${run(root, 'git', ['rev-parse', '--short', base]).stdout.trim()})`);
console.log(`Carpeta:  ${dest}`);
console.log(`Puerto:   ${lane.port}  (DEV_PORT=${lane.port} pnpm dev / pnpm e2e)`);
console.log(`Posee:    ${lane.owns.join('\n          ')}`);
if (dry) {
  console.log('\n(dry-run: no se creó nada)');
  process.exit(0);
}

const add = run(root, 'git', ['worktree', 'add', '-b', lane.branch, dest, base]);
if (add.status !== 0) fail(`git worktree add falló:\n${add.stderr}`);

if (!args.includes('--no-install')) {
  console.log('\nInstalando dependencias (pnpm install --frozen-lockfile)…');
  const inst = run(path.join(dest, 'frontend'), 'pnpm', ['install', '--frozen-lockfile']);
  if (inst.status !== 0) fail(`pnpm install falló:\n${inst.stderr}`);
}
console.log(`\n✅ Listo. Entra con:  cd "${dest}\\frontend"  ·  DEV_PORT=${lane.port} pnpm dev`);
console.log('   Antes de cada PR:  pnpm typecheck && pnpm lint && pnpm test && pnpm lane:check');
