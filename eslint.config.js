import { readdirSync } from 'node:fs';
import tseslint from 'typescript-eslint';

const features = readdirSync('src/features', { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

/** Regla de límites: una feature no importa de otra feature ni de internals de app/. */
const featureBoundary = (feature) => ({
  files: [`src/features/${feature}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...features
            .filter((other) => other !== feature)
            .map((other) => ({
              group: [`@/features/${other}`, `@/features/${other}/**`],
              message: `La feature "${feature}" no puede importar de "${other}". Comparte vía src/shared.`,
            })),
          { group: ['../../*'], message: 'Usa el alias @/ en lugar de rutas relativas largas.' },
        ],
      },
    ],
  },
});

/** shared/ no depende de features ni de app/ (salvo lo declarado en docs/BRANCHING.md). */
const sharedBoundary = {
  files: ['src/shared/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: [{ group: ['@/features/**'], message: 'shared/ no puede depender de features/.' }] },
    ],
  },
};

export default tseslint.config(
  { ignores: ['dist', 'storybook-static', 'public', 'node_modules'] },
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/consistent-type-imports': 'error' } },
  sharedBoundary,
  ...features.map(featureBoundary),
);
