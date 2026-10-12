# Auditoría de contratos y madurez — ERP/POS Holamigo

**Corte:** 2026-10-12. **Ámbito:** rama feat/pos-proofs, documentación,
contratos y evidencia local disponible. **No acredita producción.**

## Resultado ejecutivo

| Indicador | Resultado | Qué mide |
|---|---:|---|
| Definición funcional | **73 %** | Actores, secuencia/estados, reglas/permisos, excepciones y aceptación de 32 flujos. |
| Preparación frontend | **38 %** | Contrato de datos, mock/adapter, pantalla, responsive/a11y y prueba prevista por flujo. |
| Implementación verificada | **20 %** | Evidencia estática y reportes previos de código/pruebas; no se ejecutaron suites en este corte documental. |
| Madurez global | **48 %** | 73 × 40 % + 38 × 35 % + 20 × 25 %, método acordado. |

**Interpretación correcta:** la definición funcional está bastante avanzada; la
preparación para construir todo el ERP/POS no está en 80 %, porque los contratos UI
detallados existen solo para Venta rápida y las 18 capacidades financieras aún no
tienen verticales UI/API cerrados. El 48 % no es preparación para producción: el
backend, DIAN, bancos, periféricos, ERPNext y validación contable/fiscal siguen
**UNVERIFIED**.

Los porcentajes conversacionales previos (75 % funcional, 80 % frontend y 35--40 %
global) no tenían un denominador ni criterios reproducibles. Esta es la primera
medición con 32 flujos y una fórmula explícita.

## Método reproducible

Cada flujo tiene cinco controles funcionales y cinco de preparación frontend.
Un control completo suma 1, uno parcial 0.5 y uno ausente/bloqueado 0.

1. **Funcional:** actor/entrada; estados y salida; reglas/permisos; excepción y
   recuperación; criterio de aceptación y fuente.
2. **Frontend:** contrato dominio/datos; adapter o fixture mock; pantalla/interacción;
   responsive/accesibilidad; caso de prueba definido.
3. **Implementación:** solo se puntúa evidencia del árbol actual o reportes de pruebas
   identificados. Un mock PASS no equivale a integración PASS.

Los agregados documentados son: POS 50/70 funcional, 35/70 frontend y 25/70 de
implementación; finanzas 67/90 funcional, 25/90 frontend y 7/90 de implementación.
El total es 117/160, 60/160 y 32/160 respectivamente.

## Inventario de flujos

### POS F01--F14

| Flujo | Estado funcional | Estado frontend/evidencia | Principal brecha |
|---|---|---|---|
| F01 Acceso | PASS | PARTIAL — mock, contrato y pruebas previas | permisos reales de servidor |
| F02 Apertura de caja | PASS | PARTIAL — registers/shifts simulados | conteo COP y efecto contable |
| F03 Turno y relevo | PASS | PARTIAL — adapter Shift y pruebas previas | custodia/condiciones en backend |
| F04 Venta rápida/catálogo | PASS | PARTIAL — UI existente | ficha dos niveles y atributos combinados |
| F05 Suspendidas/borrador | PASS | PARTIAL — fix local de persistencia pendiente de nueva corrida | pagos pendientes y reserva |
| F06 Cobro, documentos e impresión | PASS | PARTIAL — mocks y captura existentes | intento incierto, banco, fiscal e impresión real |
| F07 Devoluciones/reembolsos | PARTIAL | PARTIAL — diálogos/UI existente | efectos, límite y autorización completos |
| F08 Pedidos | BLOCKED — detalle aplazado por decisión | PARTIAL — tablero/conexión existente | ciclo y criterios definitivos |
| F09 Movimientos de caja | PARTIAL | PARTIAL — movimientos base | gastos, compras y CxP desde caja |
| F10 Control, conciliación y cierre integral | PASS | PARTIAL — conciliación UI existente | integración contable, X/Z y verificación documental en código |
| F11 Historial/reportes | PARTIAL | PARTIAL — historial/reportes existentes | búsqueda y correcciones auditables |
| F12 Autorizaciones | PASS | PARTIAL — mecanismo único y pruebas previas | verificación bancaria diferenciada |
| F13 Offline/sincronización | PARTIAL | PARTIAL — escenarios y sync locales | persistencia durable y operaciones seguras |
| F14 Configuración POS | PARTIAL | PARTIAL — administración base | cuentas, terminales, QR, impresoras y límites |

