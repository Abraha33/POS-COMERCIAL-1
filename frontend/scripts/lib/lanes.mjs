// Lógica pura de propiedad por carril. Sin acceso a git ni al disco: se prueba con node --test.
// Fuente de datos: lanes.json en la raíz del repositorio.

const REGEX_SPECIALS = new Set(['\\', '^', '$', '+', '?', '.', '(', ')', '|', '{', '}', '[', ']']);

/** Convierte un glob simple (`**`, `*`) en una expresión regular anclada. */
export const globToRegExp = (glob) => {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i += 1;
        if (glob[i + 1] === '/') i += 1;
      } else {
        out += '[^/]*';
      }
    } else if (REGEX_SPECIALS.has(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  return new RegExp(`^${out}$`);
};

export const normalize = (file) => file.split('\\').join('/').replace(/^\.\//, '');

export const matchesAny = (file, patterns = []) => patterns.some((p) => globToRegExp(p).test(normalize(file)));

/** Archivos que cualquier carril puede escribir: su pedido al integrador y su hoja de carril. */
export const laneAlwaysAllowed = (lane) => [`docs/qa/requests/lane-${lane}.md`, `docs/lanes/${lane}.md`];

/**
 * Clasifica los archivos cambiados de un carril.
 * Devuelve `{ ok, violations: [{ file, reason, owner? }] }`.
 * `integrator` puede tocar todo (es el único que edita lo serializado).
 */
export const classify = (config, lane, files) => {
  if (lane === 'integrator') return { ok: true, violations: [] };
  const own = config.lanes[lane];
  if (!own) throw new Error(`Carril desconocido: ${lane}`);
  const violations = [];
  for (const raw of files) {
    const file = normalize(raw);
    if (matchesAny(file, own.owns) || matchesAny(file, laneAlwaysAllowed(lane))) continue;
    const other = Object.entries(config.lanes).find(([name, l]) => name !== lane && matchesAny(file, l.owns));
    if (other) {
      violations.push({ file, owner: other[0], reason: `es del carril "${other[0]}"` });
    } else if (matchesAny(file, config.serialized)) {
      violations.push({ file, owner: 'integrator', reason: 'archivo serializado: solo lo edita el integrador' });
    } else {
      violations.push({ file, owner: null, reason: 'sin dueño asignado: pídelo al integrador' });
    }
  }
  return { ok: violations.length === 0, violations };
};

/** Detecta archivos que pertenecen a dos carriles a la vez. */
export const findOverlaps = (config, sampleFiles) => {
  const overlaps = [];
  for (const file of sampleFiles) {
    const owners = Object.entries(config.lanes).filter(([, l]) => matchesAny(file, l.owns)).map(([n]) => n);
    if (owners.length > 1) overlaps.push({ file, owners });
  }
  return overlaps;
};

export const laneFromBranch = (branch) => {
  const m = /^lane\/(.+)$/.exec(branch ?? '');
  return m ? m[1] : null;
};
