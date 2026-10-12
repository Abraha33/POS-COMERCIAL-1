# Contratos de interfaz — índice

**Estado:** v0.2 · 2026-10-12 · contrato UI derivado de la consolidación funcional vigente.

Estos documentos complementan, pero no reemplazan, `contracts/openapi.yaml` ni los esquemas Zod. OpenAPI define datos y operaciones; estos contratos definen la composición, el comportamiento y la calidad de la interfaz.

## Fuente de verdad y estados

1. [Estado maestro](../PROJECT-STATE.md) y [registro de decisiones](../decisions/2026-10-12-DECISION-REGISTER.md).
2. Contratos funcionales del flujo: `docs/pos/`, `docs/finance/` e `docs/inventory/`.
3. Reglas heredadas aprobadas: `docs/business-rules/`, salvo un conflicto posterior registrado.
4. Datos, permisos, errores y operaciones implementados: `contracts/openapi.yaml` y Zod.
5. Composición y experiencia: este directorio.

Un requisito puede marcarse como `APPROVED`, `PROPOSED`, `SIMULATED` o `UNVERIFIED`. `SIMULATED` y `PROPOSED` nunca se presentan como integración productiva.

## Paquete inicial POS

| Documento | Define |
|---|---|
| [POS-SALE-FLOW.md](POS-SALE-FLOW.md) | Secuencia de apertura, venta, cobro, comprobante, pedido y postventa. |
| [POS-SALE-SCREEN.md](POS-SALE-SCREEN.md) | Funciones, permisos, estados y criterios de aceptación de Venta rápida. |
| [POS-SALE-TEMPLATE.md](POS-SALE-TEMPLATE.md) | Regiones, cardinalidad visual y composición de la plantilla POS. |
| [POS-SALE-COMPONENTS.md](POS-SALE-COMPONENTS.md) | Componentes reutilizables y sus contratos. |
| [POS-SALE-RESPONSIVE.md](POS-SALE-RESPONSIVE.md) | Transformación de la misma pantalla en desktop, tablet y teléfono. |
| [POS-SALE-ACCESSIBILITY.md](POS-SALE-ACCESSIBILITY.md) | Teclado, foco, etiquetas, contraste y estados anunciables. |

## Paquete financiero

| Documento | Define |
|---|---|
| [FINANCE-FLOW.md](FINANCE-FLOW.md) | Invariantes, estados y verticales CAJ, TES y CON. |
| [FINANCE-SCREEN.md](FINANCE-SCREEN.md) | Superficies, regiones, permisos y estados de pantalla. |
| [FINANCE-TEMPLATE.md](FINANCE-TEMPLATE.md) | Consolas, wizard, listas, conteos e incidencias. |
| [FINANCE-COMPONENTS.md](FINANCE-COMPONENTS.md) | Entradas, eventos y restricciones de componentes financieros. |
| [FINANCE-RESPONSIVE.md](FINANCE-RESPONSIVE.md) | Transformación 1366, 768 y 375 px. |
| [FINANCE-ACCESSIBILITY.md](FINANCE-ACCESSIBILITY.md) | Teclado, foco, anuncios y lectura de dinero/estados. |

## Regla de implementación

`contrato de dominio → adapter API → contrato UI → componente → plantilla → pantalla → flow → pruebas`.

Los roles no crean pantallas distintas: el propietario es el superset de permisos. Los dispositivos tampoco crean flows distintos: son variantes responsive de la misma pantalla.

## Cobertura por dominio

Los contratos funcionales ya inventarían 32 flujos: F01--F14, CAJ-01--CAJ-07,
TES-01--TES-06 y CON-01--CON-05. Los seis contratos UI de este directorio siguen
siendo el paquete detallado de Venta rápida; los restantes dominios deben derivar
sus seis capas antes de implementarse en paralelo.

| Dominio | Fuente funcional | Estado de contrato UI |
|---|---|---|
| Venta, catálogo, cliente y cobro | `docs/pos/` | Base v0.1 presente; requiere reconciliación con decisiones D-001…D-036. |
| Caja, tesorería y contabilidad | `docs/finance/F-FIN-ENTERPRISE-V1.md` | Paquete base presente; cada vertical sigue pendiente de adapter/API y pruebas. |
| Inventario y conteos | `docs/inventory/COUNT-DUAL-ROLE.md` | Pendiente de derivar por vertical. |
| Compras, cartera, reportes y administración | `docs/finance/` + `docs/business-rules/` | Pendiente de derivar por vertical. |
