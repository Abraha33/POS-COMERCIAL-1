# Hoja de carril: pos-ops

## Objetivo
Que el cajero abra caja, opere su turno, haga relevo y cierre, con autorizaciones trazables.

## Fuente de verdad
- `docs/finance/F-FIN-ENTERPRISE-V1.md`
- `docs/contracts-v1/01-functional/POS-F09-F10-F11-CONVERGENCE.md`
- `docs/contracts-v1/02-ui/UI-FIN-SIX-CONTRACTS.md`
- Contrato (v0.8.0), **aprobado**: `GET /pos/shifts/current`, `POST /pos/shifts`, `POST /pos/shifts/{id}/close`, `POST /pos/shifts/{id}/movements`, `GET /pos/registers`
- Contrato, **propuesto**: `GET /pos/shifts`, `POST /pos/shifts/{id}/handover`, `GET /auth/supervisor-approvals/requests`, `POST /auth/supervisor-approvals/requests`, `POST /auth/supervisor-approvals/requests/{id}/decision`, `POST /pos/sync/batches`, `GET /pos/sync/operations/{idempotencyKey}`

## Posees (de `lanes.json`)
- `frontend/src/features/pos-ops/**`
- `frontend/src/features/pos-access/**`
- `frontend/src/tests/pos-ops-*.test.*`
- `frontend/src/tests/pos-access*.test.*`
- `frontend/e2e/pos-ops.spec.ts`
- `frontend/e2e/pos-access.spec.ts`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-pos-ops.md`.

## Entorno
`pnpm lane:new pos-ops` · `DEV_PORT=8106 pnpm dev`

## Bloqueos conocidos
- Operaciones `proposed` (no construir producción encima sin aprobación): `GET /pos/shifts`, `POST /pos/shifts/{id}/handover`, `GET /auth/supervisor-approvals/requests`, `POST /auth/supervisor-approvals/requests`, `POST /auth/supervisor-approvals/requests/{id}/decision`, `POST /pos/sync/batches`, `GET /pos/sync/operations/{idempotencyKey}`.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar siempre qué NO se verificó (backend real, DIAN, banco, hardware).
