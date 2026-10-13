# Paquete ERP/POS Holamigo — Preparación documental etapas 1, 2 y 3

**Fecha:** 2026-10-12. **Rama fuente:** `experiment/frappe-validation` después de integrar el PR correspondiente. **Estado:** entrega de documentación, **no** implementación. **Objetivo:** que Codex/OpenCode puedan comenzar más adelante una etapa 4 con contratos claros y sin inventar políticas de negocio.

## Alcance exacto autorizado
- Etapa 1: cerrar propuestas F07 Devoluciones, Clientes/Cartera, F14 Administración y convergencia F09/F10/F11; CAT/INV/COM/REP ya aprobados se referencian.
- Etapa 2: arquitectura UI común y **nueve paquetes por dominio, incluido POS Venta rápida actualizado** de seis secciones cada uno (FLOW, SCREEN, TEMPLATE, COMPONENTS, RESPONSIVE, ACCESSIBILITY).
- Etapa 3: **schemas Zod descriptivos**, operaciones API lógicas, estados, adapters, permisos, errores, escenarios MSW y criterios de aceptación. Los archivos NO contienen código, schemas ejecutables, fixtures JSON reales ni handlers MSW.
- **Excluidos:** PED/F08 (Pedidos) y F13 (Offline/sincronización), conservados en backlog previo sin nueva especificación ni implementación. Fallas de red de operaciones financieras sólo se consideran por integridad/idempotencia; no constituyen diseño de Offline.
- **Etapa 4 excluida:** implementación, tests, ejecución de QA, apps/periféricos/ERPNext/DIAN/bancos.

## Lectura recomendada
1. [Estado y límites](01-functional/STATUS-SCOPE-AND-EXCLUSIONS.md)
2. Etapa 1 — [F07](01-functional/F07-RETURNS-EXCHANGES.md), [Clientes](01-functional/CLI-CUSTOMERS-CREDIT.md), [Administración](01-functional/ADM-POS-OPERATIONS-CONFIG.md), [F09/F10/F11](01-functional/POS-F09-F10-F11-CONVERGENCE.md)
3. Etapa 2 — [Foundation de seis contratos](02-ui/UI-FOUNDATION-SIX-CONTRACTS.md) y paquetes: [POS Venta](02-ui/UI-POS-SALE-SIX-CONTRACTS.md) · [CAT](02-ui/UI-CAT-SIX-CONTRACTS.md) · [INV](02-ui/UI-INV-SIX-CONTRACTS.md) · [COM](02-ui/UI-COM-SIX-CONTRACTS.md) · [CLI](02-ui/UI-CLI-SIX-CONTRACTS.md) · [RET](02-ui/UI-RET-SIX-CONTRACTS.md) · [FIN](02-ui/UI-FIN-SIX-CONTRACTS.md) · [REP](02-ui/UI-REP-SIX-CONTRACTS.md) · [ADM](02-ui/UI-ADM-SIX-CONTRACTS.md)
4. Etapa 3 — [Schemas lógicos](03-data/SCHEMA-CATALOG.md), [Operaciones](03-data/OPERATION-MATRIX.md), [Estados y permisos](03-data/STATE-AND-PERMISSION-CONTRACTS.md), [Adapters y escenarios de mocks](03-data/ADAPTERS-MOCKS-AND-TEST-CASES.md), [Trazabilidad y bloqueadores](03-data/TRACEABILITY-AND-REVIEW-GATES.md)
5. Fuentes de decisiones: [Registro maestro](../decisions/2026-10-12-DECISION-REGISTER.md), [CAT](../catalog/CAT-PRODUCTS-PRICING-V1.md), [INV](../inventory/INV-ZONES-CYCLE-STOCK-V1.md), [COM](../purchasing/COM-PURCHASING-SUPPLIERS-V1.md), [REP](../reports/REP-REPORTS-AUDIT-V1.md), [F-FIN](../finance/F-FIN-ENTERPRISE-V1.md), [POS](../pos/FLOWS-F01-F14.md).

## Regla de precedencia
Una regla **A** aprobada por usuario en registro prevalece sobre detalle generado por el asistente de nivel **P**. Si dos documentos contradicen una decisión vigente, registrar conflicto; no cambiar el negocio por inferencia. Las propuestas de esta entrega **no** certifican implementabilidad ni reemplazan validación legal. Un contrato UI o API lógico tampoco demuestra que ya exista código o que haya pasado pruebas.

## Entregables y estado
| Etapa | Entregable | Estado |
|---|---|---|
| 1 | 5 documentos funcionales y delimitación de alcance | Documentados, propuestas nuevas P por revisar |
| 2 | Foundation + 9 contratos UI seis secciones | Documentados, listos para cotejo con PrimeReact actual |
| 3 | Schema/Operation/State+Permissions/Adapters+MockCases/Traceability | Documentados, sujetos a mapeo API/backend |
| 4 | Código, fixtures, Zod/MSW real, tests, QA | **FUERA DE ALCANCE, NO EJECUTADO** |

## Definición de "preparado para implementar"
No equivale a que software esté construido. Hace falta **preflight** técnico: confirmar branch local vigente/commit, APIs existentes, versión real PrimeReact/React, ownership store, permisos, viabilidad ERPNext, compatibilidad contable/fiscal. En caso de desacople: emitir informe `GAP` con nombre operación/entidad/seguridad y aprobación antes de implementar.


## Nota de alcance posterior — F08 (2026-10-12)

La exclusión de Pedidos/F08 descrita **arriba** corresponde a este paquete previo, no a una prohibición general. **Después**, el usuario solicitó explícitamente documentar F08 hasta etapa 3, sin código, como paquete **autónomo**: [F08 etapas 1–3](../orders/F08-STAGES-1-3-INDEX.md). **F13 Offline permanece excluido** de ambos paquetes. No reinterpretar la v1 como si hubiera incluido F08.


## Nota de alcance posterior — F13 Offline (2026-10-12)

La exclusión de F13 escrita arriba describe el primer paquete documental. Un **nuevo encargo** solicitó luego documentar F13 por separado hasta etapa 3: [F13 Offline etapas 1–3](../offline/F13-STAGES-1-3-INDEX.md). No editar retroactivamente las exclusiones históricas ni interpretar contratos lógicos como software disponible. **Etapa 4 sigue fuera.**
