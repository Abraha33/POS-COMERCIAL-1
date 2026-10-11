# Ramas, worktrees e integración

- `main`: siempre verde (`pnpm core:check` pasa).
- `integration`: rama donde el integrador junta los módulos.
- `feat/<modulo>`: una rama por agente, en su propio worktree:

```bash
git worktree add ../POS-wt-pos -b feat/pos integration
```

## Reglas
1. Un agente = un módulo = una rama. Nunca dos agentes escriben los mismos archivos.
2. Antes de abrir PR: `pnpm typecheck && pnpm lint && pnpm test`.
3. PR hacia `integration`, nunca a `main`. Solo toca archivos de tu módulo (ver `MODULE_OWNERSHIP.md`).
4. Cambios en contratos (`frontend/src/shared/contracts`) o componentes compartidos: solo vía PR `core:` revisado por el integrador.
5. Rebase sobre `integration` antes del PR; el integrador resuelve conflictos.
6. Cada pantalla nueva trae: test (Vitest), handler de mock coherente con el seed y, si es un componente reutilizable, story.
7. Tras integrar varios módulos: `pnpm core:check` y recorrido E2E entre módulos.

## Criterios de aceptación por pantalla
- Usa `ScreenTemplate`/`DataTablePage`/`FormField` o justifica por qué no.
- Estados de carga, vacío y error cubiertos.
- Permisos aplicados (`RouteGuard` en ruta, `Can` en acciones).
- Operable con teclado y sin violaciones críticas de axe.

## Backend y contrato
- Rama del backend: `be/<carril>` (p. ej. `be/sales`), en su propio worktree.
- Un PR de backend es aceptable si `API_BASE_URL=<su instancia> pnpm conformance` pasa los escenarios de su carril.
- Un PR `contract:` debe incluir: cambio en `openapi.yaml`, `examples/`, regla en `docs/business-rules/`,
  escenario en `frontend/src/conformance/scenarios.ts` y mock actualizado. `pnpm core:check` verde.
