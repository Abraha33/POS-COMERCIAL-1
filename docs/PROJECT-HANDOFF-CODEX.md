# Handoff de contexto para Codex, Claude y OpenCode

**Proyecto:** ERP/POS Holamigo · **Corte:** 2026-10-12 · **Ámbito:** documentación, no cambios de código.

## Instrucciones iniciales para cualquier agente
1. Leer **[PROJECT-STATE.md](PROJECT-STATE.md)** y **[Decision Register 2026-10-12](decisions/2026-10-12-DECISION-REGISTER.md)** antes de implementar.
2. Leer los contratos funcionales relevantes: [POS F01-F14](pos/FLOWS-F01-F14.md), [F04-F06 venta](pos/SALE-UX-CHECKOUT.md), [F-FIN empresa](finance/F-FIN-ENTERPRISE-V1.md), [UI](architecture/UI-CONTRACTS-AND-WORKTREES.md), [QA](qa/ACCEPTANCE-2026-10-12.md).
3. Los siete contratos en `docs/pos-proofs/v0.1` son **archivos históricos íntegros**; conservarlos, pero aplicar decisiones más recientes del registro. No asumir que su texto de 'no subido' sigue siendo estado actual.
4. Examinar el **branch, commit y working tree que realmente está usando el usuario**; el repositorio GitHub consultado en `experiment/frappe-validation` conserva una implementación antigua Next.js/shadcn. No modificarla como si fuera el frontend Vite/PrimeReact actual.
5. Localizar `openapi.yaml`, las reglas 00–07, `pos-proofs`, `QuickSale`, `PosPage`, stores y componentes de PrimeReact; registrar evidencia SHA/path/test. **No afirmar su existencia** hasta encontrarlos.
6. Respetar arquitectura de perfiles componibles del [ADR-001](ADR-001-COMPOSABLE-PROFILES.md) y roadmap validación [MASTER-PLAN](MASTER-PLAN.md).
7. Separar aprobado/propuesto/pendiente en cada PR/issue, y citar IDs D-001...D-036 afectados.
8. Dar prioridad a persistencia de carrito/checkout, cobros/idempotencia, permisos, stock, fiscal y contabilidad antes de integraciones reales.
9. Si falta backend o permiso, crear mock marcado con contrato y tests; no simular pagos bancarios 'confirmados' ni DIAN 'aceptada' como dato real.
10. Antes de editar archivos compartidos, confirmar integrador/propietario exclusivo y trabajar en branch/worktree separado.

## Decisiones que deben prevalecer sobre reportes viejos
- Financiero: **estándar empresarial**, no simplificado.
- Catálogo: resumen + ficha detallada y hallazgo mediante texto/marca/categoría/atributos.
- Transferencia: evidencia fotográfica **múltiple** con revisión y envío; verificador es usuario autorizado desde Holamigo en móvil y canal bancario oficial.
- Datáfono: timeout/UNKNOWN no permite doble cobro; recuperación de UI preserva estado real.
- Emisión/entrega electrónica/impresión física con estados diferentes.
- Caja: responsable configurable; puede pagar gastos/compra/abonos de proveedores con permiso.
- Pedidos F08: profundización **aplazada**; conservar interfaz de acceso y entrega programada sin inventar estados definitivos.
- Inventarios: ayudante cuenta; cajero registra; supervisor aprueba ajuste; conteo no muta automáticamente.
- Proyecto: microapps PIM+DAM/Radar separadas, limpieza como servicio aparte.

## Método de implementación recomendado
**Vertical slice** con 3 revisiones por usuario: (1) flujo, (2) decisiones de negocio críticas, (3) UX; el arquitecto deriva seis contratos y matrices, OpenCode implementa, Claude audita. Dejar funcionando un flujo con pruebas antes de multiplicar pantallas. No generar UI para 73 páginas de una vez.

## Proceso de actualización de fuente oficial
1. Editar registro D-###: hecho aprobado, propuesta, revocación o conflicto.
2. Ajustar documento de flujo específico y casos de aceptación.
3. Actualizar contratos de APIs/UI y pruebas cuando el código lo avale.
4. Escribir PR con branch/commit, archivos, tests y riesgos.
5. No reescribir documentos históricos para hacer parecer que siempre incorporaban la nueva decisión.

## Ampliación aprobada tras consolidación inicial — grupos 3, 4, 5, 7 y 8

Aprobación expresa del usuario para contratos de dominio: [CAT v1](catalog/CAT-PRODUCTS-PRICING-V1.md), [INV v1](inventory/INV-ZONES-CYCLE-STOCK-V1.md), [COM v1](purchasing/COM-PURCHASING-SUPPLIERS-V1.md), [PED v1](orders/PED-ORDERS-FULFILLMENT-V1.md), [REP v1](reports/REP-REPORTS-AUDIT-V1.md).

