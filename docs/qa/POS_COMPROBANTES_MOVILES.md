# Captura móvil de comprobantes vinculada al cobro (PROPUESTA)

Rama `feat/pos-proofs`. Etapa 1: **QR + adjuntar en el computador**. La etapa 2 (notificaciones Web Push) no se construyó.

## Flujo
Carrito → **Documento** (selección) → **Medio/canal** → **Comprobante** (QR o archivo) → **Verificar** → Confirmar venta.
Efectivo, datáfono, mixto y crédito no fuerzan fotografía.

## Estados del comprobante
`Esperando comprobante → Comprobante recibido → Verificando → Pago confirmado | Rechazado / No coincide`.
Rechazado vuelve a aceptar evidencia (cuenta el intento). Una foto **nunca** confirma el pago.

## Reglas implementadas (`features/pos/proofs/proofs.ts`, puras y probadas)
- Confirmar exige evidencia y responsable; rechazar exige motivo.
- "Confirmar pago" de la venta queda **deshabilitado** salvo pago confirmado o **excepción autorizada** (solo propietario/administrador, con motivo, trazable).
- El enlace/QR vence a los 15 min, está atado a la operación (`clientOperationId`), canal y monto; no sirve para otra venta.
- Una solicitud viva por operación+canal+monto (idempotente).
- Imagen JPG/PNG/WEBP ≤ 3 MB; el cliente reduce a 1280 px JPEG antes de enviar.
- La página del teléfono (`/captura/:token`) no tiene sesión ni menú y solo recibe monto, canal, cuenta destino, empleado y estado.
- Emisión fiscal ≠ confirmación del pago: el documento es una **selección**; en crédito el aviso lo dice.

## Cómo funciona entre dispositivos (simulación)
El estado compartido lo sirve un middleware de Vite en `/dev-relay/proofs` (`relay.ts`, **no es un endpoint del contrato**),
porque MSW vive por pestaña. Con `pnpm dev` el teléfono y el computador comparten estado en la LAN.
Probar: `DEV_PORT=5192 pnpm dev` → en el POS, Transferencia → Cobrar → escanear el QR con el teléfono
(`http://<IP-LAN>:5192/captura/<token>`).

## Contrato propuesto
**Ya añadido a `openapi.yaml` v0.6.0 (PROPUESTA):** `Payment.channel/reference/destination/proofId`, `SaleCreate.creditTermDays`
y el error `REFERENCE_DUPLICATED`. **Aún no añadido:** los endpoints de comprobantes de abajo (viven en el simulador).
| Operación | Notas |
|---|---|
| `POST /pos/payment-proofs` | crea la solicitud; devuelve `id`, `token`, `expiresAt` |
| `GET /pos/payment-proofs/{id}` | estado, evidencia, historial (cajero) |
| `GET/POST /pos/payment-proofs/capture/{token}` | público por token; solo evidencia, sin sesión |
| `POST /pos/payment-proofs/{id}/decision` | `verify` / `confirm` / `reject` / `exception` con actor y motivo |
| `Payment` | agregar `channel`, `reference`, `proofId` opcionales |
| Errores | `REFERENCE_DUPLICATED` 409, `PROOF_EXPIRED` 410, `PROOF_NOT_CONFIRMED` 409 en `SaleCreate` |
El servidor debe: validar el token, firmar la URL de la imagen, guardar la evidencia fuera del navegador, y rechazar
`SaleCreate` con pago digital sin `proofId` confirmado o excepción.

## No verificado / pendiente
- Backend real, almacenamiento de imágenes, antivirus/EXIF, retención y privacidad de los comprobantes.
- Cámara en dispositivos reales (probado con carga de archivo); permisos del navegador; HTTPS (en `http://<IP>` la cámara
  nativa por `capture` funciona como selector de archivos, pero `getUserMedia` no).
- Notificaciones Web Push (etapa 2) y registro de teléfonos de empleados.
- Verificación contra el banco (hoy es humana); conciliación de cuentas.
- La excepción usa el rol, no un PIN de supervisor.
