# ERP/POS Comercial

```
frontend/   React + TypeScript + Vite + PrimeReact (app, mocks MSW, tests, Storybook)
contracts/  openapi.yaml + examples/  — contrato compartido frontend/backend
docs/       architecture/ (propiedad de módulos, ramas, mapa de pantallas)  ·  business-rules/
tests/      integration/ (pruebas entre frontend y backend; vacío por ahora)
```

`backend/` (Frappe/ERPNext): solo alcance y requisitos, sin código ni instancia.

Estado del contrato: **v0.3.0, reglas de negocio aprobadas por el dueño** (aclaraciones menores en `docs/business-rules/99-preguntas-abiertas.md`); sin backend que lo implemente todavía.

## Comandos (desde `frontend/`)
```bash
pnpm install
pnpm dev          # http://localhost:5188
pnpm gen:api      # regenera tipos desde contracts/openapi.yaml
pnpm core:check   # 8 gates; imprime READY FOR PARALLEL SCREEN CONSTRUCTION si todo pasa
```

Reglas de trabajo en paralelo: `docs/architecture/BRANCHING.md` y `docs/architecture/MODULE_OWNERSHIP.md`.