Nuevas decisiones [D-037..D-044](decisions/2026-10-12-DECISION-REGISTER.md) **prevalecen** sobre propuestas previas:
- **INV:** programa diario de conteos por zonas, urgencia rojo/amarillo/verde/gris separada de estado; ayudante cuenta, cajero registra, supervisor aprueba; considerar movimientos concurrentes.
- **CAT:** catálogo maestro único, precio determinista con precedencia y no acumular descuentos automáticamente.
- **COM:** compra rápida o controlada, recepción aceptada define entrada de inventario, pagos vía CAJ/TES.
- **PED:** base funcional aprobada, pero **F08 sigue aplazado para implementación**; prioridad configurable con fecha prometida/riesgo como default actual y pago/antigüedad después.
- **REP:** X provisional y Z definitivo integran facturas crédito, cobros antiguos, gastos, proveedores y movimientos; Z no sustituye DIAN.

No interpretar esta aprobación de negocio como endpoints, UI implementada ni evidencia de tests pasados.

## Handoff de especificaciones documentales etapas 1–3, sin F08/F13

Por encargo del usuario se añadió [`docs/contracts-v1/README.md`](contracts-v1/README.md). Leer sus etapas en orden: propuestas F07/CLI/ADM/F09–F11, nueve paquetes UI con las seis secciones y operaciones/esquemas/estados/mocks declarativos. Los nombres de operaciones son **lógicos**, NO endpoints publicados. Las decisiones previas A prevalecen sobre nuevas propuestas P D-047..D-052.

**NO iniciar etapa 4 por este encargo.** No crear React/TS, MSW, Zod, APIs, scripts ni pruebas ahora. **NO ampliar F08 Pedidos ni F13 Offline**. Registrar los vacíos de OpenAPI/branch frontend real como bloqueadores pendientes, no llenarlos fingiendo implementación.

El próximo agente que vaya a construir deberá antes (1) auditar el repo/commit vigente de Vite/PrimeReact, (2) cotejar las 8 composiciones UI con componentes existentes, (3) mapear las operaciones lógicas a API real, (4) confirmar política de caja/stock/retornos con profesionales aplicables, (5) asignar worktrees exclusivos y tests.

## Estado y preguntas bloqueantes
- ¿En qué repo/commit está la rama local actual `capa-2-responsive`? Aportar SHA o publicar branch para contrastar.
- ¿Cuál es la URL/identificador exacto de **GitHub Project Six / Project 6**? Este handoff y repositorio no acreditan pertenencia a ese tablero; asociación de Issues/PR al Project requiere acceso compatible.
- ¿Qué decisiones fiscales y contables ha firmado el contador y el proveedor tecnológico? Ninguna se puede suponer por un documento de propuesta.
- ¿Están aprobados los nombres de entidades, contratos API y umbrales? Deben validarse, no inferirse de mock.


## F08 posterior — documentación separada de Pedidos (2026-10-12)

El usuario autorizó continuar F08 **hasta documentación de etapas 1/2/3, sin código ni etapa 4**. Leer [F08 índice de cuatro documentos](orders/F08-STAGES-1-3-INDEX.md) DESPUÉS de los contratos generales. D-053..D-059 precisan que la prohibición histórica de profundizar F08 aplicaba **solo al encargo anterior**; F13 Offline permanece separado.

No asignar permisos de compra/dinero por nombre de cargo: la autoridad depende de persona, acción, ámbito, fecha y, cuando aplique, un pedido y monto. Marcar faltante de un toque nunca debe forzar requisiciones; el sourcing/adquisición reusa COM + CAJ/TES y microapp Radar opcional. Fondos adelantados siguen auditados al cambiar proveedor. Verificación de cantidades/variante obligatoria para marcar pedido completo. Nuevos DTOs/operaciones de F08 son contratos **candidatos**, no APIs comprobadas.


## F13 documentado — paquete autónomo etapas 1–3 (2026-10-12)

El usuario solicitó dejar por escrito la propuesta de offline seguro. Leer [F13 Índice](offline/F13-STAGES-1-3-INDEX.md) y los cuatro archivos asociados. **No iniciar etapa 4** por este encargo.

Prioridad: cache catálogo/borradores, picking F08 ya asignado, conteo físico; efectivo solo provisional CONDICIONAL y apagado por defecto; medios electrónicos, crédito, fiscales, reembolso, stock oficial y cierre Z sin confirmación offline. Persona autorizada y servidor autoridad; local `saved_local` jamás = `confirmed`. Outbox dedupe server-side, ACK por evento, query UNKNOWN, datos por tenant/device, garantía navegador **no asumida**. Frontend real y políticas legales/contables/security necesitan auditoría antes de código. Registro D-060..D-065.
