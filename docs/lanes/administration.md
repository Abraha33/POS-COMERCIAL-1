# Hoja de carril: administration

## Objetivo
Que un administrador gestione usuarios, roles, empresa, sedes y la configuración del POS.

## Fuente de verdad
- `docs/contracts-v1/01-functional/ADM-POS-OPERATIONS-CONFIG.md`
- `docs/contracts-v1/02-ui/UI-ADM-SIX-CONTRACTS.md`
- Contrato (v0.8.0), **aprobado**: `GET /employees`
- Contrato, **aprobado desde D-067 (2026-10-13)**: `POST /employees`, `PUT /employees/{id}`, `GET /branches`, `PUT /branches/{id}`, `GET /company`, `PUT /company`

## Posees (de `lanes.json`)
- `frontend/src/features/administration/**`
- `frontend/src/tests/admin-administration.test.*`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-administration.md`.

## Entorno
`pnpm lane:new administration` · `DEV_PORT=8112 pnpm dev`

## Bloqueos conocidos
- Sin operaciones `proposed` propias. Reglas BR-ADM-04..06 aprobadas por D-067. No hay alta de sedes (`POST /branches`).
- El contrato **no** modela roles y permisos como recurso editable ni configuración del POS por caja (D-049): ambos esperan un
  PR `contract:` del integrador antes de construirse.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar siempre qué NO se verificó (backend real, DIAN, banco, hardware).
