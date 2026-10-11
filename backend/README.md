# backend/

Frappe / ERPNext. **Aún no hay código ni instancia.** Esta carpeta existe para fijar el alcance antes de empezar.

## Qué debe implementar
`contracts/openapi.yaml` (v0.3.0) exactamente, empezando por las operaciones `x-status: proposed`:
`/auth/*`, `POST /pos/sales` (idempotente), `POST /pos/sales/{id}/void`, `/pos/shifts*`.
Las reglas están en `docs/business-rules/` (BR-XXX); aprobadas por el dueño del negocio.

## Antes de escribir código
1. ~~Aprobar reglas~~ Hecho; resolver las aclaraciones A1–A8 de `docs/business-rules/99-preguntas-abiertas.md`.
2. Definir la instancia de desarrollo (¿`frappe_docker`? ¿bench local?) y la versión de Frappe/ERPNext. **No decidido.**
3. Verificar el mapeo campo a campo de cada contrato contra los DocTypes (`x-frappe-doctype`). **No verificado.**
4. Decidir autenticación (token API de Frappe vs. sesión con cookie).

## Cómo se comprueba que cumple
- Pruebas de conformidad en `tests/integration/`: cada ejemplo de `contracts/examples/` se envía a la operación
  correspondiente y la respuesta se valida contra el schema de `openapi.yaml`. (Pendiente de crear.)
- El backend no cambia el contrato por su cuenta: PR `contract:` revisado por el integrador.

## Fuera de alcance por ahora
Facturación electrónica DIAN, pagos con pasarela, sincronización offline masiva.
