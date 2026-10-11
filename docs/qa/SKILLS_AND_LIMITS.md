# Capacidades usadas y límites

Verificado en este entorno (2026-10-11).

| Necesidad | Herramienta | Estado |
|---|---|---|
| Auditoría UX / crítica de diseño | skills `design:design-critique`, `design:accessibility-review`, `design:ux-copy` | disponibles |
| Sistema de diseño / UI | `design:design-system`, `frontend-design:frontend-design` | disponibles |
| Arquitectura y calidad de React/TS | `hzblj-skills:*` (component-architecture, hooks, performance, type-safety, atomic-design) | disponibles |
| QA visual de UI renderizada | `anthropic-skills:frontend-visual-qa`, navegador integrado `mcp__Claude_Browser__*` | disponibles |
| Automatización de navegador / E2E | Playwright + `@axe-core/playwright` | instalado |
| Revisión de código / pruebas | `engineering:code-review`, `engineering:testing-strategy` | disponibles |
| **Regresión visual dedicada** | — | **no hay** herramienta (Percy/Chromatic/etc.) → `toHaveScreenshot` de Playwright; frágil entre máquinas/SO |
| Gráficos | `chart.js` | **no instalado** (se añade en el carril de reportes por PR `core:`) |
| Lector de códigos / impresora | hardware | **no verificable** aquí; el lector se emula con entrada rápida + Enter |

Auditoría reproducible: `node frontend/scripts/audit.mjs` (3 anchos, axe, desbordes; salida en `docs/qa/audit/`).
