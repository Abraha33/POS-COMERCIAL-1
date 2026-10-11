# backend/

Frappe / ERPNext. **Aún no hay código ni instancia.** Esta carpeta existe para fijar el alcance antes de empezar.

## Arquitectura (decidida)
- **Frappe/ERPNext es solo backend.** El frontend es una SPA React separada que lo consume únicamente por HTTP
  (`/api/v1`, descrito en `contracts/openapi.yaml`); no hay código del frontend dentro de Frappe.
- **Opción A (recomendada, pendiente de confirmar con la instancia):** una app propia de Frappe (`pos_api`) con métodos
  `@frappe.whitelist` que aplican las reglas de `docs/business-rules/` y responden con el formato del contrato. Un
  proxy/reescritura mapea `/api/v1/*` a `/api/method/pos_api.*`. Las operaciones transaccionales (venta, stock, caja)
  corren dentro de Frappe para ser atómicas.
- **Descartada por ahora:** gateway separado delante de Frappe (un componente más y transacciones menos atómicas).
- La API nativa de Frappe (`/api/resource`, `/api/method`) **no** forma parte del contrato; el frontend no la usa.

## Qué debe implementar
`contracts/openapi.yaml` (v0.3.0) exactamente, empezando por las operaciones `x-status: proposed`:
`/auth/*`, `POST /pos/sales` (idempotente), `POST /pos/sales/{id}/void`, `/pos/shifts*`.
Las reglas están en `docs/business-rules/` (BR-XXX); aprobadas por el dueño del negocio.

## Antes de escribir código
1. ~~Aprobar reglas~~ Hecho; resolver las aclaraciones A1–A8 de `docs/business-rules/99-preguntas-abiertas.md`.
2. Definir la instancia de desarrollo (¿`frappe_docker`? ¿bench local?) y la versión de Frappe/ERPNext. **No decidido (B0).**
3. Verificar el mapeo campo a campo de cada contrato contra los DocTypes (`x-frappe-doctype`). **No verificado.**
4. Decidir autenticación: token (`api_key:api_secret`) vs. sesión con cookie (esta exige CORS y CSRF con la SPA en otro origen). **No decidido (B0).**
5. Configurar CORS en Frappe para el origen del frontend (`allow_cors`).
6. Confirmar la opción A con un prototipo mínimo (`POST /api/v1/auth/login` y `GET /api/v1/auth/session`) que pase esos 3 escenarios de conformidad.

## Plan de trabajo
Carriles B0–B5, orden y escenarios que cada uno debe pasar: `docs/architecture/PARALLEL_WORKPLAN.md`.
Datos y usuarios de prueba a cargar: `contracts/fixtures/`.

## Cómo se comprueba que cumple
- Suite de conformidad (existe, 19 escenarios): desde `frontend/`, `API_BASE_URL=http://localhost:8000/api/v1 pnpm conformance`.
  Valida estados, códigos de error y esquemas contra `openapi.yaml`. Hoy corre contra el mock; el backend debe pasarla igual.
- El backend no cambia el contrato por su cuenta: PR `contract:` revisado por el integrador.

## Fuera de alcance por ahora
Facturación electrónica DIAN, pagos con pasarela, sincronización offline masiva.
