# Preparación para construir en paralelo — estado y evidencia (2026-10-12)

**Qué mide este documento:** qué tan listo está el proyecto para que varios agentes (Claude, Codex, OpenCode) construyan
pantallas a la vez sin pisarse. **No** mide cuánto del ERP está construido.

La cifra sale de una regla fija (abajo). No es una métrica certificada: es una rúbrica con evidencia verificable por criterio.

## Resultado: 85 de 100

| # | Criterio | Peso | Puntos | Evidencia | Qué le falta |
|---|---|---:|---:|---|---|
| A | Base de código única y verificada | 20 | 18 | Troncal `feat/pos-proofs` contiene todo el trabajo. `core:check` 8/8 sobre el commit final `056d0f5` (typecheck, build, lint, Vitest, tipos, Playwright, Storybook, conformidad). Tags de respaldo antes de cada avance. | `frontend/src/method` sigue sin rastrear (árbol no limpio). `integration` quedó atrás con capturas sin guardar. |
| B | Entorno reproducible y sin choques | 15 | 13 | `pnpm lane:new` creó 5 carriles (≈90 s cada uno), uno de ellos desde Codex (`reports`). `pnpm lane:repair` repara los enlaces de todos los worktrees tras mover carpetas y avisa de los que no tienen dependencias. LF, editor y Node fijados. Tres servidores a la vez (8082, 8108, 8110), cada uno sirviendo su carpeta. Codex pasó typecheck, lint, Vitest, conformidad y `lane:check` en su carril, en dos vueltas. | Con el sandbox de Codex: debe abrirse **dentro** de la carpeta del carril (si no, `EPERM`); no puede hacer commit porque los metadatos Git viven fuera del carril; `pnpm` necesitó un Node alterno y a veces un acceso elevado. **Mover carpetas rompe el entorno:** el 2026-10-13 unir `POS-COMERCIAL` y `POS-COMERCIAL-WORKTREES` dejó 29 worktrees sin enlace y `node_modules` incompletos; se recuperó a mano con `git worktree repair` y reinstalando; de ahí salió `lane:repair`, cuyo control de dependencias es superficial (solo `.bin`) y no detecta paquetes con archivos faltantes: hubo que apartar `node_modules` y reinstalar en cada carril movido. No probado desde OpenCode. Al detener un servidor en Windows el proceso de Vite queda vivo. |
| C | Propiedad y fronteras | 20 | 16 | `lanes.json` con 12 carriles; `pnpm lane:check` con 10 pruebas; rechaza archivos ajenos y serializados y dice a quién pedirlos. 12 hojas de carril. Hook `pre-commit` (`.githooks/`) que ejecuta `lane:check` en ramas `lane/*`; probado a mano: pasa en un carril limpio (exit 0) y rechaza un archivo de `contracts/` (exit 1). | El hook **no está activado**: se activa con `pnpm lane:hooks` y se puede saltar con `--no-verify`. GitHub no ofrece protección de ramas en este repo (privado, plan gratuito): un agente puede saltarse el script. |
| D | Contratos listos para los primeros carriles | 15 | 13 | `inventory` (incluidos ajustes y conteos simples), `reports` (3 reportes), `catalog`, `pos-pay` y lectura de `customers` tienen operaciones `approved`. D-005 implementado. D-066 aprobó conteos, ajustes y reportes; 481 pruebas y conformidad en verde después del cambio. | Escritura de clientes, compras y administración siguen `proposed`. Zonas (D-042), ajustes con aprobación (D-038) y cierres X/Z no están modelados. Los paquetes UI por dominio son v0.1. |
| E | Compuertas automáticas (CI) | 10 | 7 | Primera corrida real en GitHub: run `38332997539` sobre `19904aa` (`codex/parallel-readiness`), 4 min 17 s, en verde: instalación, typecheck, lint, Vitest, conformidad y pruebas de carriles. | El paso "Propiedad de archivos del carril" **no se ha ejecutado**: al publicar 5 ramas a la vez GitHub solo lanzó una corrida y las ramas `lane/*` no tuvieron la suya. Sin protección de ramas. Las acciones avisan de Node 20 obsoleto. |
| F | Ensayo de integración | 15 | 14 | `lane/reports` integrado en la troncal (`a03d028`, fusión sin conflictos): typecheck, lint, conformidad y pruebas de carriles en verde; Vitest 479/481 en la suite completa y las 2 restantes (POS, tiempo de espera) pasan solas, 18/18. 3 carriles (`inventory`, `customers`, `catalog`), 3 fusiones secuenciales en `rehearsal/integration-1`, compuertas en verde tras cada una (483 → 485 → 486 pruebas). Segundo ensayo con otra herramienta, ciclo completo: Codex migró `reports` (`26af717`), el integrador revisó y devolvió cinco observaciones (ids sin traducir, gráficos retirados, pruebas sin cifras, formato), Codex las corrigió (`b10ac94`) y el integrador repitió las compuertas y miró la pantalla a 375 px. Respetó la propiedad y pidió el cambio de contrato por `docs/qa/requests/lane-reports.md`. | La integración de `reports` no ha pasado por CI ni por `core:check` completo (Playwright, Storybook). La solicitud de contrato (filtro por caja, costo promedio por sede) no se ha atendido. No se revisó a 768 px ni con axe. Aún no hubo un conflicto real en un archivo compartido: queda preparado en `docs/lanes/PROMPTS-HITO.md` (dos carriles piden rutas distintas sobre `rootRoute.addChildren([...])`). Sin PR en GitHub. |
| G | GitHub alineado | 5 | 4 | Publicadas `feat/pos-proofs` y `codex/parallel-readiness` en `19904aa`, y `lane/inventory`, `lane/customers`, `lane/catalog`. | `main` remoto es otra historia (Next.js) sin ancestro común. |
| | **Total** | **100** | **85** | | |

