# CLAUDE.md — ERP/POS Comercial

> **Proyecto oficial:** esta carpeta (`pos-proofs`, rama `feat/pos-proofs`, puerto 8082). El contrato común para
> cualquier herramienta está en `AGENTS.md`; este archivo lo complementa con detalle de UX y definición de terminado.

## Qué es
ERP/POS SaaS para comercios (distribuidores, ferreterías, alta rotación). Frontend React separado; **Frappe/ERPNext es solo backend**
y se consume por `/api/v1` (`contracts/openapi.yaml`). Hoy responde MSW.

## Estructura
`frontend/` app · `contracts/` OpenAPI + ejemplos + fixtures · `docs/` (architecture, business-rules, qa) · `backend/` (README).
Worktrees por carril en `D:\POS-COMERCIAL-WORKTREES\` (ver `docs/architecture/WORKTREES.md`).

## Stack decidido (no cambiar sin PR `core:`)
React 19 + TS 5.9 + Vite · **PrimeReact 10.9.9, tema `lara-light-blue`** · TanStack Router/Query · RHF + Zod · MSW · Storybook ·
Vitest + Playwright (+axe). TanStack Table no se usa: el `DataTable` de PrimeReact cubre el caso.

## Comandos (desde `frontend/`)
`pnpm dev` (`DEV_PORT`) · `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm conformance` · `pnpm gen:api` · `pnpm core:check` ·
`node scripts/audit.mjs` (auditoría a 3 anchos).

## Reglas de trabajo
1. **No inventar reglas de negocio.** Las aprobadas están en `docs/business-rules/`; lo demás se etiqueta `PROPUESTA` o `SUP`.
2. Un agente = un módulo = una rama/worktree. No tocar `frontend/src/{shared,app,routes}`, `contracts/` ni `mocks/seed.ts`
   salvo vía PR `core:`/`contract:` al integrador.
3. Las features no se importan entre sí (ESLint). Datos por hooks de `shared/api`; nunca `fetch` propio.
4. Dinero: entero COP. Totales y ajuste al peso: `shared/utils/pricing.ts`; el servidor es la autoridad.
5. Colores solo con variables del tema/tokens; sin hex sueltos.

## UX / accesibilidad (obligatorio)
Tarea clara, baja carga cognitiva, consistencia, estados vacío/error útiles, feedback inmediato, teclado completo, objetivos
táctiles ≥ 44 px, contraste AA, sin animaciones decorativas, responsive real (1280 / 768 / 375).
POS: velocidad por teclado y lector (el lector escribe y envía Enter).

## Definición de terminado (por pantalla)
Implementada en código real · ejecutada en el navegador · capturas a 3 anchos revisadas · `pnpm test && lint && typecheck`
· axe sin críticas · estados carga/vacío/error · permisos aplicados (`RouteGuard`, `Can`) · test Vitest o Playwright.

## Honestidad en los informes
Decir qué NO se verificó (backend real, DIAN, concurrencia, offline real, rendimiento con datos reales, hardware).

## Referencias de diseño
`docs/design/reference/ref-1..5.webp` son las maquetas objetivo (POS de escritorio, 16 pantallas del ERP, POS móvil de 16 pantallas).
Patrones: barra superior azul marino con sucursal / caja / cajero / estado en línea; menú lateral; POS en dos columnas
(búsqueda + líneas | cliente + resumen + cobrar verde); chips de categoría; barra de atajos F2/F3/F4/F8/F9; acceso por PIN;
apertura de caja con resumen; arqueo por denominación; sincronización offline. Lo que no esté en `docs/business-rules/`
se etiqueta PROPUESTA. Las maquetas guían la forma, no sustituyen las reglas aprobadas ni los tokens AA.
