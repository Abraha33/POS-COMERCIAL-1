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

## Estado y preguntas bloqueantes
- ¿En qué repo/commit está la rama local actual `capa-2-responsive`? Aportar SHA o publicar branch para contrastar.
- ¿Cuál es la URL/identificador exacto de **GitHub Project Six / Project 6**? Este handoff y repositorio no acreditan pertenencia a ese tablero; asociación de Issues/PR al Project requiere acceso compatible.
- ¿Qué decisiones fiscales y contables ha firmado el contador y el proveedor tecnológico? Ninguna se puede suponer por un documento de propuesta.
- ¿Están aprobados los nombres de entidades, contratos API y umbrales? Deben validarse, no inferirse de mock.

