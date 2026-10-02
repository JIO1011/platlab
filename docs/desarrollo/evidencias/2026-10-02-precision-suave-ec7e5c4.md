# Verificación — Rediseño «precisión suave» del paso 5 (R-00/V-00, antes de cerrar G0)

Fecha: 2026-10-02 · Commit: ec7e5c4 (con cambios sin confirmar: todo el rediseño, rama `feat/precision-suave`) · Entorno: local (Docker + Supabase CLI 2.118.0, PostgreSQL 17, Auth local ES256, Chromium de Playwright)
Veredicto: **Incompleto**. No hay fallos: el recorrido de G0 sigue pasando con el nuevo diseño, axe no encuentra violaciones y el revisor final dio «ship». Faltan el CI de este commit, tus comentarios sobre la demo y `review-animations` formal.

Criterios fuente:
- Lo que pediste el 02-10-2026: usar tres imágenes de referencia para mejorar el diseño antes de seguir. Elegiste «Precisión suave», mantener el azul #1F5F96 y hacerlo ahora, antes de cerrar G0.
- La [nota de cambio del ADR 0010](../../05_decisiones.md#adr-0010) y la «Dirección visual» de [01](../../01_producto.md).
- El paso 5 del [primer incremento](../primer_incremento.md) y la verificación anterior: [paso 5](2026-10-01-paso-5-f00938c.md).

## Criterios

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Decisión registrada antes del código | ✅ | ADR 0010: nota de cambio del 02-10-2026 en `docs/05_decisiones.md`; 01 «Dirección visual» actualizada (radios 10/20/24, paneles flotantes, sin imágenes decorativas, vidrio ni gráficos) |
| 2 | Lenguaje de las referencias aplicado sin cambiar la marca | ✅ | Tokens en `packages/ui/src/styles.css`: radios, sombras en capas, escala display y métrica, lienzo con degradado; el azul de acción sigue en #1F5F96. Shell flotante (`app-shell.tsx`), Inicio en rejilla con datos reales (`home-page.tsx`), pestañas en píldora, hoja flotante en escritorio |
| 3 | Inicio con datos reales, no decorativos | ✅ | `/home` devuelve resumen y los 5 últimos movimientos en el ámbito del miembro (`reagentsHomeSummary`). Lo cubren `module-access.int.test.ts` y `reagents.int.test.ts` dentro de las 78 pruebas de integración. Las acciones rápidas respetan permiso y admisión (`?registrar=` solo abre la hoja si el tablero la habría mostrado) |
| 4 | El recorrido de G0 no se rompe | ✅ | Playwright `g0.spec.ts`: 4 pruebas, incluido «G0: 100 g, salida de 20 g y ajuste de −0,5 g dejan 79,5 g, con responsables» |
| 5 | Accesibilidad WCAG 2.2 AA | ✅ | axe (wcag2a/aa, 21a/aa, 22aa) sin violaciones en las pantallas capturadas: acceso, selector, hoja, inventario, movimientos, Inicio, Inicio de C, Inicio móvil, tablero móvil, movimientos móviles y hoja móvil |
| 6 | Móvil desde 360 px | ✅ | «en el móvil, el Inicio y el tablero se adaptan desde 360 px»: comprueba que no hay desplazamiento horizontal en Inicio ni en el tablero, que existe «Actividad reciente», que la acción rápida abre la hoja de salida y que los movimientos son una lista |
| 7 | Revisor final de impeccable | ✅ | Tres rondas: «fix», «fix» y **ship**. Se corrigieron 9 puntos materiales (cabecera de tabla, escala display, hoja flotante, barra con selector y salida, fecha en lugar del subtítulo duplicado, métricas sin teselas anidadas, fila de actividad con el responsable siempre visible, acciones del móvil sin huecos y nombres sin cortes en Movimientos). Ninguna regresión abierta |
| 8 | Detector de impeccable | ✅ | `impeccable detect --json apps/web/src packages/ui/src` → `[]` |
| 9 | DESIGN.md al día | ✅ | `DESIGN.md` y `.impeccable/design.json` reescritos por el documentador de impeccable a partir del código entregado (JSON válido). Solo enlazan a 01, 02 y al ADR 0010. Señaló dos desvíos del contrato, ya corregidos: vidrio en la barra superior (`backdrop-blur`) y un color literal en la acción rápida principal (ahora el token `on-action`) |
| 10 | `review-animations` | ⚠️ | No ejecutado: la skill solo se invoca a mano (`/review-animations`). Cambios de movimiento en esta tanda: hojas flotantes a 260/180 ms con `ease-sheet` y salidas `ease-out` |
| 11 | Reproducibilidad en CI | ⚠️ | En local ✅ (comandos 1–13). Falta el CI de este commit |
| 12 | Tus comentarios sobre la demo | ⚠️ | Pendiente: el paso 5 los exige antes de cerrar G0 |

## Comandos ejecutados

| # | Comando | Resultado | Detalle |
|---|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | exit 0 | Lockfile al día |
| 2 | `pnpm typecheck` | exit 0 | server, web, ui, contracts y modules |
| 3 | `pnpm lint` | exit 0 | Sin errores |
| 4 | `pnpm deps` | exit 0 | 98 módulos, 261 dependencias, 0 violaciones |
| 5 | `pnpm knip` | exit 0 | Sin código muerto |
| 6 | `pnpm test` | exit 0 | 29 pruebas: ui 4, modules 4, contracts 2 y server 19 |
| 7 | `pnpm db:reset` | exit 0 | Migraciones + `seed.sql` + `seeds/demo.sql` |
| 8 | `pnpm db:types` | exit 0 | Sin diferencias (sumas MD5 idénticas) |
| 9 | `pnpm test:db` | exit 0 | pgTAP: 4 archivos, 134 pruebas, PASS |
| 10 | `pnpm test:int` | exit 0 | 78 pruebas; ninguna omitida |
| 11 | `pnpm e2e` (tras `pnpm db:reset`) | exit 0 | 4 pruebas Playwright con axe; ninguna omitida |
| 12 | `pnpm --filter @platlab/web build` | exit 0 | Principal 852 kB (252 kB comprimido), tablero 98 kB, CSS 34 kB |
| 13 | Búsqueda de secretos en `apps/web/dist` | exit 0 | Sin credenciales. `sb_secret_` aparece solo como prefijo dentro de supabase-js (falso positivo ya conocido) |
| 14 | `impeccable detect --json` | exit 0 | `[]` |

## Fallos

Ninguno en la ejecución final. Durante el rediseño se corrigieron:

- **Desbordamiento horizontal del Inicio a 360 px.** La rejilla tomaba el ancho mínimo de su contenido. Se arregló con `grid-cols-1` y `min-w-0`, y ahora la prueba móvil lo comprueba.
- **Fecha con mayúsculas en cada palabra** («2 De Octubre»): la clase `capitalize` afectaba a todas las palabras. Ahora solo se pone en mayúscula la primera letra, y el saludo usa la zona horaria del espacio.
- **Responsable recortado en la fila de actividad móvil.** Se introdujo con la segunda ronda y se corrigió en la tercera: el responsable va primero y la fecha se acorta.
- **Vidrio en la barra superior y color literal en Inicio.** Los detectó el documentador: el contrato y el ADR descartan el vidrio. La barra pasa a `bg-surface` opaco y el icono, al token `on-action`. Se repitieron tipos, lint, Knip, Playwright con axe y el detector, todos en verde.

## No verificado

- **CI de este commit.** Hay que confirmar, hacer push y esperar el job `check`.
- **Tus comentarios sobre la demo.** Reconstruye antes la base con `pnpm db:reset`, porque las pruebas e2e dejan reactivos de prueba en Química. Con tu conformidad, V-00 pasa Reactivos a la etapa `pilot`.
- **`review-animations` formal**: `/review-animations` sobre `packages/ui/src` y `apps/web/src`.
- **Lo que el revisor no puntuó.** El «ship» cubre las correcciones de sus tres rondas, no toda la superficie. Faltan:
  - estados de hover, foco, carga, vacío y error;
  - el tramo de tableta (768–1023 px);
  - variantes por rol;
  - datos heterogéneos (las capturas muestran residuos de e2e, no la demo limpia).
- **Radios de 6 px fuera de la escala** (opciones del Select, Skeleton, enlace «Actualizar», selector segmentado de las hojas): ya estaban antes del rediseño; el documentador los describe y no se corrigieron.
- **Notas de acabado, no bloqueantes:**
  - A 360 px la hora se corta en la fila de actividad («1 oct, …»).
  - En escritorio quedan unos 70 px de vacío sobre las cifras del resumen.
- **Arrastrado del paso 5:**
  - el bloque principal de 252 kB comprimido (P2);
  - estados sin prueba en el navegador: error, sin permiso dentro del tablero, modo consulta, stock insuficiente y sesión expirada.
