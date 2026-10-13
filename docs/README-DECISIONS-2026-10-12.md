# Índice — Consolidación del 12 de octubre de 2026

**Propósito:** preservar decisiones del proyecto ERP/POS Holamigo y permitir a Codex/OpenCode elegir la versión vigente sin copiar conversaciones. **Operación:** documentación nueva, no código funcional ni tests.

## Lectura por orden
1. [Estado maestro](PROJECT-STATE.md) — arquitectura, prioridades, vigencia y bloqueos.
2. [Registro D-001..D-036](decisions/2026-10-12-DECISION-REGISTER.md) — qué está aprobado vs propuesta/validación.
3. [POS F01–F14](pos/FLOWS-F01-F14.md).
4. [Venta F04–F06](pos/SALE-UX-CHECKOUT.md).
5. [Finanzas F-FIN estándar empresarial (18 flujos)](finance/F-FIN-ENTERPRISE-V1.md).
6. [Arquitectura de UI y trabajo paralelo](architecture/UI-CONTRACTS-AND-WORKTREES.md).
7. [Conteo de inventario por dos roles](inventory/COUNT-DUAL-ROLE.md).
8. [Microapps y fiscalidad internacional: alcance relacionado](product/RELATED-SCOPE-2026-10-12.md).
9. [QA y bloqueadores](qa/ACCEPTANCE-2026-10-12.md).
10. [Handoff Codex/OpenCode](PROJECT-HANDOFF-CODEX.md).
11. [Contratos UI originales v0.1](pos-proofs/v0.1/INDEX-POS-CONTRACTS.md): preservados, NO fuente de vigencia posterior por sí solos.

## Grupos funcionales aprobados posteriormente el mismo día

- [CAT-01..08 — Productos y precios](catalog/CAT-PRODUCTS-PRICING-V1.md).
- [INV-01..10 — Inventarios y conteo diario por zonas](inventory/INV-ZONES-CYCLE-STOCK-V1.md).
- [COM-01..08 — Compras y proveedores](purchasing/COM-PURCHASING-SUPPLIERS-V1.md).
- [PED-01..08 — Pedidos y despacho, funcional aprobado e implementación aplazada](orders/PED-ORDERS-FULFILLMENT-V1.md).
- [REP-01..09 — Reportes, X/Z y auditoría](reports/REP-REPORTS-AUDIT-V1.md).

**Prioridad de lectura:** decisiones D-037..D-044 posteriores dentro del [registro](decisions/2026-10-12-DECISION-REGISTER.md) actualizan detalles previos de conteos, F08 y F10.

## Paquete adicional: etapas 1–3 SIN Pedidos ni Offline

- [Índice de preparación para frontend](contracts-v1/README.md) — contrataciones por dominio, sin código.
- [Etapa 1: F07, Clientes, ADM y F09–F11](contracts-v1/01-functional/STATUS-SCOPE-AND-EXCLUSIONS.md).
- [Etapa 2: seis contratos UI y nueve paquetes de dominio](contracts-v1/02-ui/UI-FOUNDATION-SIX-CONTRACTS.md).
- [Etapa 3: schemas, operaciones, estados, permisos, adapters, mocks](contracts-v1/03-data/TRACEABILITY-AND-REVIEW-GATES.md).

Las nuevas D-045..D-052 separan **alcance expresamente autorizado** de **propuestas técnicas no aprobadas como política**. El proyecto no ha ejecutado la etapa 4.

## Baseline sin modificación
- `docs/MASTER-PLAN.md`
- `docs/HANDOFF.md`
- `docs/ADR-001-COMPOSABLE-PROFILES.md`
- `docs/GITHUB-TRACKING.md`
- `docs/research/POS-MULTIBUSINESS-OPERATING-MODEL.md`

## Estado
Aprobación del usuario: modelo financiero estándar empresarial, catálogo de dos niveles, fotos múltiples, roles/custodia configurables, pagos de proveedores por caja, restricciones F07 y aplazamiento F08. Los contratos derivados siguen pendientes de prueba y validación profesional; no se editaron fuentes antiguas.

**Nota:** el repo GitHub conectado actualmente no mostró `capa-2-responsive`, por lo que el frontend local reciente debe auditarse antes de integrar. «Project Six» como tablero GitHub aún precisa identificación/permiso para asociación directa.
