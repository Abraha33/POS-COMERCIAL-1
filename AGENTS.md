# AGENTS.md — ERP/POS Holamigo (proyecto oficial)

Contrato de trabajo para **cualquier** herramienta o persona (Claude Code, ChatGPT/Codex, OpenCode, humano).
Si tu herramienta lee otro archivo (`CLAUDE.md`, etc.), ese archivo remite aquí.

> **Para retomar el trabajo, lee primero `docs/architecture/TRASPASO.md`** (estado, decisiones, pendientes y problemas conocidos).

> **Si trabajas en paralelo con otros agentes** (cualquier herramienta): lee `docs/architecture/PARALLEL_STRATEGY.md`, tu
> carril en `lanes.json` y tu hoja en `docs/lanes/<carril>.md`. Solo editas lo que tu carril posee; `pnpm lane:check` lo verifica.

## 1. Cuál es el proyecto oficial

| Qué | Valor |
|---|---|
| Carpeta | `D:\POS-COMERCIAL-WORKTREES\pos-proofs` |
| Rama | `feat/pos-proofs` |
| Puerto de desarrollo | **8082** (`http://localhost:8082`, LAN `http://<IP-LAN>:8082`) |
| Declarado oficial | 2026-10-12, por el dueño del producto |

**Trabaja solo aquí.** Cualquier otra carpeta o rama es respaldo/referencia (lista en
`docs/architecture/ENTORNO_OFICIAL.md`). Si abres `D:\POS-COEMRCIAL-1`, no es el oficial: allí hay un archivo
`LEER_PRIMERO.md` que te redirige.

Antes de tocar nada, comprueba:
```bash
git rev-parse --show-toplevel && git branch --show-current   # debe ser pos-proofs / feat/pos-proofs
```

## 2. Qué es
ERP/POS SaaS para comercios (distribuidores, ferreterías, alta rotación). Frontend React separado; **Frappe/ERPNext es solo
backend** y se consume por `/api/v1` (`contracts/openapi.yaml`). Hoy responde MSW (datos simulados).
Stack fijo (no cambiar sin PR `core:`): React 19 · TypeScript 5.9 · Vite · PrimeReact 10.9.9 `lara-light-blue` ·
TanStack Router/Query · RHF + Zod · MSW · Vitest · Playwright + axe · Storybook.

## 3. Comandos (desde `frontend/`)
```bash
pnpm install --frozen-lockfile
pnpm dev                 # puerto 8082 por defecto (DEV_PORT lo cambia)
pnpm typecheck && pnpm lint && pnpm test
pnpm conformance         # contrato OpenAPI vs mocks
pnpm build
pnpm e2e                 # Playwright; usa su propio puerto (8090) y levanta su servidor
```

## 4. Reglas de Git (obligatorias)
1. **No fusionar a `main` ni hacer push** sin orden explícita del dueño ("Fusiona" / "Haz push").
2. Nunca `git reset --hard`, `git clean -fd`, `git checkout -- .` ni merges forzados sobre trabajo sin commitear.
3. `git add` con rutas explícitas; no `git add -A` a ciegas (hay artefactos de auditoría regenerables en `docs/qa/audit`).
4. Un cambio = un commit con mensaje claro en español. No commitees credenciales ni `.env`.
5. Antes de operaciones grandes (merge, rebase, mover carpetas), crea un tag de respaldo:
   `git tag respaldo/<motivo>-<fecha>`.
6. No trabajes con HEAD desacoplado: si `git branch --show-current` está vacío, `git switch <rama>` primero.
7. Los worktrees de `D:\POS-COMERCIAL-WORKTREES\` son carpetas de **otras ramas**; no copies archivos entre ellas a mano.

## 5. Reglas de producto
- **No inventar reglas de negocio.** Las aprobadas están en `docs/business-rules/`; lo demás se etiqueta `PROPUESTA`/`SUP`.
- Dinero: entero COP. Totales y ajuste al peso: `shared/utils/pricing.ts`; el servidor es la autoridad.
- Contract-first: `contracts/openapi.yaml` + Zod en `frontend/src/shared/contracts` + handlers MSW + escenarios de conformidad.
  Un endpoint simulado lleva `x-status: simulated`; nada de endpoints falsos presentados como reales.
- Las features no se importan entre sí (ESLint); datos por `shared/api`, nunca `fetch` propio.
- Colores solo con variables del tema/tokens. Sin PIN ni credenciales en texto plano en código de producto.
- Credenciales de **prueba** (solo mocks): `frontend/src/mocks/test-users.ts`. Nunca reales.

## 6. UX / accesibilidad / terminado
Objetivos táctiles ≥ 44 px, teclado completo, contraste AA, responsive 1366 / 768 / 375, estados vacío/carga/error.
Una pantalla está terminada cuando: código real, ejecutada en navegador, capturas a 3 anchos, `typecheck`+`lint`+`test`,
axe sin críticas, permisos aplicados y test Vitest/Playwright. Más detalle en `CLAUDE.md`.

## 7. Honestidad en los informes
Todo lo verificado hasta hoy corre sobre mocks. Declara siempre qué NO se verificó: backend real, DIAN, banco real,
cámara/impresora/lector en hardware, concurrencia real, rendimiento con datos reales.

## 8. Docker / backend
La rama oficial **no incluye** instancia de backend ni Docker (solo `backend/README.md`). El trabajo previo de un backend
Frappe local (`backend/pos_comercial`, `backend/runtime/frappe-v15.local.yaml`) vive solo en el commit
`7acde90` (rama `capa-2-responsive`). No levantes contenedores ni lo copies sin decisión del dueño.
