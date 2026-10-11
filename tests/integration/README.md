# Pruebas de integración

La suite de conformidad vive en `frontend/src/conformance/` (reutiliza los contratos Zod del frontend) y se ejecuta con
`pnpm conformance` desde `frontend/`. Esta carpeta queda reservada para pruebas de extremo a extremo
frontend ↔ backend real (Playwright contra ambos) cuando el backend exista.
