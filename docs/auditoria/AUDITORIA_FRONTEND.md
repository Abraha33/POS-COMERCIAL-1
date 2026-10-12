# Auditoría del frontend ERP/POS

Alcance: solo lectura sobre `D:\POS-COEMRCIAL-1` y sus worktrees, 2026-10-11. Cada conclusión se marca
**[C]** confirmada (hay dato medible), **[P]** probable (consistente con la evidencia, sin prueba directa) o
**[N]** no verificada.

## Las cinco principales causas del bajo rendimiento

| # | Causa | Evidencia | Corrección concreta |
|---|-------|-----------|---------------------|
| 1 | **El orquestador trabaja con un contexto enorme que se vuelve a leer en cada turno** [C] | Sesión principal: 736 turnos, **219,6 M tokens de lectura de caché** frente a **1,95 M de salida** (≈ 113 a 1). Contexto medio por turno ≈ **298 k**, máximo observado **591 k**. Una sola compactación en toda la sesión. | Sesiones cortas por fase (contrato, núcleo, módulos, integración) que arrancan de archivos (`CLAUDE.md`, `docs/`) y no de historial. Compactar o abrir sesión nueva al cerrar cada fase. El coordinador no debe copiar informes largos al contexto: pedir resúmenes de ≤ 15 líneas y dejar el detalle en un archivo. |
| 2 | **El diseño visual llegó después de construir las pantallas, y obligó a rehacerlas** [C] | Los seis carriles se fusionaron entre 13:38 y 14:10 sin maquetas. Las 5 imágenes de diseño llegaron después (commit `c780612`, 14:22) y desencadenaron un segundo ciclo por módulo (5 agentes `ui-*`: ≈ 49,6 M de tokens de lectura de caché según los registros, sin fusionar). El gate 6 de `core:check` tuvo que relajarse porque Productos dejó de usar `DataTablePage`. | Congelar la guía visual (maquetas + tokens + 8 componentes compartidos) **antes** de lanzar carriles. Fábrica de pantallas por plantilla con `DataTablePage`/`FormDialog`/`KpiCard` como único camino. |
| 3 | **Verificación repetida y flaky por saturación de CPU y puertos** [C] | En la sesión principal: `typecheck` 46 veces, `lint` 23, `vitest` 27 + `pnpm test` 11, `core:check` 22, Playwright 14. 6 de 268 tests fallan hoy en `integration` por timeout bajo carga (pasan solos). El puerto 5188 estuvo ocupado en al menos 4 ocasiones. | Un solo comando de verificación por carril y un solo `core:check` al integrar. Fijar `maxWorkers` y puertos por worktree. Reintentos de test solo una vez y con aislamiento. |
| 4 | **Demasiados agentes simultáneos sobre el mismo repositorio y el mismo equipo** [C] | 15 subagentes en 14 horas de reloj; 5 a 7 a la vez provocaron el límite de uso (7 agentes caídos con HTTP 429) y luego fueron detenidos. **1 082 turnos y 165 M tokens de lectura de caché** solo en subagentes (≈ 153 k por turno). Cada subagente reinstala dependencias, relee `CLAUDE.md` y los mismos documentos. | Máximo **3 agentes** concurrentes, cada uno con brief corto en archivo y un resultado ≤ 15 líneas. Instalar dependencias una vez y compartir el store. |
| 5 | **Otra sesión edita el mismo árbol de `main`** [C] | `git status` en `main` muestra cambios ajenos sin commitear en `AppShell`, `routes`, `main.tsx`, `SessionProvider`, `openapi.yaml` (`x-status: implemented`), `features/auth`, `features/tracking`, `AGENTS.md`, `dashboard/`. Esto impidió fusionar en `main` y obligó a usar `integration`. | Un dueño por rama: el trabajo de backend/tracking va a su propio worktree. `main` solo se actualiza por fast-forward desde `integration`. |

Causas secundarias [P]: 191 llamadas a `Bash` y 192 a `Write` con solo 3 `Read` y 0 llamadas a `Skill`
(el trabajo se hizo escribiendo y ejecutando, sin apoyarse en skills de frontend); los informes de
subagentes llegan largos y se vuelven a pegar en el contexto del coordinador.

## 1. El proyecto real

- Directorio activo: `D:\POS-COEMRCIAL-1`. Rama actual `main` (35 commits), sin remoto configurado
  (`git remote -v` vacío): **no hay sincronización con GitHub que asumir**. 366 archivos versionados.