## Lectura

- **Se puede empezar ya, con 2 o 3 agentes y un integrador,** en carriles con contrato aprobado: `inventory`, `reports`,
  `catalog`, `pos-proofs` (app del responsable) y lectura de `customers`. Prompt de arranque: `docs/lanes/PROMPT.md`.
- **Publicar las ramas de carril de una en una** (máximo tres por push): con más, GitHub no lanza el CI de cada rama.

## Camino a 95

Hoy: **85**. El 95 solo se alcanza con decisiones del dueño y con las dos corridas de agentes; el integrador no lo logra solo.

| # | Acción | Criterio | Sube | Acumulado | Quién |
|---|---|---|---:|---:|---|
| 1 | Activar el hook: `pnpm lane:hooks` y usarlo durante el hito | C | +1 | 86 | Dueño ordena; integrador |
| 2 | Publicar `lane/*` y ver en verde el paso de propiedad en CI | E | +1 | 87 | Dueño ejecuta el push |
| 3 | Aprobar contratos: escritura de clientes, compras, administración (las operaciones `proposed` de cada hoja) | D | +2 | 89 | **Dueño** |
| 4 | Conflicto real en `routes/index.tsx`, resuelto con compuertas en verde | F | +1 | 90 | Integrador + dos agentes (`PROMPTS-HITO.md`) |
| 5 | OpenCode entrega el carril `pos-proofs` sin salirse de su propiedad | B | +2 | 92 | OpenCode (`PROMPTS-HITO.md`) |
| 6 | Decidir `frontend/src/method` y poner al día `integration` | A | +2 | 94 | **Dueño** |
| 7 | Decidir qué se hace con la historia de `main` en GitHub | G | +1 | 95 | **Dueño** |

Paso 7 deja el total en 95. Sin los pasos 3, 6 y 7 (decisiones del dueño) el techo es 90.

**Palanca de pago, opcional:** protección de ramas y revisores obligatorios en un repositorio privado exigen un plan de
pago de GitHub. Con ella, C y E suben hasta +4 más (hasta 20 y 10), pero no es necesaria para llegar a 95.

## Evidencia del ensayo

```
PR lane/inventory -> rehearsal/integration-1   propiedad ✅   typecheck 0  lint 0  vitest 483/483  conformidad 0
PR lane/customers -> rehearsal/integration-1   propiedad ✅   typecheck 0  lint 0  vitest 485/485  conformidad 0
PR lane/catalog   -> rehearsal/integration-1   propiedad ✅   typecheck 0  lint 0  vitest 486/486  conformidad 0
```

Los tres cambios son pruebas de contrato sobre operaciones aprobadas. Quedan en `rehearsal/integration-1`; **no** se llevaron
a la troncal. Se pueden promover si el dueño lo decide.

Rechazo verificado (sin tocar archivos):

```
pnpm lane:check --lane inventory --files frontend/src/features/customers/b.ts,contracts/openapi.yaml
❌ 2 archivo(s) fuera de su propiedad: es del carril "customers" · archivo serializado: solo lo edita el integrador
```

## Lo que NO está verificado

- Ninguna herramienta distinta de Claude Code ha ejecutado estos comandos.
- El flujo de CI no ha corrido en GitHub.
- No se ensayó un conflicto real (dos carriles que necesitan el mismo archivo compartido).
- Todo corre sobre mocks: sin backend real, DIAN, banco, cámara ni impresora.
