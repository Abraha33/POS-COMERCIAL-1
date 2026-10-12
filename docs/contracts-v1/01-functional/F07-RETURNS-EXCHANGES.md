# F07 — Devoluciones, cambios, garantías y reembolsos

**Etapa 1: propuesta funcional cerrada para derivar contratos.** Usuario autorizó elaborar hasta etapa 3; no se presume aprobación legal ni implementación. **Alcance:** POS F07 + TES-04 + INV-07/08 + CON-03 + REP-04/08. **Autoridad:** venta/documento original, ledger inventario y sistema fiscal; pantalla no registra efectos por su cuenta.

## Tipos de caso (no fusionar)
1. **Devolución comercial total o parcial:** retorno físico con venta identificada; política voluntaria por empresa/producto/canal; puede producir reembolso o saldo a favor.
2. **Cambio por otro SKU, variante o presentación:** registrar devolución de artículo original + nueva línea/transacción del reemplazo y diferencia neta a cobrar/devolver; no reemplazar silenciosamente el SKU de la venta histórica.
3. **Garantía legal / reclamación por defecto:** expediente separado con inspección, solución y plazos normativos aplicables; la política comercial de siete días NO restringe derechos legales.
4. **Retracto/reversión de pago, cuando legalmente proceda:** caso y fundamento independientes de la devolución voluntaria; validación fiscal/jurídica por canal, causal y jurisdicción.
5. **Corrección documental sin mercancía física:** ajustar factura/precio/impuesto según procedimiento fiscal, no registrar recepción inventada.
6. **Reembolso diferido o saldo a favor:** obligación separada del estado físico y de la nota fiscal; su liquidación puede quedar pendiente.

## Políticas parametrizables
- Ventana comercial de cambio/devolución por empresa/categoría/SKU/canal. Plantilla inicial opcional: **7 días para política voluntaria**, sin afectar garantía/retracto legales; no fijarla como norma general.
- Producto identificable, comprobante digital suficiente, inspección según riesgo (abierto/dañado, contacto alimentos, lote/vencimiento), excepciones por supervisor.
- Reembolsos/cambios **solo ejecutados por usuario autorizado**; cajero ordinario puede localizar venta y solicitar revisión.
- El medio de reembolso depende del pago real, reglas bancarias y derecho aplicable; reembolso efectivo de venta pagada con tarjeta NO por defecto: autorización/justificación y control antifraude.
- Parcial admite cantidad menor o igual al remanente retornable por línea; descuentos distribuidos e impuestos se derivan de la **venta original** y del documento fiscal/ajuste autorizado; no recalcular arbitrariamente con precios actuales.
- Un reembolso monetario, recepción física y nota fiscal son **tres eventos independientes**. Un paso puede terminar pendiente sin declarar los demás concluidos.
- Devolución a disponible SOLO tras inspección elegible; destinos: disponible, cuarentena, proveedor, merma, ninguna entrada física (ajuste monetario).
- Incidencias conservan actor, motivo, fotos opcionales/evidencia requerida por política, fecha y relación con original; correcciones append-only.

## Flujo con roles, estados y recuperación
1. Cajero/supervisor busca venta por factura/ID/cliente y consulta vendedor, impuestos, medios de pago, cantidades originalmente vendidas y ya retornadas. **Excepción:** venta externa/no localizada → expediente manual autorizado, no ingreso automático.
2. Selecciona causal y líneas/cantidades → motor de políticas evalúa ventana, derechos legales, historial, cantidades y restricciones. **Excepción:** no elegible → negar vía comercial o derivar a garantía/legal, sin extinguir derechos.
3. Registra inspección de mercancía y destino (por línea); artículo inexistente no crea stock positivo. Supervisor puede solicitar reconteo/calidad.
4. Calcula efectos estimados (importe, impuesto, abono a crédito, diferenciales en cambio); revela autorización requerida. **No confirmar** antes de obtener autorización válida.
5. Confirma caso con ID y revisión; sistema crea comandos separados: ajuste comercial/fiscal, inventario, crédito/deuda y reembolso; dependencias/compensación explícitas.
6. Si cambio: seleccionar nuevo SKU/UOM/precio válido, crear nueva transacción vinculada; cobrar diferencia vía F06 o tramitar reembolso/saldo a favor vía TES-04; impedir doble venta.
7. Verifica resultado de proveedor de pago y PT/DIAN; si timeout en reembolso → UNKNOWN, consultar antes de reintentar.
8. Emite comprobantes y registra entrega/impresión separadas. Cierra expediente solo cuando todos los efectos exigibles están resueltos o formalmente pendientes de seguimiento.

## Matriz de efectos
| Situación | Stock | Financiero | Fiscal | Resultado |
|---|---|---|---|---|
| Devolución parcial de artículo vendible | Entrada según inspección | Devolver importe o bajar CxC / generar saldo | Documento de ajuste aplicable | Caso vinculado a factura |
| Devolución dañada | Cuarentena/merma, nunca disponible automática | Reembolso según causal y derecho | Ajuste aplicable | Evidencia calidad |
| Cambio SKU | Retorno SKU antiguo + salida SKU nuevo | Diferencia cobrada/reembolsada | Ajustes/documentos según operación | Dos líneas originales rastreables |
| Garantía sin reemplazo inmediato | Cuarentena o sin movimiento según entrega | Obligación/decisión aún pendiente | Según momento y solución | Expediente abierto |
| Corrección de precio sin retorno | Sin movimiento | Ajuste saldo/cobro | Nota fiscal válida | Sin ficción de stock |
| Cliente pagó a crédito | Stock según recepción | Disminuye deuda; reembolso efectivo solo por excedente real/política | Ajuste aplicable | No inventa efectivo ingresado |

## Casos de aceptación
- Venta 10 unidades; ya retornó 3; nueva solicitud por 8 → máximo 7, bloqueo y explicación.
- Cambio presentación con UOM y descuento original: devolución y nuevo artículo generan importes consistentes, sin reescribir venta histórica.
- Mercancía abierta o de riesgo → cuarentena salvo inspección/aprobación; no aumenta disponible.
- Venta parcialmente pagada a crédito → ajuste reduce CxC, sin reembolso de dinero que nunca entró.
- Reembolso tarjeta UNKNOWN tras timeout → no emitir segundo reembolso por reintento.
- Nota fiscal rechazada queda incidente vinculado, no se marca caso totalmente fiscalizado.
- Cajero sin permiso puede solicitar, pero no ejecutar ni autoaprobar.
- Derecho legal vigente no puede ser denegado por plantilla comercial de 7 días.

## Validación externa pendiente
SIC/garantía/retracto/reversión y protección del consumidor por canal y jurisdicción; DIAN (notas y documentos equivalentes), retenciones y valoración de inventario; refund del proveedor bancario. Los nombres de API/estados se concretan en etapa 3, no son prueba de integración.

