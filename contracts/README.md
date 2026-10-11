# contracts/

Fuente compartida entre frontend y backend. **Versión 0.3.0 — reglas aprobadas por el dueño; implementación y validación contra Frappe pendientes** (ver
`docs/business-rules/99-preguntas-abiertas.md`, aclaraciones A1–A8).

- `openapi.yaml`: operaciones, esquemas, errores y seguridad. Prefijo `/api/v1`.
  Cada operación marca `x-status`: `simulated` (existe como mock MSW) o `proposed` (solo definida aquí).
- `examples/<contrato>.json`: un ejemplo válido por contrato.

## Cómo se mantiene coherente (automático, `pnpm core:check` en `frontend/`)
| Verificación | Dónde |
|---|---|
| `openapi.yaml` es OpenAPI 3.1 válido | `frontend/src/tests/openapi.test.ts` |
| Cada ejemplo cumple su schema OpenAPI | `openapi.test.ts` |
| Cada ejemplo coincide con el `example` del Zod del frontend | `frontend/src/tests/contracts.test.ts` |
| Los tipos Zod ≡ tipos generados desde el YAML (ambos sentidos) | `frontend/src/tests/contract-types.ts` (`tsc`) |
| Tipos generados (`frontend/src/shared/api/generated/schema.d.ts`) están al día | gate 4 de `core:check`; regenerar con `pnpm gen:api` |
| Endpoints `simulated` ⇔ handlers MSW | `openapi.test.ts` |

## Reglas
1. Contrato primero: se define aquí antes de implementarse en frontend o backend.
2. Ningún lado lo cambia unilateralmente: PR con prefijo `contract:` revisado por el integrador.
3. Tras editar `openapi.yaml`: `pnpm gen:api` y actualizar el Zod correspondiente; si divergen, `tsc` falla.
4. Las reglas de negocio que cita cada operación (BR-XXX) viven en `docs/business-rules/`.

## Pendiente
- Aclaraciones menores A1–A8 (redondeo al peso, descuento del cajero, recepción parcial de traslados…).
- Autenticación real contra Frappe (token vs. sesión) — hoy `bearerAuth` es una propuesta.
- Paginación y filtros en listados (hoy devuelven arreglos completos).
- Operaciones de inventario (ajustes, traslados), compras (crear/recibir) y abonos de cartera.
- Mocks MSW de las operaciones `proposed` (venta, turnos, auth): aún no existen.
