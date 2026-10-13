# Hoja de carril: pos-proofs

## Objetivo
Que una transferencia se respalde con varias fotos, se envíe al responsable de la cuenta y solo se confirme tras verificar (D-005).

## Fuente de verdad
- `docs/decisions/2026-10-12-DECISION-REGISTER.md`
- `docs/pos/SALE-UX-CHECKOUT.md`
- `docs/contracts-v1/02-ui/UI-FIN-SIX-CONTRACTS.md`
- Contrato (v0.8.0), **aprobado**: `POST /pos/payment-proofs/{id}/evidence`, `DELETE /pos/payment-proofs/{id}/evidence/{evidenceId}`, `POST /pos/payment-proofs/{id}/submit`, `POST /pos/payment-proofs/{id}/verify`
- Contrato, **propuesto**: `POST /pos/payment-proofs`, `GET /pos/payment-proofs/{id}`, `POST /pos/payment-proofs/{id}/confirm`, `POST /pos/payment-proofs/{id}/reject`, `POST /pos/payment-proofs/{id}/exception`, `GET /pos/payment-proofs/public/{token}`, `POST /pos/payment-proofs/public/{token}/evidence`, `GET /pos/sales/{id}/receipt`, `GET /pos/sales/{id}/reprints`, `POST /pos/sales/{id}/reprints`

## Posees (de `lanes.json`)
- `frontend/src/features/pos/proofs/**`
- `frontend/src/features/pos/reprints.ts`
- `frontend/src/features/pos/SaleDetailDialog.tsx`
- `frontend/src/mocks/proofStore.ts`
- `frontend/src/mocks/proofStoreHttp.ts`
- `frontend/src/mocks/proofStoreServer.ts`
- `frontend/src/mocks/handlers/paymentProofs.ts`
- `frontend/src/tests/pos-proofs*.test.*`
- `frontend/src/tests/payment-proofs-receipts*.test.*`
- `frontend/src/tests/sale-reprint.test.*`
- `frontend/src/tests/pos-recon.test.*`
- `frontend/e2e/pos-proofs.spec.ts`
- `frontend/e2e/pos-recon.spec.ts`

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Pide lo que falte en `docs/qa/requests/lane-pos-proofs.md`.

## Entorno
`pnpm lane:new pos-proofs` · `DEV_PORT=8103 pnpm dev`

## Bloqueos conocidos
- Falta la app del responsable: hoy solo verifica un supervisor desde el panel del POS.
- El historial del comprobante vive en la pantalla, no en el servidor.
- Operaciones `proposed` (no construir producción encima sin aprobación): `POST /pos/payment-proofs`, `GET /pos/payment-proofs/{id}`, `POST /pos/payment-proofs/{id}/confirm`, `POST /pos/payment-proofs/{id}/reject`, `POST /pos/payment-proofs/{id}/exception`, `GET /pos/payment-proofs/public/{token}`, `POST /pos/payment-proofs/public/{token}/evidence`, `GET /pos/sales/{id}/receipt`, `GET /pos/sales/{id}/reprints`, `POST /pos/sales/{id}/reprints`.

## Definición de terminado
Ver `docs/lanes/TEMPLATE.md`. Informar siempre qué NO se verificó (backend real, DIAN, banco, hardware).
