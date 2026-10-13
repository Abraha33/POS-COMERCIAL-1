> DOCUMENTO HISTÓRICO (v0.1.0, 2026-10-12). Este contrato se conserva íntegro para trazabilidad. Sus avisos de «no subido» y «no aprobado» describen su estado al ser redactado. Para las decisiones vigentes consultar `docs/PROJECT-STATE.md` y `docs/decisions/2026-10-12-DECISION-REGISTER.md`. No asumir implementación.

# Índice y gobernanza — Contratos UI del Punto de Venta

**Paquete:** `pos-proofs` · **Versión:** 0.1.0 · **Fecha:** 2026-10-12 · **Estatus conjunto:** PROPUESTA DE CONSOLIDACIÓN, NO APROBADA NI SUBIDA AL REPOSITORIO.

## 1. Fuentes consultadas y límites de evidencia

1. Decisiones aprobadas de conversaciones del proyecto ERP/POS suministradas en esta sesión: estructura minimalista, seis capas, F01–F14, pago colombiano, gestor de pedidos/semáforo, clientes, catálogo y volumen.
2. Auditoría del 12/10/2026 copiada por el usuario: PrimeReact 10.9.9, `ScreenTemplate` y otros componentes reutilizables, 38 operaciones en `openapi.yaml`, 86 funciones reportadas, defecto P0 por desmontaje de `QuickSale`, permisos y reglas 00–07 incompletas.
3. Repositorio privado conectado `Abraha33/ERP-POS-Holamigo`, rama `experiment/frappe-validation`: código **anterior** basado en Next.js 15 y shadcn/ui. Archivos examinados: `docs/MASTER-PLAN.md`, `docs/HANDOFF.md`, `app/pos/page.tsx`, `components/pos/payment-dialog.tsx`, `components/pos/shopping-cart.tsx`, `components/pos/enhanced-product-detail-dialog.tsx`, `package.json`.

**Limitación esencial:** no se pudo inspeccionar el working tree local actual ni acreditar los nuevos `POS-SALE-*.md`, `pos-proofs`, `openapi.yaml` y reglas vigentes en ese árbol. No sustituir evidencia nueva por código antiguo. No confundir el paquete producido aquí con un commit.

## 2. Documentos entregados

| Documento | Para qué sirve | Estado |
|---|---|---|
| `POS-SALE-FLOW.md` | dominio, estados, eventos, errores, integración con F01–F14 | v0.1, validar |
| `POS-SALE-SCREEN.md` | funciones visibles, regiones, acciones y aparición | v0.1, validar |
| `POS-SALE-TEMPLATE.md` | layout, slots, propiedad de estado/archivos y overlays | v0.1, validar |
| `POS-SALE-COMPONENTS.md` | componentes funcionales, props, eventos y reutilización PrimeReact | v0.1, validar |
| `POS-SALE-RESPONSIVE.md` | desktop, tablet, móvil, overflow y pruebas | v0.1, validar |
| `POS-SALE-ACCESSIBILITY.md` | teclado, foco, ARIA, estados, contraste y pruebas | v0.1, validar |

## 3. Registro de decisiones

| Clave | Decisión | Estado |
|---|---|---|
| D01 | Venta rápida prioriza velocidad y minimalismo, sin catálogo de imágenes obligatorio | Acordada |
| D02 | Cliente por encima del carrito | Acordada |
| D03 | Catálogo con buscador, filtros, variantes y precios por volumen | Acordada |
| D04 | Carrito suspender/recuperar/reiniciar, con cobros pendientes separados | Acordada |
| D05 | Medios colombianos específicos con formularios dinámicos | Acordada |
| D06 | Crear pedido/programar entrega desde carrito + acceso a Gestión de pedidos | Acordada |
| D07 | PrimeReact como base de componentes | Acordada (versión pendiente de confirmar en árbol actual) |
| D08 | `SaleDraft` persistente en store por encima de QuickSale/PosPage | Propuesta técnica para resolver P0, debe validarse |
| D09 | Propiedad única del OverlayHost, estado y archivos compartidos | Propuesta de organización de trabajo |
| D10 | Interfaces de tipo `SaleCommands`, `PaymentAttempt`, etc. | Propuesta contractual; mapear al dominio real |
| D11 | Breakpoints <768 / 768–1199 / >=1200 | Propuesta a probar |
| D12 | WCAG 2.2 AA como meta de accesibilidad | Meta propuesta, no cumplimiento acreditado |

## 4. Bloqueadores antes de ejecutar OpenCode simultáneo

| ID | Severidad | Evidencia requerida para cierre |
|---|---|---|
| B01 | P0 | Ruta y stores del frontend Vite actual; prueba de conservación de carrito/checkout tras cambio de vista |
| B02 | P0 | Contrato vigente de pagos, estados de resultado incierto, idempotencia y verificación bancaria |
| B03 | P0 | Regla de confirmación de venta/inventario/turno en backend real o mock explícito |
| B04 | P1 | Inspección `openapi.yaml` actual y reglas 00–07 con decisiones pendientes |
| B05 | P1 | Reconciliación de componentes PrimeReact y duplicaciones de pago actuales |
| B06 | P1 | Autorizaciones dentro del POS y permisos de servidor por operación |
| B07 | P1 | Definición y pruebas de precio por volumen y UOM/variantes |
| B08 | P1 | Política validada de ventas/documentos/pagos offline |
| B09 | P1 | Aclarar creación de pedido vs venta pagada con entrega posterior |
| B10 | P1 | Verificar rutas/archivo principal y responsable único de modificación |

## 5. Secuencia segura de aprobación y paralelización

**Fase 0 — Auditoría efectiva:** abrir el working tree reciente, capturar commit SHA + fecha, verificar los seis archivos y fuentes; contrastar `openapi.yaml` y reglas; registrar decisiones discrepantes en `pos-proofs/decisions.md`.

**Fase 1 — Congelar contratos:** integrador revisa/ajusta estos seis documentos; resuelve B01/B02 y firmas de `SaleCommands`; etiqueta v1.0 `APROBADO` cuando haya evidencia y pruebas.

**Fase 2 — Trabajo separado:** un agente de dominio/estado, catálogo/precios, clientes, carrito, pagos, pedidos. Solo el integrador edita shell/router/OverlayHost y firmas congeladas. Cada tarea va en branch o worktree propio, y expone componentes según contrato. Los agentes no reescriben las mismas rutas y archivos.

**Fase 3 — Integración:** unir partes en orden dominio → catálogo/cliente → carrito → pagos → pedidos → QA. Tests de flujo, regresión, rendimiento y a11y. No declarar «listo para producción» por tests con mocks.

## 6. Reglas de documentación y control de cambios

- Fuente oficial **propuesta:** directorio `pos-proofs/` dentro del repositorio en rama de contrato aprobada; hoy el paquete solo existe como archivos descargables de esta conversación.
- Cada documento registra estado `BORRADOR`, `EN REVISIÓN`, `APROBADO`, `DEPRECADO`, versión y fecha.
- Cambios incompatibles en campos/eventos requieren nueva versión y actualización de consumidores/tests.
- Decisión nueva debe indicar si es aprobada por usuario, propuesta técnica o pendiente de evidencia.
- Prohibido declarar archivos o integración existente si no ha sido verificada.

## 7. Siguiente verificación prioritaria

**Primero revisar y resolver B01:** el problema de desmontaje de `QuickSale`. Sin contrato de dueño de estado y restauración de `PaymentSession`, cualquier implementación paralela del carrito, del cobro y de Pedidos queda expuesta a pérdida de información financiera.