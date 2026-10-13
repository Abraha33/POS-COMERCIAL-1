# Prompt de arranque para un agente de carril

Sirve igual para Codex, OpenCode o Claude Code: nada de lo que pide depende de la herramienta. Está escrito para el carril
`reports`; para otro carril cambia `reports` por su nombre y `8111` por su puerto (`lanes.json`).

Pégalo tal cual en la herramienta, abierta en `D:\POS-COMERCIAL-WORKTREES\pos-proofs`.

---

```text
Eres el agente del carril `reports` del ERP/POS Holamigo. Trabajas en paralelo con otros agentes; no eres el integrador.

ANTES DE ESCRIBIR CÓDIGO
1. Lee, en este orden: AGENTS.md, docs/architecture/PARALLEL_STRATEGY.md, docs/lanes/reports.md, docs/lanes/TEMPLATE.md
   y la entrada `reports` de lanes.json.
2. Crea tu carril (no trabajes en la carpeta pos-proofs):
     cd frontend
     pnpm lane:new reports
   Eso crea la carpeta D:\POS-COMERCIAL-WORKTREES\lane-reports en la rama lane/reports e instala dependencias.
   Si la carpeta ya existe, úsala. A partir de aquí trabaja SOLO dentro de lane-reports.
3. Comprueba dónde estás: `git branch --show-current` debe decir lane/reports.
4. Corre `pnpm typecheck && pnpm lint && pnpm test` en lane-reports/frontend antes de cambiar nada y anota el resultado.

QUÉ PUEDES TOCAR
- frontend/src/features/reports/**
- frontend/src/tests/reports-*.test.*
- docs/qa/requests/lane-reports.md  y  docs/lanes/reports.md
Nada más. No edites contracts/, frontend/src/shared/, frontend/src/routes/, frontend/src/mocks/, lanes.json, package.json
ni carpetas de otros carriles. `pnpm lane:check` falla si lo haces.

TAREA
A. Revisa la pantalla de reportes existente (features/reports) contra el contrato aprobado (D-066): GET /reports/sales-summary,
   GET /reports/aging y GET /reports/inventory-valuation, con las reglas BR-REP-01..03 de
   docs/business-rules/08-v0.5-ajustes-conteos-cartera-reportes.md. Lista qué cumple y qué no.
B. Corrige lo que falte dentro de tu carril: filtros por fecha y sede, estados de carga / vacío / error útiles, permiso
   `reports.view`, teclado completo, objetivos táctiles de 44 px, y que se lea bien a 1280, 768 y 375 px.
   Datos solo por los hooks de shared/api; nunca fetch propio. Dinero en COP entero. Colores solo con tokens del tema.
C. Añade o ajusta pruebas en frontend/src/tests/reports-*.test.* que cubran lo que cambiaste.
D. Ensayo de cambio compartido (obligatorio): el contrato no tiene filtro por caja en ventas ni costo promedio por sede en
   valorización. NO lo implementes ni toques el contrato. Escribe la solicitud en docs/qa/requests/lane-reports.md con:
   qué operación, qué campo o parámetro, por qué lo necesita la pantalla y qué haces mientras tanto. El integrador la atiende.

REGLAS
- No inventes reglas de negocio. Lo que no esté aprobado se marca PROPUESTA y no se construye como definitivo.
- Todo corre sobre datos simulados (MSW). No declares real nada que sea mock.
- No borres archivos, ramas ni carpetas. No hagas push, merge ni rebase sobre feat/pos-proofs. No toques main.
- Commits pequeños en lane/reports, con mensaje `feat(reports): ...` o `test(reports): ...`.
- Si un comando falla por el entorno (puerto, instalación, saltos de línea), detente y repórtalo: es justo lo que se está probando.

ANTES DE ENTREGAR (en lane-reports/frontend)
     pnpm typecheck && pnpm lint && pnpm test && pnpm conformance && pnpm lane:check
Para ver la pantalla: `DEV_PORT=8111 pnpm dev` (en PowerShell: `$env:DEV_PORT=8111; pnpm dev`). No uses el 8082.

INFORME FINAL (texto, en el chat)
1. Commits creados (hash y mensaje) y archivos tocados.
2. Salida resumida de cada compuerta, incluida lane:check.
3. Qué cumple y qué no de BR-REP-01..03.
4. La solicitud que dejaste al integrador.
5. Qué NO verificaste (backend real, datos reales, rendimiento, navegadores que no probaste).
6. Cualquier tropiezo de entorno o de Git, aunque lo hayas resuelto: comando, error y qué hiciste.
```

---

## Qué hace el integrador después

1. `git log feat/pos-proofs..lane/reports` y `pnpm lane:check --lane reports` desde el carril.
2. Atiende `docs/qa/requests/lane-reports.md` con un PR `contract:` propio.
3. Fusiona el carril en la rama troncal, corre `pnpm core:check` y recién entonces publica.
