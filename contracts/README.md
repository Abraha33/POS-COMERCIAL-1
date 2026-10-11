# contracts/

Fuente compartida entre frontend y backend.

- `openapi.yaml`: operaciones y esquemas HTTP (borrador derivado de los mocks MSW).
- `examples/<contrato>.json`: un ejemplo válido por contrato. El test `frontend/src/tests/contracts.test.ts`
  comprueba que coinciden con los `example` de Zod en `frontend/src/shared/contracts`.

## Reglas
1. Contrato primero: se define aquí antes de implementarse en frontend o backend.
2. Ningún lado lo cambia unilateralmente: PR con prefijo `contract:` revisado por el integrador.
3. Los Zod del frontend deben reflejar este archivo; si divergen, gana `openapi.yaml`.

## Pendiente
- Generar tipos/validadores del frontend desde `openapi.yaml` (hoy se mantienen a mano).
- Endpoint de venta transaccional con identificador de operación e idempotencia (POS offline): aún no definido.
