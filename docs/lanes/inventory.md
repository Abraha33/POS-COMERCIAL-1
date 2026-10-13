# Hoja de carril: inventory

## Objetivo
Que el responsable de inventario vea existencias por sede, mueva stock entre sedes en dos pasos (enviar y recibir) y atienda
alertas de stock, sin salir de una pantalla.

## Fuente de verdad
- Reglas: `docs/inventory/INV-ZONES-CYCLE-STOCK-V1.md` (D-038, D-042) y `docs/inventory/COUNT-DUAL-ROLE.md`.
- UI: `docs/contracts-v1/02-ui/UI-INV-SIX-CONTRACTS.md`.
- Contrato (v0.8.0), **aprobado**: `GET /stock/levels`, `GET /stock/movements`, `GET/POST /inventory/transfers`,
  `POST /inventory/transfers/{id}/receive`, `GET /inventory/alerts`.
- Contrato, **aprobado por el dueño el 2026-10-12 (D-066)**: `POST /inventory/counts`, `POST /inventory/adjustments`
  (reglas BR-AJU-01..04 y BR-CNT-01..03).
- Hooks: `shared/api/queries` (`useStockLevels`, `useTransfers`, `useInventoryAlerts`, …).

## Posees (de `lanes.json`)
`frontend/src/features/inventory/**` · `frontend/src/tests/inventory-screens.test.*`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-inventory.md`.

## Entorno
`pnpm lane:new inventory` · `DEV_PORT=8108 pnpm dev`

## Alcance para empezar
1. Existencias por sede con filtros y estado vacío/error útil.
2. Traslado en dos pasos: crear, enviar, recibir con diferencias.
3. Alertas de stock negativo y de mínimo.
4. Ajuste manual con motivo y conteo físico por sede, en su versión simple (D-066).

## Bloqueos conocidos
- **Conteo diario por zonas (D-042) y ajustes con aprobación (D-038):** el contrato aprobado (D-066) cubre el ajuste y el conteo
  simples; **no** modela zonas, semáforo ni el rol ayudante/cajero/supervisor. Eso necesita un PR `contract:` del integrador.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar qué NO se verificó (backend real, concurrencia de movimientos, rendimiento con datos reales).
