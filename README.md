# ERP/POS Comercial

```
frontend/   React + TypeScript + Vite + PrimeReact (app, mocks MSW, tests, Storybook)
contracts/  openapi.yaml + examples/  — contrato compartido frontend/backend
docs/       architecture/ (propiedad de módulos, ramas, mapa de pantallas)  ·  business-rules/
tests/      integration/ (pruebas entre frontend y backend; vacío por ahora)
```

`backend/` (Frappe/ERPNext) aún no existe.

## Comandos (desde `frontend/`)
```bash
pnpm install
pnpm dev          # http://localhost:5188
pnpm core:check   # 8 gates; imprime READY FOR PARALLEL SCREEN CONSTRUCTION si todo pasa
```

Reglas de trabajo en paralelo: `docs/architecture/BRANCHING.md` y `docs/architecture/MODULE_OWNERSHIP.md`.
