// Repara los enlaces de los worktrees después de mover carpetas y avisa de los node_modules incompletos.
// No borra nada: `git worktree repair` solo reescribe punteros; las dependencias las reinstalas tú.
//
//   node scripts/lane-repair.mjs <repo-principal> [<carpeta-de-worktrees>] [--dry-run]
//
// <carpeta-de-worktrees> por defecto es la carpeta que contiene este worktree (los carriles son hermanos).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [main, root = path.resolve(import.meta.dirname, '..', '..', '..')] = args.filter((arg) => !arg.startsWith('--'));

if (!main || !fs.existsSync(path.join(main, '.git'))) {
  console.error('Uso: node scripts/lane-repair.mjs <repo-principal> [<carpeta-de-worktrees>] [--dry-run]');
  console.error('El repo principal es la carpeta que contiene la carpeta .git real (no un worktree).');
  process.exit(2);
}

const isWorktree = (dir) => {
  const pointer = path.join(dir, '.git');
  return fs.existsSync(pointer) && fs.statSync(pointer).isFile();
};
const pointerTarget = (dir) => fs.readFileSync(path.join(dir, '.git'), 'utf8').replace(/^gitdir:\s*/, '').trim();

const trees = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && isWorktree(path.join(root, entry.name)))
  .map((entry) => path.join(root, entry.name));

const broken = trees.filter((dir) => !fs.existsSync(pointerTarget(dir)));
console.log(`${trees.length} worktree(s) en ${root}; ${broken.length} con el enlace roto.`);

if (!dryRun && trees.length > 0) {
  const out = execFileSync('git', ['-C', main, 'worktree', 'repair', ...trees], { encoding: 'utf8' });
  console.log(out.trim() || 'git worktree repair: nada que corregir.');
}

// Control superficial: solo detecta que falte `.bin`. Una instalación a medias (paquetes con archivos faltantes, como pasó
// al mover carpetas) puede pasarlo; en ese caso `pnpm install --frozen-lockfile --force` o apartar node_modules y reinstalar.
const incomplete = trees.filter((dir) => {
  const frontend = path.join(dir, 'frontend');
  return fs.existsSync(frontend) && !fs.existsSync(path.join(frontend, 'node_modules', '.bin'));
});
if (incomplete.length > 0) {
  console.log('\nSin dependencias completas (reinstala con `pnpm install --frozen-lockfile` en frontend/):');
  incomplete.forEach((dir) => console.log(`  - ${path.basename(dir)}`));
}
process.exit(broken.length > 0 && dryRun ? 1 : 0);
