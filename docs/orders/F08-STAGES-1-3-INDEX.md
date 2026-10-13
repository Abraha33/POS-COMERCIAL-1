# F08 — Pedidos: etapas 1, 2 y 3

**Estado:** especificación documental sin código ni pruebas, 2026-10-12. **F13 Offline:** fuera de alcance.

## Entregables
1. [Etapa 1 — Flujo funcional](F08-STAGE1-OPERATING-FLOW-V2.md): pedido omnicanal, preparación, faltantes, compras externas y verificación.
2. [Etapa 2 — Seis contratos de UI](F08-STAGE2-UI-SIX-CONTRACTS-V2.md): FLOW, SCREEN, TEMPLATE, COMPONENTS, RESPONSIVE y ACCESSIBILITY.
3. [Etapa 3A — Datos, operaciones y adapters](F08-STAGE3-DATA-API-ADAPTERS-V2.md): esquemas y operaciones lógicas, integración con módulos existentes.
4. [Etapa 3B — Estados, permisos y pruebas propuestas](F08-STAGE3-STATES-PERMISSIONS-MOCKS-V2.md): permisos por persona y contexto, máquinas de estado, errores y escenarios de mocks.

## Reglas esenciales
El preparador ve producto, cantidad y ubicación; registra faltantes en una acción y continúa. La persona autorizada busca proveedores, decide y asigna comprador. Una persona diferente o la misma, con permiso adecuado, entrega dinero. Si la compra falla, se conserva el intento y el dinero adelantado sigue registrado; vuelve a búsqueda. El pedido solo se marca completo tras verificar líneas y cantidades solicitadas o aceptadas por el cliente. Consultar stock por bodega con fecha y grado de certeza de ubicación.

El [documento PED v1](PED-ORDERS-FULFILLMENT-V1.md) es antecedente; esta versión desarrolla los cambios posteriores. Las autorizaciones no dependen de un cargo fijo. Se conservan las prioridades configurables de D-043.

## Límites
No se construyó frontend, backend, MSW, Zod, ERPNext, DIAN ni microapp Radar. Los contratos no equivalen a endpoints existentes, pruebas aprobadas ni calidad medida. La fase 4 sigue sin ejecutarse. Antes de implementarla, comprobar el frontend actual, API real, efecto de movimientos de stock/caja, fiscalidad y permisos en servidor.


## Dependencia posterior: F13 Offline

Este documento F08 excluía **F13 en el momento de su propio encargo**. Posteriormente F13 se documentó en paquete independiente: [Offline etapas 1–3](../offline/F13-STAGES-1-3-INDEX.md). Para F08 solo se contemplan picking/faltantes descargados y guardado local; notificaciones remotas, stock oficial y pedido "Listo" definitivo quedan sujetos a sincronización y validación. No significa que offline esté implementado.
