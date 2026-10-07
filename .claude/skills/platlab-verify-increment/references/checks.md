# Comprobaciones en orden

Los comandos concretos se toman de `CLAUDE.md` y `package.json`; esta lista dice **qué** verificar y **por qué**, no cómo se llama cada script. Omite las que la entrega todavía no tenga y márcalas «no aplica» con motivo.

| # | Comprobación | Qué demuestra | Cuidado con |
|---|---|---|---|
| 1 | Instalación reproducible (lockfile congelado) | Que el resultado no depende de versiones sueltas | Instalar sin lockfile invalida todo lo demás |
| 2 | Tipos (TypeScript estricto) | Contratos coherentes entre paquetes | — |
| 3 | Lint | Estilo y reglas estáticas | — |
| 4 | Fronteras con dependency-cruiser | Sin ciclos; módulos solo por interfaz pública; `domain` sin HTTP/infraestructura; frontends sin servidor; `web` sin `console` | Reglas desactivadas o en modo advertencia no cuentan como verificación |
| 5 | Código muerto con Knip | Sin archivos, exportaciones ni dependencias huérfanas | Un `ignore` nuevo en `knip.json` sin motivo oculta el hallazgo |
| 6 | Base local desde cero + todas las migraciones | Que el esquema se reconstruye solo con migraciones | Usar una base ya existente oculta migraciones rotas |
| 7 | Generación de PgTyped sin diferencias | Tipos alineados con el esquema real; `numeric` como cadena | Un diff en los tipos generados es fallo |
| 8 | pgTAP (`supabase test db`) | RLS, FKs compuestas, privilegios, estados, ledger | Deben correr bajo los roles reales de API/worker, no solo como dueño de tablas |
| 9 | Pruebas de integración API | JWT → membresía → admisión de dos ejes → permiso → operación; errores tipados; rutas por módulo | Denegaciones que revelen si un recurso existe en otro espacio |
| 10 | Pruebas de concurrencia (conexiones reales) | Dos salidas de 60 g sobre 100 g; movimiento contra desactivación simultánea; duplicados idempotentes; pool sin fuga de contexto | Mocks o una sola conexión no demuestran nada aquí |
| 11 | Playwright (un flujo por incremento) | Que la interfaz permite completar y entender el recorrido | Captura el resultado final, no solo que la página carga |
| 12 | Compilación de apps y búsqueda de secretos en bundles | Que se puede desplegar sin filtrar credenciales | Variables `VITE_*` con secretos |
| 13 | Revisión de UI (solo si cambian `apps/web`, `apps/console` o `packages/ui`) | Por entrega: capturas de escritorio y móvil, `impeccable-finish-reviewer` en `ship` y axe sin violaciones WCAG 2.2 AA en el flujo de Playwright. Por puerta (G0, G1…), además: `impeccable audit` sin hallazgos P0/P1 y `review-animations` aprobado | Una revisión que nadie ejecutó no cuenta: debe quedar anotada en el Registro |

## Evidencia de G0 (primer tramo de Reactivos)

Criterios en `docs/desarrollo/primer_incremento.md` → «Evidencia para cerrar G0»:

- Recorrido visible (100 g, 20 g, −0,5 g).
- Aislamiento A/B.
- Roles.
- Módulos y admisión, incluido C sin Reactivos.
- Concurrencia.
- Idempotencia.
- Rollback.
- Pool y RLS.
- Reproducibilidad.

Cada uno debe quedar enlazado a una prueba con nombre en «Puertas» de `docs/desarrollo/evidencias/README.md`.
