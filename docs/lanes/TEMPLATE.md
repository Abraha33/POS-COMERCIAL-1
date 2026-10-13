# Hoja de carril: <nombre>

> Copia este archivo a `docs/lanes/<carril>.md`. Una página. Si no cabe, el carril es demasiado grande.

## Objetivo
<Una frase: qué puede hacer el usuario cuando este carril termina.>

## Fuente de verdad
- Reglas aprobadas: <D-### / BR-### / docs/...>
- Contrato: <operaciones de `contracts/openapi.yaml`, con su `x-approval`>
- Hooks de datos: <`shared/api/...`>

## Posees (de `lanes.json`)
<Lista exacta de rutas.>

## No tocas
`contracts/`, `frontend/src/shared/`, `frontend/src/routes/`, seed y handlers comunes, otros carriles.
Si necesitas algo: `docs/qa/requests/lane-<carril>.md`.

## Entorno
`pnpm lane:new <carril>` · `DEV_PORT=<puerto> pnpm dev`

## Definición de terminado
- Pantalla real, ejecutada en navegador, a 1366 / 768 / 375 px.
- Estados de carga, vacío y error útiles. Permisos aplicados.
- Teclado completo, objetivos ≥ 44 px, axe sin críticas.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm lane:check` en verde.
- Informe: qué NO se verificó (backend real, DIAN, banco, hardware).

## Bloqueos conocidos
<Contratos `proposed`, decisiones pendientes.>