- Frontend activo: `frontend/` (React 19, TS 5.9, Vite 8, **PrimeReact 10.9.9**, TanStack Router/Query, RHF + Zod,
  MSW, Vitest, Playwright + axe, Storybook 10, chart.js). ≈ 12 500 líneas en `frontend/src`.
- **No hay Next.js, Radix ni shadcn/ui** en `package.json` ni en el código fuente versionado (búsqueda sin
  coincidencias). No hay arquitectura duplicada de UI.
- Carpetas ajenas al frontend en la raíz: `dashboard/` (panel HTML/Node de otra sesión), `AGENTS.md`,
  `tests/`, `backend/` (README + trabajo sin versionar de otra sesión). [C] Son la fuente del conflicto de la causa 5.
- Documentación: 68 KB en `docs/` + `CLAUDE.md` (3 KB) + `AGENTS.md` (0,8 KB). Los agentes releen
  `CLAUDE.md`, `UI_STACK.md`, `docs/business-rules/*` y `docs/qa/requests/*` al arrancar. [P] Es razonable
  pero conviene un índice de una página.

## 5. Inventario de pantallas

Estado verificado con tests Vitest, E2E de F (76 de 85 pruebas pasan; 9 `test.fail` conocidas) y axe (0 críticas).
"Rediseño" = alineación a las maquetas; ninguno está fusionado en `main`.

| Pantalla | Existe | Funciona (mocks) | Compartidos | Tests | Rediseño | Falta |
|---|---|---|---|---|---|---|
| Venta rápida POS (1 499 líneas en `features/pos`) | sí | sí | parcial | pos-quick-sale, pos-cash-held | en worktree `ui-pos`, sin verificar | desborde a 375 px con carrito (F-02), errores accionables (F-03/F-04) |
| Caja y suspendidas | sí | sí | parcial | pos-cash-held | idem | arqueo por denominación: sin contrato |
| Historial, devolución, anulación | sí | sí | parcial | pos-history | idem | `returnedQuantity` (ya en contrato v0.5.0, sin consumir) |
| Productos | sí | sí | DataTable propio | products-screens | `ui-inv` sin fusionar | — |
| Inventario (4 pestañas) | sí | sí | parcial | inventory-screens | `ui-inv` sin fusionar | ajustes y conteos: contrato listo, UI no |
| Compras y proveedores | sí | sí | propio (`purch__`) | purchases-orders | `ui-pur` sin fusionar | cancelar orden, efecto de recepción |
| Clientes | sí | sí | parcial | ledger-customers | `ui-led` incompleto | desborde a 375 px (F-06), catálogo `taxResponsibility` |
| Cuentas por cobrar / por pagar | sí | sí | propio (`ledger__`) | ledger-receivables/payables | `ui-led` incompleto | desborde de `/payables` (F-01), diálogo duplicado (F-16) |
| Reportes | sí | sí | propio | reports-page, reports-aggregate | `ui-adm` sin fusionar | sección Caja, endpoints agregados sin consumir |
| Administración (4 pestañas) | sí | sí | propio | admin-administration | `ui-adm` sin fusionar | contraste de pestañas (F-05) |
| Inicio | sí (en `design/core`) | sí | sí | shell-login-home | fusionado en `integration` | KPIs PROPUESTA |
| Login con PIN | sí (en `design/core`) | solo usuario/contraseña | sí | shell-login-home | fusionado en `integration` | contrato de PIN inexistente |

Resumen: **11 rutas funcionales contra mocks**, todas con prueba. **0 de 5 rediseños por módulo están
fusionados y verificados.** Duplicación confirmada: `PaymentDialog` y `ledger.ts` entre cuentas por cobrar y
por pagar, y estilos propios por carril (`.purch__`, `.ledger__`, `.reports__`).

## 2. ¿Fábrica de pantallas?

Sí conviene, y ya existe la base: `ScreenTemplate`, `DataTablePage` (ahora con `summary`, `filters`,
`initialSort`), `FormDialog`, `KpiCard`, `StatusTag`, `ShortcutBar`, `SegmentedTabs`. Lo que falta es
**declarativo**: una definición por pantalla (columnas, filtros, acciones, permiso, estados) que genere la
lista y el formulario, de modo que solo las pantallas especiales (POS, caja) se escriban a mano. Ver `PLAN_OPTIMIZACION.md`.

## No verificado

Backend real, DIAN, concurrencia, offline real, rendimiento con volumen, hardware, lectores de pantalla,
la antigüedad y el tamaño real de `dashboard/` y `backend/` de la otra sesión, y el estado de GitHub (no hay remoto).
