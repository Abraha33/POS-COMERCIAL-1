# Inventario integral de flujos — corte actualizado

**Fuente canónica sincronizada:** GitHub commit 97c6a8c, rama
experiment/frappe-validation. **Ámbito:** contratos y preparación documental; no
prueba código ni integración.

## Lectura rápida

| Capa | Inventario | Estado |
|---|---:|---|
| Flujos principales | 32 | 21 con definición aprobada, 11 parciales/propuestas; F08 tiene base aprobada pero construcción aplazada |
| Subflujos aprobados | 43 | CAT 8, INV 10, COM 8, PED 8 y REP 9 |
| Subflujos propuestos | 15 | CLI 6 y ADM 9; requieren aprobación de política |
| Casos propuestos de retorno | 4 | comercial, cambio, garantía y retracto/reversión |
| Paquetes UI de seis contratos | 9 | POS, CAT, INV, COM, CLI, RET, FIN, REP y ADM |
| Paquetes excluidos de etapas 1–3 | 2 | PED/F08 y F13/Offline |

## A. Operación POS

| Flujo | Estado funcional | Preparación frontend | Estado técnico |
|---|---|---|---|
| F01 Acceso | PASS | PASS documental | Mock existente; no nueva corrida |
| F02 Apertura | PASS | PASS documental | Mock existente; contabilidad real pendiente |
| F03 Turno/relevo | PASS | PASS documental | Mock existente; custodia real pendiente |
| F04 Venta/catálogo | PASS; CAT amplía producto/precio | PASS documental | Motor de precio/API real pendiente |
| F05 Borradores | PASS | PASS documental | Persistencia local reciente; falta nueva validación |
| F06 Cobro/facturación | PASS | PASS documental | Banco, fiscal e impresión reales pendientes |
| F07 Retornos/cambios | PARTIAL; propuesta P detallada | PASS documental | Sin implementación nueva |
| F08 Pedidos | PASS funcional PED-01..08 | EXCLUIDO de etapa 1–3 | Construcción aplazada |
| F09 Movimientos caja | PARTIAL; reutiliza CAJ-05/06 | PASS documental | Operaciones/API y límites pendientes |
| F10 Cierre X/Z | PASS, D-044 y REP-01..03 | PASS documental | Sin X/Z implementado/verificado |
| F11 Historial/reportes | PASS, REP-04..09 | PASS documental | Fuentes y consultas reales pendientes |
| F12 Autorizaciones | PASS | PASS documental | Mock existente; permisos server-side pendientes |
| F13 Offline | PARTIAL | EXCLUIDO de etapa 1–3 | Política y persistencia durable pendientes |
| F14 Administración | PARTIAL; ADM-01..09 propuesta P | PASS documental | Sin contratos API/código nuevos |

## B. Dominios comerciales e inventario

| Dominio | Cobertura funcional | Preparación frontend | Límite importante |
|---|---|---|---|
| CAT productos/precios | PASS; CAT-01..08 aprobados | PASS documental | Empates de reglas, impuesto y backend por validar |
| INV inventario/zonas | PASS; INV-01..10 aprobados | PASS documental | Conteo diario no ajusta stock sin aprobación |
| COM compras/proveedores | PASS; COM-01..08 aprobados | PASS documental | Recepción, CxP y costos reales por validar |
| CLI clientes/crédito | PARTIAL; CLI-01..06 propuesta P | PASS documental | Crédito, privacidad y exposición concurrente pendientes |
| RET devoluciones | PARTIAL; cuatro tipos propuestos | PASS documental | Legal/fiscal y refund incierto pendientes |
| PED pedidos | PASS funcional; PED-01..08 aprobados | EXCLUIDO | No iniciar construcción por decisión vigente |
| REP reportes/auditoría | PASS; REP-01..09 aprobados | PASS documental | KPI/fuentes/contabilidad reales pendientes |
| ADM configuración | PARTIAL; ADM-01..09 propuesta P | PASS documental | País, fiscal, hardware y permisos reales pendientes |

## C. Finanzas

| Grupo | Estado funcional | Preparación frontend | Pendiente decisivo |
|---|---|---|---|
| CAJ-01/02 responsabilidad y apertura | PARTIAL | PASS documental | custodio, denominaciones y política por empresa |
| CAJ-03/04 cobro/evidencia | PASS | PASS documental | confirmación bancaria real |
| CAJ-05/06 salidas/custodia | PASS | PASS documental | soporte, límites y fondos en tránsito |
| CAJ-07 cierre | PASS; D-044 | PASS documental | X/Z, incidencias e integración ERPNext |
| TES-01..06 tesorería | PASS | PASS documental | extractos, banco, aplicación real y conciliación |
| CON-01..05 contabilidad | PARTIAL | PASS documental | contador, plan de cuentas, impuestos, ERPNext y período |

## D. Qué está realmente listo

- **PASS funcional aprobado:** el comportamiento está decidido y puede derivarse sin inventar negocio.
- **PASS documental frontend:** existe paquete de flujo, pantalla, plantilla, componentes,
  responsive, accesibilidad y contratos lógicos de datos/operaciones/estados.
- **PARTIAL:** hay regla importante pendiente de aprobación profesional, política de empresa
  o mapeo técnico.
- **EXCLUIDO/APLAZADO:** no se profundizó deliberadamente; no significa borrado.
- **Sin evidencia de producción:** todo banco, DIAN, ERPNext, impresora, cámara, lector,
  concurrencia real y hardware permanece UNVERIFIED.
