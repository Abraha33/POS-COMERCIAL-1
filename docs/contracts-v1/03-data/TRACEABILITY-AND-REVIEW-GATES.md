# Etapa 3 — Matriz de trazabilidad, entrega a Codex y criterios de revisión

**Estado:** especificación documental; ninguna construcción/QA ejecutada. **Ámbito:** POS F01–F07, F09–F12, F14; CAT, INV, COM, CLI, F-FIN, REP y ADM. F08/PED y F13/OFFLINE expresamente separados y NO desarrollados en esta etapa.

## Artefactos y relación
| Dominio | Fuente negocio | Etapa 1 | Etapa 2 UI seis contratos | Etapa 3 datos/ops/mocks |
|---|---|---|---|---|
| CAT | [CAT v1](../../catalog/CAT-PRODUCTS-PRICING-V1.md) | Aprobado previamente | [UI-CAT](../02-ui/UI-CAT-SIX-CONTRACTS.md) | CAT ops y DTO |
| INV | [INV v1](../../inventory/INV-ZONES-CYCLE-STOCK-V1.md) | Aprobado previamente | [UI-INV](../02-ui/UI-INV-SIX-CONTRACTS.md) | INV ops y DTO |
| COM | [COM v1](../../purchasing/COM-PURCHASING-SUPPLIERS-V1.md) | Aprobado previamente | [UI-COM](../02-ui/UI-COM-SIX-CONTRACTS.md) | COM ops y DTO |
| CLI | TES-05/F04 | [CLI proposal](../01-functional/CLI-CUSTOMERS-CREDIT.md) | [UI-CLI](../02-ui/UI-CLI-SIX-CONTRACTS.md) | CLI ops y DTO |
| F07 | F07/TES-04, normativa | [F07 proposal](../01-functional/F07-RETURNS-EXCHANGES.md) | [UI-RET](../02-ui/UI-RET-SIX-CONTRACTS.md) | RET ops y DTO |
| F09/F10/F11 | F-FIN/REP v1 | [Convergencia](../01-functional/POS-F09-F10-F11-CONVERGENCE.md) | [UI-FIN](../02-ui/UI-FIN-SIX-CONTRACTS.md), [UI-REP](../02-ui/UI-REP-SIX-CONTRACTS.md) | FIN/REP ops y DTO |
| FIN | [F-FIN](../../finance/F-FIN-ENTERPRISE-V1.md) | Aprobado modelo empresarial; profesional PENDIENTE | [UI-FIN](../02-ui/UI-FIN-SIX-CONTRACTS.md) | FIN ops y DTO |
| REP | [REP v1](../../reports/REP-REPORTS-AUDIT-V1.md) | Aprobado previamente | [UI-REP](../02-ui/UI-REP-SIX-CONTRACTS.md) | REP ops y DTO |
| ADM/F14 | Config POS, roles, ADR-001 | [ADM proposal](../01-functional/ADM-POS-OPERATIONS-CONFIG.md) | [UI-ADM](../02-ui/UI-ADM-SIX-CONTRACTS.md) | ADM ops y DTO |
| POS venta F01..06, F12 | [POS F01–F14](../../pos/FLOWS-F01-F14.md), [Sale](../../pos/SALE-UX-CHECKOUT.md) | Ya definido | [UI-POS v1 propuesto](../02-ui/UI-POS-SALE-SIX-CONTRACTS.md) + [pos-proofs v0.1 históricos](../../pos-proofs/v0.1/INDEX-POS-CONTRACTS.md), UI-FIN/CAT/CLI; cotejar con repo real | Payments/Store contract, API mapping pendiente |
| PED/F08 | PED v1 | **FUERA**; previo permanece | **FUERA** | **FUERA** |
| F13/OFFLINE | F13 anterior | **FUERA** | **FUERA** | **FUERA** |

## Resultado en etapas 1-3
- Etapa 1: vacíos críticos de devolución, cliente, configuración y alcance caja/cierre/historial tienen propuesta explícita; CAT/INV/COM/REP ya estaban aprobados. Las nuevas políticas derivadas tienen estado **P**, requieren revisión del responsable antes de considerarlas nuevas decisiones A.
- Etapa 2: esquema reusable de seis contratos y nueve paquetes por dominio entregados, incluyendo Venta rápida F01–F06/F12 **en documentos**, sin componentes React creados.
- Etapa 3: schemas Zod **descriptivos**, catálogo de operaciones sin URL, adapter ports propuestos, máquinas de estado, permisos, errores y escenarios MSW **documentados**. No Zod/MSW en código.
- Etapa 4: intencionalmente **NO iniciada**. Sin tests ejecutados, no screenshots reales, no Frappe/ERPNext conectado, sin integraciones bancarias/DIAN.
- Para deuda restante: revisar estado de frontend actual `capa-2-responsive` antes de asignar files/owners a agentes; vieja rama GitHub Next.js no garantiza PrimeReact instalado.

## Puertas de revisión
1. **Negocio**: revisar exclusivamente supuestos que cambian derechos, importes, autorizaciones y excepciones. Contratos v1 previos tienen precedencia.
2. **Diseño UI**: validar composición de seis contratos y nombres de componentes contra implementación actual; no rehacer PrimeReact.
3. **Arquitectura de datos**: mapear entidades y operaciones a OpenAPI real; registrar resoluciones de nombres, revisión/idempotencia, permisos y origen del dinero/stock.
4. **Contador / asesor fiscal**: reconocer compras/gastos, notas, impuestos, garantías, reembolsos y cierre fiscal. No desplegar documentos reales hasta conformidad.
5. **QA futuro (etapa 4)**: build/lint/unit/e2e/axe/integración/cargas, evidencia por commit, sin marcar PASS documentalmente.

## Conflictos/bloqueadores prioritarios
| ID | Tema | Riesgo y salida |
|---|---|---|
| B-01 | Repo frontend vigente no comprobado | Subir/ver branch SHA real para evitar sobreescribir trabajo |
| B-02 | API real no inspeccionada | Localizar OpenAPI y mapear operaciones lógicas a existentes, registrar GAP y nuevos endpoints necesarios |
| B-03 | Persistencia de SaleDraft/PaymentSession | Posible pérdida al desmontar QuickSale; prueba específica obligatoria antes de programar pagos |
| B-04 | ERPNext Stock/POS invoicing | Probar cuándo afecta ledger/caja por apertura/cierre, no duplicar |
| B-05 | Política fiscal/consumidor de F07 | Garantía/retracto/devolución voluntaria separados y notas DIAN validadas |
| B-06 | Asignación de cobros/pagos y X/Z | No publicar doble movimiento, cierre idempotente, pendiente verificación separado |
| B-07 | Multitenancy/permisos | Probar segregación server-side y fotos/exports privadas |
| B-08 | Zod/MSW y mocks existentes | No sobreescribir handlers/fixtures de rama local sin auditoría |
| B-09 | Precio por volumen/UOM y concurrencia | Configuración determinista y precisión validada |
| B-10 | Conteo en paralelo a ventas | Corte por línea/timestamp reconciliado con movimientos |

## Instrucción de handoff para futura etapa 4
"Consulta `docs/PROJECT-STATE.md`, `docs/decisions/2026-10-12-DECISION-REGISTER.md` y `docs/contracts-v1/README.md`. Trabaja sólo después de auditar el branch frontend vigente y congelar fuentes de estado compartido. No implementes PED/F08 ni F13 OFFLINE como parte de estos contratos. Utiliza schemas y operations de etapa 3 como *candidatos*, no endpoints reales; conserva los invariantes financieros, de stock y permisos; crea pruebas por contrato."

