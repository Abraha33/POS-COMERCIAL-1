---
description: Checklist de cierre de un carril antes de pedir integración
---

Verifica en el worktree actual y reporta cada punto con evidencia (salida de comando o captura):

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm conformance` en verde.
- [ ] Solo modificaste archivos de tu propiedad (`git diff --stat integration...HEAD`).
- [ ] Cada pantalla: estados carga/vacío/error, permisos (`RouteGuard`/`Can`), teclado, 3 anchos sin desborde.
- [ ] axe sin violaciones críticas ni serias en tus rutas.
- [ ] Errores `ApiError.code` resueltos en UI según `docs/architecture/PARALLEL_WORKPLAN.md`.
- [ ] Reglas nuevas etiquetadas PROPUESTA; ninguna inventada como aprobada.
- [ ] Lista explícita de lo que NO verificaste.
