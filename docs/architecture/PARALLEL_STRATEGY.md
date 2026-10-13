# Estrategia de construcción en paralelo (única y vigente)

Sustituye, para trabajo en paralelo, lo disperso en `BRANCHING.md`, `WORKTREES.md`, `PARALLEL_WORKPLAN.md` y la sección 6
de `UI-CONTRACTS-AND-WORKTREES.md` (se conservan como historia). Sirve igual para Claude Code, Codex y OpenCode.

> **Regla de entrada para cualquier herramienta:** lee `AGENTS.md`, luego `lanes.json` y la hoja de tu carril en
> `docs/lanes/<carril>.md`. No toques nada fuera de tu carril.

## 1. Tres ideas
1. **Un carril = una rama = una carpeta = un puerto = una lista de archivos propios.** Todo está en `lanes.json`.
2. **Los contratos son el único punto de acoplamiento.** Los carriles consumen hooks de `shared/api`; nunca editan
   `contracts/`, `shared/`, `routes/` ni los archivos serializados. Piden el cambio y el integrador lo publica primero.
3. **Integrar es secuencial y con las mismas compuertas para todos.** Un PR a la vez, con la base verde.

## 2. Ramas

| Rama | Para qué | Quién escribe |
|---|---|---|
| `feat/pos-proofs` | **Troncal oficial.** Siempre verde. Los carriles nacen de aquí y vuelven aquí. | Solo el integrador, por fusión de PR |
| `lane/<carril>` | Un carril de trabajo (ver `lanes.json`) | Un agente |
| `codex/*`, `rehearsal/*` | Trabajo de preparación o ensayos; no son carriles | Integrador |
| `main` (GitHub) | Línea histórica Next.js, **sin ancestro común**. No se usa ni se toca. | Nadie por ahora |

`integration` queda como puntero histórico (su worktree tiene capturas regeneradas sin guardar); no se mueve.

## 3. Entorno reproducible

```bash
cd frontend
pnpm lane:new inventory           # worktree + rama lane/inventory + pnpm install + puerto 8108
DEV_PORT=8108 pnpm dev            # tu servidor, sin chocar con otros carriles
pnpm typecheck && pnpm lint && pnpm test && pnpm conformance
pnpm lane:check                   # falla si tocaste algo que no es tuyo
```

**Si mueves carpetas** (repo principal o worktrees), Git y las dependencias se rompen. No uses `git worktree prune`: repara con

```bash
node scripts/lane-repair.mjs <ruta-del-repo-principal> --dry-run   # solo informa
node scripts/lane-repair.mjs <ruta-del-repo-principal>             # git worktree repair de todos los carriles
```

y reinstala con `pnpm install --frozen-lockfile` en los carriles que lo pidan. No borra nada. Ver el límite de su
comprobación de dependencias en el encabezado del script.

**Hook local de propiedad:** `.githooks/pre-commit` ejecuta `lane:check` en ramas `lane/*` y rechaza el commit si tocas lo
ajeno. Se activa una vez por repositorio con `pnpm lane:hooks` (configura `core.hooksPath`; se revierte con
`git config --unset core.hooksPath`). Es una ayuda, no una garantía: `--no-verify` lo salta y por eso el CI repite la comprobación.

- Node ≥ 22 (`.nvmrc`, `engines`). Saltos de línea LF (`.gitattributes`, `.editorconfig`): evita diferencias falsas entre
  herramientas en Windows.
- **No hace falta Docker** para el frontend: corre con mocks (MSW). Docker/Frappe aplica solo a los carriles `be/*`.
- Los mocks viven en la memoria del navegador: recargar la página reinicia los datos. Navega por la SPA en las pruebas.
- Puertos: troncal `8082`; carriles `8101`–`8112` (ver `lanes.json`); Playwright usa `DEV_PORT`.
- Contraseña de prueba `1234` solo para mocks. No apuntes la conformidad a un backend real con ella.

## 4. Quién edita qué

- **Carril:** solo lo que `lanes.json` pone en su `owns` (incluye sus pruebas y e2e).
- **Integrador:** todo lo serializado (`contracts/`, `shared/`, `app/`, `routes/`, seed, handlers comunes, config).
- **QA:** `frontend/e2e/**` comunes, conformidad y `docs/qa/**`.
- **Pedido de cambio compartido:** `docs/qa/requests/lane-<carril>.md` (qué necesitas, para qué, qué rompe sin él).

Cumplimiento: **`pnpm lane:check`** y CI. GitHub no ofrece protección de ramas ni revisores obligatorios en este
repositorio (privado, plan gratuito), así que la regla se hace cumplir por script, no por plataforma.

## 5. Flujo de un cambio

1. `pnpm lane:new <carril>` (o continúa en tu worktree) y trabaja solo dentro de tu `owns`.
2. Si necesitas contrato o archivo serializado: pídelo en `docs/qa/requests/lane-<carril>.md` y espera su publicación.
3. Commits pequeños y en español. `git add` con rutas explícitas. Nunca `git add -A`, `reset --hard` ni push forzado.
4. Antes del PR: `pnpm typecheck && pnpm lint && pnpm test && pnpm lane:check` (y e2e de tu pantalla si la cambiaste).
5. PR del carril → `feat/pos-proofs`. El integrador fusiona **uno a la vez**, vuelve a correr las compuertas y recién
   entonces toma el siguiente. Si dos PR cambian un contrato, el segundo se adapta antes.
6. Antes de una versión candidata: `pnpm core:check` (typecheck, build, lint, Vitest, tipos, Playwright, Storybook,
   conformidad).

## 6. Contratos en dos niveles (para no multiplicar documentos)

- **Por dominio:** plantilla, navegación, regiones, componentes, permisos y responsive (`docs/contracts-v1/02-ui/UI-<DOM>-SIX-CONTRACTS.md`).
- **Por flujo:** entradas, eventos, estados, excepciones, operaciones y pruebas (`docs/contracts-v1/01-functional`, `03-data`).
- Estado de una operación: `x-approval: approved | proposed` y `x-status: simulated | real`. **No se construye
  producción sobre `proposed`.**

## 7. Qué carril puede arrancar hoy (según el contrato real)

Medido sobre `contracts/openapi.yaml` v0.8.0:

| Carril | Operaciones aprobadas (`approved`) | Pendiente de contrato (`proposed`) | ¿Arranca? |
|---|---|---|---|
| `inventory` | existencias, movimientos, traslados (crear, recibir), alertas, ajustes y conteos simples (D-066) | conteo por zonas (D-042) y ajustes con aprobación (D-038): sin modelar | **Sí.** Zonas y aprobación esperan contrato. |
| `customers` | listar clientes, listar cartera | crear/editar cliente, abonos | **Parcial**: lectura sí; escritura espera contrato. |
| `reports` | ventas, antigüedad de cartera, valorización de inventario (D-066) | cierres X/Z y permisos por reporte: sin modelar | **Sí**, en los tres reportes aprobados. |
| `pos-proofs` | (cubierto por D-005, aprobado) | — | Sí: falta la app del responsable. |
| `catalog`, `purchases`, `administration` | por revisar al asignarlos | — | Revisar su hoja antes de asignar. |

## 8. Lo que esta estrategia NO resuelve (declarado)

- Backend real (Frappe/ERPNext), DIAN, banco, hardware: todo corre sobre mocks.
- Protección de ramas y revisores obligatorios: no disponibles en el plan actual; la sustituye `lane:check` + CI.
- CI de GitHub: escrito en `.github/workflows/ci.yml`, **sin primera corrida confirmada**.
- Historia Git de GitHub `main` (Next.js) sin ancestro común: se decide aparte.
