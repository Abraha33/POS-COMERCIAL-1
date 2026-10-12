# Entorno oficial (2026-10-12)

Fuente de verdad para no confundir carpetas, ramas ni puertos. Reglas de trabajo: `AGENTS.md`.

## Oficial
| | |
|---|---|
| Carpeta | `D:\POS-COMERCIAL-WORKTREES\pos-proofs` |
| Rama | `feat/pos-proofs` |
| Puerto | `8082` (dev). Playwright usa `8090` y levanta su propio servidor |
| Arranque | `cd frontend && pnpm dev` |

Contiene: POS completo (venta rápida, comprobantes móviles, conciliación, pedidos, turnos/autorizaciones/offline sobre
capa 5), y todos los carriles anteriores ya fusionados en esta rama.

## Respaldo (no trabajar aquí; no se borra)
| Carpeta / rama | Qué es | Puerto histórico | Ancla (tag) |
|---|---|---|---|
| `D:\POS-COEMRCIAL-1` · `capa-2-responsive` | Carpeta principal con el trabajo de otro agente (Codex): login/registro, tracking, backend Frappe local, dashboard, `SaleInvoice`, `CashCount`, pasada responsive | 8080 / 5188 | `respaldo/capa-2-responsive-7acde90` |
| `unificado` | Intento de unir lo anterior con la rama oficial (88 conflictos resueltos; 442 tests verdes) | 8081 | `respaldo/unificado-918e049` |

`capa-1-estructura` tampoco está contenida en la oficial; se conserva sin cambios.

## Ramas de carriles ya contenidas en la oficial
`be/auth`, `be/inventory`, `be/sales`, `be/shifts`, `contract/v0.5.0`, `design/core`, `feat/administration`,
`feat/customers-ledger`, `feat/pos`, `feat/pos-access`, `feat/pos-ops`, `feat/pos-sales`, `feat/products-inventory`,
`feat/purchases`, `feat/reports`, `integration`, `qa/ux`, `ui/adm`, `ui/inv`, `ui/led`, `ui/pos`, `ui/pur`.
Sus worktrees en `D:\POS-COMERCIAL-WORKTREES\` ya no aportan nada nuevo: se pueden archivar (`git worktree remove`)
cuando el dueño lo decida. **No se han tocado.**

## Estado conocido a la fecha
- **Cambio sin commitear ajeno:** `frontend/src/mocks/test-users.ts` tiene `TEST_PASSWORD = '1234'` (antes
  `cambiar-en-desarrollo`). No lo hizo esta sesión de documentación; está pendiente de decisión y no se commiteó.
- **Docker:** Docker Desktop estaba apagado (el motor no responde); la rama oficial no tiene archivos Docker.
- **Backend real:** no existe en la rama oficial. El material de un backend Frappe local está solo en `7acde90`.
- **Carpeta principal:** estaba en HEAD desacoplado en `7acde90`; se reancló a la rama `capa-2-responsive`
  (mismo commit, sin pérdida) y lleva un `LEER_PRIMERO.md` que remite a la oficial.

## Pendientes de decisión del dueño
1. ¿Traer a la oficial lo que sólo existe en `7acde90` (backend Frappe local, dashboard, login/registro, `SaleInvoice`)?
   No choca con la oficial salvo en `frontend/`; se haría como PR/rama aparte.
2. ¿Renombrar la rama `feat/pos-proofs` a un nombre estable (p. ej. `oficial`)? Implica avisar a otras herramientas.
3. ¿Archivar los worktrees de carriles ya contenidos?
4. Fusión a `main`: sigue **sin hacerse**; requiere "Fusiona" explícito.
