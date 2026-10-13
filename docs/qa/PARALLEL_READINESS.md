# Preparación para construir en paralelo — estado y evidencia (2026-10-12)

**Qué mide este documento:** qué tan listo está el proyecto para que varios agentes (Claude, Codex, OpenCode) construyan
pantallas a la vez sin pisarse. **No** mide cuánto del ERP está construido.

La cifra sale de una regla fija (abajo). No es una métrica certificada: es una rúbrica con evidencia verificable por criterio.

## Resultado: 67 de 100

| # | Criterio | Peso | Puntos | Evidencia | Qué le falta |
|---|---|---:|---:|---|---|
| A | Base de código única y verificada | 20 | 17 | Troncal `feat/pos-proofs` contiene todo el trabajo. `core:check` 8/8. Typecheck, lint, Vitest 481/481 y conformidad 44/44 en el commit de herramientas. Tags de respaldo antes de cada avance. | `frontend/src/method` sigue sin rastrear (árbol no limpio). `integration` quedó atrás con capturas sin guardar. |
| B | Entorno reproducible y sin choques | 15 | 12 | `pnpm lane:new` creó 3 carriles (≈90 s cada uno). LF, editor y Node fijados. Tres servidores a la vez (8082, 8108, 8110), cada uno sirviendo su carpeta. | No probado desde Codex ni OpenCode. Al detener un servidor en Windows el proceso de Vite queda vivo. 30 worktrees locales. |
| C | Propiedad y fronteras | 20 | 15 | `lanes.json` con 12 carriles; `pnpm lane:check` con 10 pruebas; rechaza archivos ajenos y serializados y dice a quién pedirlos. 12 hojas de carril. | La plataforma no lo obliga (GitHub no ofrece protección de ramas en este repo): un agente puede saltarse el script en local. |
| D | Contratos listos para los primeros carriles | 15 | 8 | `inventory`, `catalog`, `pos-pay` y lectura de `customers` tienen operaciones `approved`. D-005 implementado. | Conteos, ajustes, reportes, escritura de clientes, compras y administración siguen `proposed`. Los paquetes UI por dominio son v0.1. |
| E | Compuertas automáticas (CI) | 10 | 3 | `.github/workflows/ci.yml` escrito con las mismas compuertas que en local. | **Nunca se ha ejecutado en GitHub.** Sin protección de ramas. |
| F | Ensayo de integración | 15 | 10 | 3 carriles (`inventory`, `customers`, `catalog`), 3 fusiones secuenciales en `rehearsal/integration-1`, compuertas en verde tras cada una (483 → 485 → 486 pruebas). | Fue el caso fácil: cambios aditivos, sin archivo compartido, un solo agente y una sola herramienta, sin PR en GitHub. |
| G | GitHub alineado | 5 | 2 | `codex/parallel-readiness` publicada hasta `d3262c8`. | Herramientas, troncal y carriles sin publicar. `main` remoto es otra historia (Next.js) sin ancestro común. |
| | **Total** | **100** | **67** | | |

## Lectura

- **Se puede empezar ya, con 2 o 3 agentes y un integrador,** en carriles con contrato aprobado: `inventory` (traslados, alertas,
  existencias), `catalog`, `pos-proofs` (app del responsable) y lectura de `customers`.
- **No conviene abrir más carriles todavía**: sin CI corriendo ni contratos aprobados, el control depende de la disciplina.

## Qué sube la cifra más rápido

| Acción | Sube | Quién |
|---|---:|---|
| Publicar troncal y carriles y ver una corrida real de CI | +7 | Dueño autoriza; integrador ejecuta |
| Aprobar contratos de conteos, ajustes y reportes (PR `contract:`) | +5 | Dueño decide; integrador publica |
| Segundo ensayo con otra herramienta y un cambio de contrato compartido | +5 | Integrador + un agente en OpenCode o Codex |
| Decidir el archivo `frontend/src/method` y poner al día `integration` | +3 | Dueño |
| Decidir la historia de `main` en GitHub | +3 | Dueño |

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
