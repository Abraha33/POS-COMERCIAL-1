# Hoja de carril: customers

## Objetivo
Que el cajero y cartera consulten un cliente (datos fiscales, cupo, saldo, mora) y que cartera vea sus cuentas por cobrar,
sin recalcular saldos en el cliente.

## Fuente de verdad
- Reglas: `docs/contracts-v1/01-functional/CLI-CUSTOMERS-CREDIT.md`, `docs/finance/F-FIN-ENTERPRISE-V1.md`.
- UI: `docs/contracts-v1/02-ui/UI-CLI-SIX-CONTRACTS.md`.
- Contrato (v0.8.0), **aprobado**: `GET /customers`, `GET /receivables`, y desde D-067 (2026-10-13) `POST /customers`,
  `PUT /customers/{id}`, `GET/POST /receivables/{id}/payments`, `POST /customers/{id}/payments`.
- El servidor es la autoridad de `balance`, `status` y `daysOverdue`: la UI no los recalcula.

## Posees (de `lanes.json`)
`frontend/src/features/customers/**` · `frontend/src/features/receivables/**` ·
`frontend/src/tests/ledger-customers.test.*` · `frontend/src/tests/ledger-receivables.test.*`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles (el selector de cliente
del POS es del carril `pos-shell`).
Pide lo que falte en `docs/qa/requests/lane-customers.md`.

## Entorno
`pnpm lane:new customers` · `DEV_PORT=8110 pnpm dev`

## Alcance para empezar
1. Lista y ficha de cliente (solo lectura) con cupo, saldo y mora.
2. Cartera por cliente y antigüedad, solo lectura.
3. Alta y edición de cliente; abono con imputación a las facturas más antiguas (BR-CAR-04) e historial de abonos.

## Bloqueos conocidos
- **Reglas de cartera de la hoja 08 (BR-CAR, BR-PER):** aprobadas por D-067 tal como están. BR-CAR-03 (abono en efectivo no
  afecta el turno) sigue marcada SUP: no construir sobre ella.
- Validaciones fiscales (tipo de documento, NIT) dependen del paquete de país; no inventar reglas locales.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar qué NO se verificó (DIAN, concurrencia, rendimiento con datos reales).
