# F13 — Offline seguro: documentación de etapas 1–3

**Fecha:** 2026-10-12. **Encargo:** documentar en GitHub la propuesta offline aceptada; **NO implementar etapa 4**. Este paquete se crea después de los paquetes anteriores que excluían F13; las exclusiones históricas no se eliminan. El frontend local/backend/PWA no han sido auditados ni se han ejecutado pruebas.

## Documentos
1. [Etapa 1 — Funcional](F13-STAGE1-FUNCTIONAL-V1.md): qué puede seguir funcionando sin conexión y qué debe bloquearse.
2. [Etapa 2 — UI, seis contratos](F13-STAGE2-UI-SIX-CONTRACTS-V1.md): FLOW, SCREEN, TEMPLATE, COMPONENTS, RESPONSIVE, ACCESSIBILITY.
3. [Etapa 3A — Datos, sincronización, adapters](F13-STAGE3-DATA-SYNC-ADAPTERS-V1.md): DTOs lógicos, IndexedDB/PWA propuestos, outbox, ACK, errores, reintentos y operaciones candidatas.
4. [Etapa 3B — Estados, permisos, mocks](F13-STAGE3-STATES-PERMISSIONS-MOCKS-V1.md): matrices de estados, permisos por persona/operación, 20 casos de prueba descritos.

## Principios operativos aprobados para documentar
- Continuidad ágil de **catálogo/cache, carrito, F08 preparación de pedidos descargados y capturas de conteo**.
- Ventas de efectivo offline solo como **provisionales condicionadas** por política comercial/fiscal, límites y conciliación posterior. Por defecto apagadas hasta validación.
- Banco/transferencias: nota o comprobante pendiente **no es pago verificado**; datáfono/reembolsos/ajustes de stock/cierre Z/facturación DIAN no se confirman offline por defecto.
- Indicador compacto de conexión y pendientes; **sin modales repetitivos**. Conexión recuperada → revalidar sesión/autorización → resolver UNKNOWN → sincronizar → conciliar.
- **Nunca un ERP paralelo local**: servidor/ERPNext autoridad, cliente captura y outbox idempotente, no ledger fiscal de navegador.
- Autorización por **persona + operación + contexto/tiempo/dispositivo**, no cargo. Captura local no concede autorización servidor ni efectúa desembolso.
- Seguridad: PWA/IndexedDB no garantizan datos siempre conservados, Background Sync no garantiza ejecución; casos sensibles con control de custodia, cuota y retención.

## Relación con otros contratos
- [POS F01–F14](../pos/FLOWS-F01-F14.md), [F08 Pedidos](../orders/F08-STAGES-1-3-INDEX.md), [INV](../inventory/INV-ZONES-CYCLE-STOCK-V1.md), [F-FIN](../finance/F-FIN-ENTERPRISE-V1.md), [ADM](../contracts-v1/01-functional/ADM-POS-OPERATIONS-CONFIG.md), [foundation UI](../contracts-v1/02-ui/UI-FOUNDATION-SIX-CONTRACTS.md).
- Las exclusiones F13 de `docs/contracts-v1/` y del F08 previo describen **el alcance de esos encargos**, no el nuevo paquete autónomo.
- Los nombres de operaciones y DTOs son candidatos, no endpoints comprobados; el costo de mantener modo offline debe medirse antes de implementarlo.

## Resultado y pendientes
Etapas 1–3: **documentadas**. Etapa 4: **no iniciada** (sin código, PWA, IndexedDB, tests, mocks vivos, migraciones, DIAN ni adaptadores reales). Preflight pendiente: branch frontend real `capa-2-responsive`, compatibilidad PrimeReact/Service Worker/IndexedDB, permisos servidor, OpenAPI/ERPNext, política fiscal de contingencias y caja, QA concurrente/dispositivos.
