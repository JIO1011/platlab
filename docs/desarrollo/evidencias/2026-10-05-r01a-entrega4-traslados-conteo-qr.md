# Verificación — R-01A, entrega 4: traslados, conteo y QR (05-10-2026)

Fecha: 2026-10-05 · Commits: `4d2c919` (traslados), `91889a6` (conteo) y el de etiquetas con QR (este informe va con él), rama `feat/precision-suave` · Entorno: local (Docker + Supabase CLI, PostgreSQL 17, Auth local ES256, Chromium de Playwright)
Veredicto: **Incompleto**. Todo lo ejecutado cumple; queda sin verificar el CI del último commit y la impresión en papel (ver «No verificado»).

Criterio fuente: [ADR 0012](../../05_decisiones.md#adr-0012), cambio del 05-10-2026 «traslados, conteo y QR», en su versión simple. Se usó codebase-memory para mapear quién llama a `applyMovement` y el patrón de `listReceiptLocations` antes de escribir.

## Criterios

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Decisiones registradas antes del código; documentos alineados | ✅ | ADR 0012; 01 §6.1 (traslado en un paso), 03 §4 (sin tablas de traslado), pendiente P-03 actualizado, DESIGN.md |
| 2 | Traslado en un paso: el frasco entero, una operación con dos asientos; vuelve a su posición de origen | ✅ | **Integración:** «el Operador traslada un frasco entero en un paso…» (ubicaciones de destino, 201, un solo lugar con saldo, −100,5 / +100,5 en una operación, vuelta a la posición original, misma ubicación 400, auditoría) |
| 3 | Sin traslado de un frasco vacío o con salidas pendientes; sin permiso, 403; otro espacio, 404 | ✅ | **Integración:** «un frasco vacío o con salidas pendientes no se traslada…» |
| 4 | Concurrencia: traslado y salida simultáneos | ✅ | **Integración:** «un traslado y una salida simultáneos…»: el frasco nunca queda con saldo en dos lugares y el saldo cuadra con lo que ganó |
| 5 | Conteo por ubicación: solo lo que no cuadra se ajusta, en una operación «Conteo», con la diferencia en SQL | ✅ | **Integración:** «los frascos que no cuadran se ajustan en una sola operación…» (−1,5 g; todo cuadra → 200 sin movimiento; dos auditorías) |
| 6 | Conteo con un saldo que cambió, bajo lo apartado, de otra ubicación, del Operador o con frascos repetidos: no escribe nada | ✅ | **Integración:** «un saldo que cambió mientras se contaba…» (el número de operaciones no cambia). **Navegador:** una salida de otra persona durante el conteo vacía el campo de ese frasco y pide volver a contarlo |
| 7 | Etiquetas con QR: elegir, imprimir solo las elegidas; el QR abre el frasco | ✅ | **Navegador:** «etiquetas con QR…» (QR con nombre accesible que codifica `/q/` + 43 caracteres, el lote en la etiqueta, 3 de 3 → 2 de 3, sin acciones de registro, vista de impresión sin menú ni casillas; el enlace sin sesión pasa por el acceso, resuelve el frasco y la ficha lo lleva a la vista y lo resalta en móvil). **Integración:** «resuelve el reactivo de un frasco del espacio…» (otro espacio 404, sin rol 403) |
| 8 | Interfaz de traslado y conteo | ✅ | **Navegador:** «traslado: un frasco entero…» (hoja, nueva ubicación en la tarjeta, dos filas «Traslado» con el filtro) y «conteo: se anota lo que hay…» (−5 mL, «Cuadra», «1 no cuadra», botón «Registrar conteo (1 ajuste)», ajuste «Conteo» en Movimientos) |
| 9 | Accesibilidad WCAG 2.2 AA | ✅ | axe sin violaciones en 17 pruebas (hojas de traslado y conteo, etiquetas y frasco desde su etiqueta en móvil) |
| 10 | Dominio por encima del estilo | ✅ | Sin UI optimista; cantidades exactas (la diferencia del conteo con `subtractDecimal` en pantalla y en `numeric` en el servidor); nada se edita: el conteo y el traslado son movimientos nuevos |
| 11 | Detector de impeccable | ✅ | `[]` |

## Comandos ejecutados

| # | Comando | Resultado | Detalle |
|---|---|---|---|
| 1 | `pnpm typecheck` · `pnpm lint` · `pnpm deps` · `pnpm knip` | exit 0 | 117 módulos, 344 dependencias, 0 violaciones; sin código muerto |
| 2 | `pnpm test` | exit 0 | 37 pruebas |
| 3 | `pnpm db:reset` · `pnpm db:types` | exit 0 | 14 migraciones + seed + demo |
| 4 | `pnpm test:db` | exit 0 | 173 pruebas pgTAP (permisos de traslado del Operador y del Administrador) |
| 5 | `pnpm test:int` | exit 0 | 102 pruebas (6 nuevas) |
| 6 | `pnpm e2e` (tras `pnpm db:reset`) | exit 0 | 17 pruebas Playwright con axe (3 nuevas) |
| 7 | CI de `4d2c919` y `91889a6` | success | GitHub Actions |

## Cambio pedido por el usuario tras la entrega

El QR debe llevar directo a la descarga del frasco. Escanear abre ahora la hoja de salida con ese frasco ya elegido («Registrar salida» o, para el Operador, «Solicitar salida»); si no se puede descargar, la ficha resalta el frasco y dice por qué. El frasco viaja en la petición, así que no depende de la primera página de frascos. **Navegador:** «etiquetas con QR…» (Administradora: «Registrar salida» con H2SO4-2026-02-01; al cerrarla, el frasco resaltado y a la vista; Operador: «Solicitar salida» con el mismo frasco). Se confirmó que el QR es uno por frasco y que el conteo se mantiene.

## Revisor de acabado

Primer pase: pidió capturas válidas (frasco escaneado sin volver arriba, vista de impresión, conteo a 360 px). Al tomarlas aparecieron tres fallos reales, corregidos:
- La ficha no llevaba el frasco escaneado a la vista: el desplazamiento corría cuando la ficha aún cargaba.
- La vista de impresión salía en blanco: la regla que oculta pesaba más que la que muestra.
- El conteo se desbordaba dentro de la hoja en el móvil: el rótulo del botón no cabía y la lista crecía con su contenido.

Segundo pase, 8 correcciones, todas aplicadas:
1. Conteo con un saldo cambiado: se vacía el campo de ese frasco y se pide volver a contarlo; reenviar lo anotado contaba dos veces el movimiento.
2. QR con enlace corto (`/q/` + 43 caracteres): módulos de unos 0,6 mm en lugar de 0,42 mm.
3. Etiqueta: siempre el lote; código, lote y caducidad primero; el reactivo en una línea.
4. Retícula de la hoja A4 adhesiva de 3 × 8 (63,5 × 33,9 mm, márgenes de `@page`) y borde de corte visible en papel.
5. El traslado lleva el frasco en la petición: ya no depende de la primera página de frascos.
6. Conteo accesible: `aria-invalid` y `aria-describedby` en cada campo; el código no se corta.
7. Título «Etiquetas» y línea reservada para «No se imprime».
8. DESIGN.md al día (QR, conteo, etiquetas).

## Dependencia nueva

`uqr` 0.1.3 (MIT, sin dependencias, 79 kB sin comprimir) para generar el QR. Se dibuja como SVG de React con `encode`, sin insertar HTML.

## No verificado

- **CI del commit de etiquetas:** se revisa tras subirlo.
- **Impresión en papel y lectura con un móvil real:** se verificó el enlace del QR y la vista de impresión en Chromium (a 1440 × 900, no en A4), no una impresora, una hoja adhesiva ni una cámara física.
- **Hojas con muchos frascos (más de 100 en la lista global):** las hojas de salida y ajuste abiertas desde un frasco todavía lo buscan en la lista ya cargada (anterior a esta entrega); el traslado lo lleva en la petición, y el conteo y las etiquetas cargan todas sus páginas.