### Finanzas — CAJ-01 a CAJ-07

| Flujo | Estado funcional | Estado frontend/evidencia | Principal brecha |
|---|---|---|---|
| CAJ-01 Asignación/responsabilidad | PARTIAL | PARTIAL | modelo configurable de custodio |
| CAJ-02 Apertura/fondo | PARTIAL | PARTIAL | denominaciones, soporte y excepción |
| CAJ-03 Cobros mixtos | PASS | PARTIAL | pagos confirmados versus inciertos |
| CAJ-04 Verificación bancaria | PASS | PARTIAL | banco/canal oficial y evidencia durable |
| CAJ-05 Gastos, compras y CxP desde caja | PASS | ABSENT | vertical completo con soporte y aplicación de facturas |
| CAJ-06 Custodia/traslados | PASS | ABSENT | fondos en tránsito y doble recepción |
| CAJ-07 Arqueo/cierre | PASS | PARTIAL | conteo ciego, aprobación y no doble contabilización |

### Finanzas — TES-01 a TES-06

| Flujo | Estado funcional | Estado frontend/evidencia | Principal brecha |
|---|---|---|---|
| TES-01 Conciliación operativa | PASS | PARTIAL | estados de evidencia y resolución |
| TES-02 Conciliación bancaria | PASS | ABSENT | importación, deduplicación y matches |
| TES-03 Consignaciones internas | PASS | ABSENT | tránsito caja/caja fuerte/banco |
| TES-04 Reversiones/reembolsos | PASS | PARTIAL | idempotencia y conciliación del desembolso |
| TES-05 Cuentas por cobrar | PASS | PARTIAL | anticipos y origen real del cobro |
| TES-06 Cuentas por pagar | PASS | PARTIAL | pago multifactura, banco/proveedor y conciliación |

### Finanzas — CON-01 a CON-05

| Flujo | Estado funcional | Estado frontend/evidencia | Principal brecha |
|---|---|---|---|
| CON-01 Plan de cuentas | PARTIAL | ABSENT | contrato/configuración validada por contador |
| CON-02 Asientos automáticos | PARTIAL | ABSENT | integración ERPNext, atomicidad y no duplicados |
| CON-03 Impuestos/documentos fiscales | PARTIAL | ABSENT | DIAN/PT, reglas y contingencia reales |
| CON-04 Cierre/periodos | PARTIAL | ABSENT | periodos, ajustes y bloqueo retrospectivo |
| CON-05 Reportes/auditoría | PARTIAL | PARTIAL | fuentes contables reales y trazabilidad completa |

## Fuentes y precedencia

1. Estado maestro: docs/PROJECT-STATE.md.
2. Registro D-001…D-036: docs/decisions/2026-10-12-DECISION-REGISTER.md.
3. Mapa F01--F14 y Venta/cobro: docs/pos/.
4. F-FIN empresarial y conteo dual: docs/finance/ e docs/inventory/.
5. Código y evidencias locales: docs/architecture/TRASPASO.md.

Ante conflicto, una decisión más reciente del registro tiene prioridad funcional,
pero cualquier cambio que afecte dinero, impuestos, stock o permisos se registra
como conflicto: no se reescribe silenciosamente el comportamiento del código.

## Bloqueadores para subir la medición

1. Derivar seis contratos UI por vertical financiero e inventario, no solo por
   Venta rápida.
2. Cerrar F08 con dueño del producto.
3. Modelar estados de SaleDraft, PaymentSession, pago incierto, evidencias,
   reembolso y conciliación sin colapsarlos.
4. Acordar y validar profesionalmente plan de cuentas, reconocimiento, IVA,
   retenciones, DIAN, conservación de soportes y cierre.
5. Probar contratos contra Frappe/ERPNext, banco/datáfono, impresora, cámara y
   concurrencia antes de declarar integración o piloto.

## Estado de verificación de este corte

Se verificaron rutas, features, APIs compartidas, documentos y el historial Git de
feat/pos-proofs. El traspaso previo reporta typecheck, lint, Vitest, conformance y
Playwright en verde **sobre mocks**, pero esas suites no se repitieron después del
commit local 1ee25ac ni durante esta actualización documental. Por política, este
informe no las presenta como una nueva ejecución.
