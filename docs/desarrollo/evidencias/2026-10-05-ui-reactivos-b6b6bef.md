# Verificación — Rediseño de la UI de Reactivos (05-10-2026)

Fecha: 2026-10-05 · Commit base: b6b6bef, con cambios sin confirmar (toda la entrega), rama `feat/precision-suave` · Entorno: local (Docker + Supabase CLI 2.118.0, PostgreSQL 17, Auth local ES256, Chromium de Playwright)
Veredicto: **Cumple** en lo ejecutado. Quedan sin verificar el CI del commit de cierre y la revisión de movimiento (ver «No verificado»).

Criterios fuente:
- [ADR 0010](../../05_decisiones.md#adr-0010), cambio del 05-10-2026 (densidad de los módulos).
- [ADR 0011](../../05_decisiones.md#adr-0011), cambio del 05-10-2026 (el espacio es quien contrata; tarjeta de la persona como selector; la institución solo si son varias).
- [ADR 0012](../../05_decisiones.md#adr-0012), cambios del 05-10-2026 (indicadores del Resumen, vencidos y por vencer a 30 días, Resumen en una ventana, ficha con más datos por frasco).

Esta entrega reúne los cambios de interfaz pedidos por el usuario después del commit `b6b6bef` (Resumen con indicadores por urgencia).

## Criterios

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Decisiones registradas en `docs/05` | ✅ | ADR 0010 (densidad, 05-10), ADR 0011 (espacio, tarjeta de la persona), ADR 0012 (Resumen, ficha). La densidad se registró después del código; se corrigió en la misma entrega |
| 2 | El Resumen cabe en una ventana en escritorio ≥ 1280 × 720 | ✅ | Medido con Playwright en 1920×1080, 1440×900, 1536×730 y 1280×720: sin desplazamiento vertical ni horizontal; banda y actividad empiezan a la misma altura. Por debajo, el contenido fluye (1366×657, 1024×768, tableta, móvil), sin desplazamiento horizontal |
| 3 | Vencidos y por vencer: fecha civil del espacio, solo frascos con saldo, dentro del ámbito | ✅ | **Integración:** «cuenta frascos con saldo vencidos y por vencer en 30 días…» (vencido, vence hoy, día 30, día 31, sin caducidad, frasco vacío y miembro con ámbito limitado) |
| 4 | Los indicadores abren la lista que los explica | ✅ | **Navegador:** «Vencidos» abre `?caducidad=vencidos` con el filtro activo y la tarjeta «1 vencido»; el total de salidas abre Movimientos filtrado |
| 5 | La API de frascos envía proveedor, lote del proveedor y fecha de ingreso | ✅ | **Integración** (96 pruebas, contrato Zod); **pgTAP:** 169 |
| 6 | La institución sale en el menú de espacios solo si son de varias, sin leer el titular jurídico | ✅ | **Integración:** «trae la institución visible…» (el nombre jurídico nunca sale); **pgTAP:** el runtime lee `institution_name` y sigue sin leer `platform.customer_accounts`; **Navegador:** Ana ve «Facultad de Ciencias · Universidad Demo» y «Centro de Investigación · Instituto Tecnológico Demo» |
| 7 | Rol real en la tarjeta de la persona | ✅ | **Integración:** `roles` en `/me` (Administrador, vacío sin rol); **Navegador:** «Administrador» y «Propietario» |
| 8 | Color solo con texto; verde, ámbar y rojo solo de estado | ✅ | Revisión de capturas; axe sin violaciones. Vencido, por vencer, FEFO, «Apartado» y «Sin existencias» llevan texto e icono |
| 9 | Accesibilidad WCAG 2.2 AA | ✅ | axe sin violaciones en las pantallas del recorrido (13 pruebas); regiones desplazables enfocables (actividad y tabla del gráfico) |
| 10 | Dominio por encima del estilo | ✅ | Sin UI optimista; sin «borrar» ni «deshacer»; «Salida» se oculta sin saldo disponible; cantidades como cadenas decimales (`formatDecimal`, aritmética exacta en la barra) |
| 11 | Detector de impeccable | ✅ | `[]` |
| 12 | DESIGN.md al día | ✅ | Resumen, tarjeta de catálogo, ficha, marca de agua, densidad y shell |
| 13 | Revisor final de impeccable | ✅ | Un pase, «fix» con 8 puntos; los 8 se aplicaron o se resolvieron (ver «Revisor de acabado») |

## Comandos ejecutados

| # | Comando | Resultado | Detalle |
|---|---|---|---|
| 1 | `pnpm typecheck` · `pnpm lint` · `pnpm deps` · `pnpm knip` | exit 0 | 114 módulos, 332 dependencias, 0 violaciones; sin código muerto |
| 2 | `pnpm test` | exit 0 | 37 pruebas: ui 10, modules 6, contracts 2 y server 19 |
| 3 | `pnpm db:reset` y `pnpm db:types` | exit 0 | 12 migraciones + seed + demo; los `*.queries.ts` regenerados quedan confirmados |
| 4 | `pnpm test:db` | exit 0 | pgTAP: 4 archivos, 169 pruebas, PASS |
| 5 | `pnpm test:int` | exit 0 | 96 pruebas; ninguna omitida |
| 6 | `pnpm e2e` (tras `pnpm db:reset`) | exit 0 | 13 pruebas Playwright con axe |
| 7 | `pnpm --filter @platlab/web build` y búsqueda de secretos en `dist` | exit 0 | 0 JWT reales y 0 claves (el patrón «eyJhbGciOi» coincide con texto de la librería de Supabase, no con una credencial) |
| 8 | `impeccable detect --json` | exit 0 | `[]` |
| 9 | Repetición tras el revisor: tipos, lint, deps, knip, detector y `pnpm e2e` | exit 0 | 13 pruebas Playwright con axe; el servidor no cambió, así que pgTAP (169) y la integración (96) del paso 4 y 5 siguen vigentes |

## Revisor de acabado

Un pase con 8 correcciones, todas atendidas:
1. La tarjeta de frasco decía «Salida» para quien solo puede pedirla: ahora dice «Solicitar salida» (como la cabecera y la hoja).
2. La etiqueta del gráfico sobresalía en los extremos: se ancla al borde en el último y el primer tramo.
3. En la actividad, un detalle largo podía comerse al responsable entre 1024 y 1280 px: el umbral de la fila ancha sube de `@xl` a `@3xl`.
4. El historial de la ficha se cortaba en 10 sin aviso: ahora enlaza a «Ver todos los movimientos».
5. Faltaba evidencia del Resumen a 1280×720 y 1280×800: medido. A 800 px el gráfico se quedaba en 74 px, así que la versión amplia pasa a desde 864 px de alto; el gráfico mide entre 89 y 174 px en todos los tamaños de escritorio medidos.
6. Textos de 11 px bajo la escala de 15 px: los de la ficha suben a 12 px.
7. Recuadro huérfano al haber apartado: los recuadros van en dos columnas y, si son impares, el último ocupa la fila.
8. El esqueleto de carga del Resumen no replicaba la estructura: ahora sí. La máscara de desvanecido de la actividad no se cambió: actúa sobre el relleno inferior y no atenúa filas.

## Incidencias durante la entrega

- **Base local vacía.** A mitad de la entrega el contenedor de PostgreSQL se reinició sin datos y PgTyped no encontraba tablas. Se reconstruyó con `pnpm db:reset`; es solo la demo local.
- **Vista previa vieja.** Una vista previa de la web en el puerto 4173, de una corrida anterior, servía la versión antigua y hacía fallar el navegador; se detuvo.
- **Pruebas ajustadas por el rediseño:** textos de la tarjeta de frasco («Apartado», «Inicial», «Venció…»), la cifra y la unidad en líneas separadas, y la posición del puntero sobre el gráfico, que ahora crece con el alto disponible.
- **Otras sesiones de Claude en el mismo directorio.** Había dos sesiones abiertas; una había dejado a medias, en `e2e/g0.spec.ts`, `format.ts` y `quantity.tsx`, la implementación de una propuesta anterior de la ficha (filas de tabla, «Usar primero», filtros por estado e historial por frasco). Como el usuario pidió después otro diseño, esas pruebas se alinearon con el vigente y se aprovecharon `relativeDays` y `unitClassName`.

## No verificado

- **CI del commit de cierre:** se revisa tras subirlo.
- **`review-animations` formal:** la entrega solo añade la elevación al pasar el puntero y la flecha de las tarjetas, con `motion-safe`, y quita la animación de marca de agua en la banda.
- **Escala en dispositivos reales:** la densidad se midió en Chromium a varios anchos, no en pantallas físicas.
- **Pendiente de R-01A:** mínimos por reactivo y estado del lote (entrega 3), traslados y conteo, y QR (entrega 4).
