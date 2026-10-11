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

## Plan de trabajo
Carriles B0–B5, orden y escenarios que cada uno debe pasar: `docs/architecture/PARALLEL_WORKPLAN.md`.
Datos y usuarios de prueba a cargar: `contracts/fixtures/`.

## Cómo se comprueba que cumple
- Suite de conformidad (existe, 19 escenarios): desde `frontend/`, `API_BASE_URL=http://localhost:8000/api/v1 pnpm conformance`.
  Valida estados, códigos de error y esquemas contra `openapi.yaml`. Hoy corre contra el mock; el backend debe pasarla igual.
- El backend no cambia el contrato por su cuenta: PR `contract:` revisado por el integrador.

## Fuera de alcance por ahora
Facturación electrónica DIAN, pagos con pasarela, sincronización offline masiva.
