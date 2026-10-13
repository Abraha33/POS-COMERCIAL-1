# Hoja de carril: inventory

## Objetivo
Que el responsable de inventario vea existencias por sede, mueva stock entre sedes en dos pasos (enviar y recibir) y atienda
alertas de stock, sin salir de una pantalla.

## Fuente de verdad
- Reglas: `docs/inventory/INV-ZONES-CYCLE-STOCK-V1.md` (D-038, D-042) y `docs/inventory/COUNT-DUAL-ROLE.md`.
- UI: `docs/contracts-v1/02-ui/UI-INV-SIX-CONTRACTS.md`.
- Contrato (v0.8.0), **aprobado**: `GET /stock/levels`, `GET /stock/movements`, `GET/POST /inventory/transfers`,
  `POST /inventory/transfers/{id}/receive`, `GET /inventory/alerts`.
- Contrato, **propuesto** (no construir producción encima): `POST /inventory/counts`, `POST /inventory/adjustments`.
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

## Bloqueos conocidos
- **Conteo diario por zonas (D-042) y ajustes con aprobación (D-038):** el contrato es `proposed` y no modela zonas, semáforo
  ni el rol ayudante/cajero/supervisor. Hace falta un PR `contract:` del integrador antes de construirlos.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar qué NO se verificó (backend real, concurrencia de movimientos, rendimiento con datos reales).
