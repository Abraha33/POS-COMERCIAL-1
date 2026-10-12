# Auditoría de madurez contractual — v2

**Corte:** GitHub 97c6a8c sincronizado en pos-proofs. Esta versión reemplaza la
medición documental v1 como referencia de avance.

## Métrica acordada

| Indicador | Resultado | Criterio |
|---|---:|---|
| Definición funcional | **83 %** | 32 flujos principales, decisiones A y contratos CAT/INV/COM/PED/REP; F07/CLI/ADM/F09 y F13 conservan brechas o propuesta P. |
| Preparación frontend | **75 %** | Nueve paquetes UI de seis contratos y etapa 3 declarativa para dominios incluidos; F08/PED y F13/Offline están excluidos, y todo requiere preflight contra el árbol real. |
| Implementación verificada | **20 %** | No hay código, Zod, MSW, E2E o QA nuevos en las etapas 1–3; solo cuenta evidencia mock previa documentada. |
| Madurez global | **64 %** | 83 × 40 % + 75 × 35 % + 20 × 25 %, con el peso acordado. |

## Cómo leer el 64 %

Es madurez de definición y preparación para construir, no preparación para piloto ni
producción. El aumento frente al 48 % anterior se debe únicamente a contratos
funcionales/UI/datos nuevos: no hubo construcción, prueba ni integración nueva.

Producción verificable sigue en **0 % acreditado** para banco, DIAN, ERPNext,
contabilidad, impresoras, cámaras, lectores, concurrencia real y rendimiento real.

## Brechas que impiden 100 % funcional

1. Política offline F13 por operación, almacenamiento durable y recuperación.
2. Aprobación definitiva de política F07, CLI, ADM y F09; hoy son propuestas P.
3. Umbrales por empresa, tolerancias, segregación de funciones y soportes obligatorios.
4. Plan de cuentas, reconocimiento, IVA, retenciones, documentos fiscales, período,
   conservación y responsabilidades profesionales.
5. Detalles técnicos que no decide un contrato funcional: empates de precio, extractos,
   adaptadores ERPNext, banco y periféricos.

## Brechas que impiden 100 % de preparación frontend

1. F08 y F13 quedaron expresamente fuera de las etapas 1–3.
2. Los nueve paquetes UI deben cotejarse con la versión React/Vite/PrimeReact real:
   componentes existentes, router, store, overlays y ownership.
3. Los esquemas, operaciones, estados, adapters y mocks son declarativos; aún no son
   Zod compilable, endpoints OpenAPI, handlers MSW ni fixtures.
4. Falta preflight de permisos server-side, multitenancy, límites, impuestos,
   configuración país y viabilidad ERPNext.
5. Responsive, accesibilidad, i18n y desbordes requieren evidencia de ejecución,
   no solo especificación.

## Referencias

- Inventario completo: FLOW-INVENTORY-2026-10-12-V2.md.
- Paquete de etapas 1–3: docs/contracts-v1/README.md.
- Decisiones A/P/V: docs/decisions/2026-10-12-DECISION-REGISTER.md.
- Auditoría anterior: CONTRACT-MATURITY-AUDIT-2026-10-12.md, conservada como corte histórico.
