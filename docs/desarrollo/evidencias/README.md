# Evidencias

Una fila por verificación ejecutada con la skill `platlab-verify-increment`, la más reciente arriba. Solo cuenta lo ejecutado: lo documentado no es evidencia. Los informes completos hasta el 06-10-2026 siguen en git: `git ls-tree --name-only 6d6bf34 docs/desarrollo/evidencias/` y `git show 6d6bf34:docs/desarrollo/evidencias/<archivo>`.

## Pendiente de verificar
- **R-01A** · `impeccable audit` y `review-animations` formales, nunca ejecutados → ejecutarlos sobre `apps/web/src` y `packages/ui/src`. Deben cubrir también lo suelto de entregas anteriores: hover y foco, contraste del encabezado de la ficha, falta «Saltar al contenido», botones `sm` de 32 px en el móvil, radios de 6 px fuera de la escala, rótulos de las hojas de ingreso y nuevo reactivo, y capturas móviles nunca tomadas (día fijo de Movimientos, hoja de mínimo, selector de módulos, icono «gas», saldo largo)
- **R-01A** · QR solo probado en Chromium; densidad medida solo en Chromium → imprimir una hoja adhesiva A4 de 3 × 8 y escanear con Android e iOS
- **R-01A** · ámbito por ubicación (`location_id`) sigue en el código y en una prueba → retirarlo en una entrega aparte (docs/05, Pendientes)
- **R-01A** · la hoja de ajuste abierta desde un frasco lo busca en la primera página de frascos → llevar el frasco en la petición, como salida y traslado
- **Rendimiento** · bloque principal > 500 kB (P2 desde el paso 5) → dividir por rutas antes del piloto
- **Cabecera de los módulos** · «Actualizado… Actualizar» queda entre el título y la identidad de la ficha; las acciones ocupan mucho alto en el móvil → rediseñarla en una entrega aparte
- **T-02/T-03** · movimiento concurrente del árbol de ubicaciones sin prueba → dos conexiones que muevan A bajo B y B bajo A, cuando exista el comando de mover ubicaciones
- **DP-01** · retención de `platform.idempotency_records` y disposición de las revisiones aplicadas, que son inmutables (revisar) → decidir y probar en DP-01

## Puertas
### G0 de Reactivos (V-00) · Cumple · `3ed6429`
- Recorrido visible → e2e «G0: 100 g, salida de 20 g y ajuste de −0,5 g dejan 79,5 g, con responsables»
- Aislamiento A/B → int «un miembro de A no consulta ni usa Reactivos de B», «pertenecer a ambos no permite usar un lote, una ubicación o una posición de B…»; pgTAP bajo `platlab_api`
- Roles → int «el Operador registra ingresos y salidas, pero no productos, lotes ni ajustes», «la revocación de la membresía se aplica en la siguiente petición»; e2e «la propietaria opera como Administradora sin rol asignado» (ADR 0011)
- Módulos y admisión → int «C recibe «módulo no disponible»…», «admite solo lo que ambos ejes permiten, en todas las combinaciones», «un ítem de otro tipo no se lista ni se opera…», «una salida lanzada a la vez que la desactivación del módulo no queda confirmada después»
- Concurrencia → int «dos salidas de 60 g sobre 100 g…»
- Idempotencia → int «repetir un ingreso con la misma clave no añade asientos ni auditoría; con otra cantidad se rechaza», «duplicados simultáneos con la misma clave producen un solo movimiento»
- Rollback → int «un fallo provocado antes del commit no deja movimiento, auditoría de éxito ni saldo parcial»
- Pool y RLS → int «la conexión reutilizada no transfiere el contexto de A a la petición de B»; pgTAP bajo `platlab_api`
- Reproducibilidad → CI run 37023754189: base desde cero, PgTyped sin diferencias, pgTAP, int y e2e con axe
### R-01A · Incompleto · `f272cad`
- Frascos con código y QR → int «dos ingresos simultáneos al mismo lote reciben números de frasco distintos»; e2e «etiquetas con QR: se eligen e imprimen, y el enlace del QR abre el frasco aun sin sesión»
- Ficha en dos niveles → e2e «G0: 100 g…» y «ficha con varios frascos: sin existencias, FEFO preseleccionado, aviso de vencido y ajuste»
- Salida con atajos, FEFO y advertencia de vencido → e2e «ficha con varios frascos…», «solicitudes de salida…»; unit «percentOfDecimal y subtractDecimal»
- Motivos y destinos → int «el Administrador los administra, el Operador los consulta, y archivar los quita sin borrarlos»
- Salidas del Operador con aprobación y reserva → int «R-01A · salidas con aprobación y reserva» (8 casos); e2e «solicitudes de salida: aviso en el Resumen, rechazo con motivo y cancelación»
- Caducidad y mínimos → int «cuenta frascos con saldo vencidos y por vencer en 30 días…», «el mínimo lo fija el Administrador…»; e2e «mínimos: bajo mínimo en el Resumen y el Inventario…»
- Traslados y conteo → int «un traslado y una salida simultáneos…», «un saldo que cambió mientras se contaba…»; e2e «traslado: …» y «conteo: …»
- Todo en la capacidad inventario → `pnpm deps` sin violaciones; pgTAP `tables_are('inventory', …)` y RLS bajo `platlab_api`
- Probado con datos sintéticos → `core-fixtures.ts` y `supabase/seeds/demo.sql`

## Registro
| Fecha | Entrega | Commit | Veredicto | Pruebas | Nota |
|---|---|---|---|---|---|
| 2026-10-06 | Encabezado de la ficha | `6d6bf34` | Incompleto | e2e 17 | Identidad en una línea y banda de tres datos; faltaba el CI (luego en verde) |
| 2026-10-05 | R-01A completa | `9535d36` | Incompleto | unit 37 · pgTAP 173 · int 102 · e2e 17 | 9/9 criterios; falta la auditoría formal de UI y el QR físico |
| 2026-10-05 | R-01A entrega 4 | `caad0fc` | Incompleto | unit 37 · pgTAP 173 · int 102 · e2e 17 | Traslado, conteo y QR; revisor: 11 correcciones; faltaba el CI y el papel |
| 2026-10-05 | R-01A sin estado de lote | `6f99b80` | Incompleto | unit 37 · pgTAP 173 · int 96 · e2e 14 | El lote no tiene estado; se desecha con «Ajustar» a cero; faltaba el CI |
| 2026-10-05 | R-01A entrega 3 | `89ae651` | Incompleto | unit 37 · pgTAP 186 · int 100 · e2e 14 | Mínimos y estado del lote; revisor: 7 correcciones; faltaba el CI |
| 2026-10-05 | Movimientos por días | `3b0f40f` | Incompleto | unit 37 · pgTAP 169 · int 96 · e2e 13 | Libro agrupado por día con filtros en la URL; revisor: 6 correcciones; faltaba el CI |
| 2026-10-05 | UI de Reactivos | `89d75bb` | Cumple | unit 37 · pgTAP 169 · int 96 · e2e 13 | Resumen en una ventana, vencidos, institución y rol real; revisor: 8 correcciones |
| 2026-10-04 | Ventanas emergentes | `a3d666b` | Cumple | unit 37 · pgTAP 168 · int 94 · e2e 13 | Ventanas centradas con el estilo del modal de ReactiLab; CI en verde |
| 2026-10-04 | Ficha con diseño ReactiLab | `8e952f0` | Cumple | e2e 13 | Segundo nivel con el lenguaje de ReactiLab, solo presentación; CI en verde |
| 2026-10-04 | Diseño ReactiLab | `5701e7f` | Cumple | unit 37 · pgTAP 168 · int 94 · e2e 13 | Barra lateral, tarjetas e índigo (ADR 0010); revisor: 6 de 8 aplicadas |
| 2026-10-04 | Tarjetas de catálogo | `9e02c21` | Cumple | unit 37 · e2e 13 | Patrón común con `IconChip`; revisor: 3 correcciones; CI en verde |
| 2026-10-03 | R-01A entrega 2 | `9a0d77d` | Cumple | unit 37 · pgTAP 168 · int 93 · e2e 13 | Salidas del Operador con aprobación y reserva; revisor: 6 correcciones |
| 2026-10-03 | R-01A entrega 1 | `4fb52e0` | Cumple | unit 36 · pgTAP 153 · int 84 · e2e 12 | Frascos, ficha en dos niveles, FEFO, motivos y destinos; revisor: 5 correcciones |
| 2026-10-02 | Color y entrada directa | `f8cb2c2` | Cumple | unit 31 · pgTAP 139 · int 81 · e2e 11 | Color por módulo y entrada al último espacio (ADR 0010 y 0011) |
| 2026-10-02 | ADR 0011 | `d9d8c65` | Cumple | unit 30 · pgTAP 139 · int 81 · e2e 11 | Inicio como tablero, módulo como app, propietario con permisos de Administrador |
| 2026-10-02 | V-00 | `3ed6429` | Cumple | unit 29 · pgTAP 135 · int 78 · e2e 10 | G0 de Reactivos 9/9 y Reactivos en etapa `pilot` |
| 2026-10-02 | Precisión suave | `898372b` | Incompleto | unit 29 · pgTAP 134 · int 78 · e2e 4 | Rediseño del paso 5; revisor: 9 correcciones; faltaban CI y comentarios de la demo |
| 2026-10-01 | Paso 5 | `ec7e5c4` | Incompleto | unit 29 · pgTAP 134 · int 78 · e2e 4 | Interfaz y G0 en local; faltaban CI, comentarios de la demo y `review-animations` |
| 2026-10-01 | R-00 por API | `f00938c` | Incompleto | unit 25 · pgTAP 134 · int 76 | Reactivos por API; faltaban la interfaz y el CI |
| 2026-10-01 | T-04/T-05 | `52df046` | Incompleto | unit 25 · pgTAP 98 · int 50 | Derechos, admisión de dos ejes, auditoría e idempotencia; faltaban rutas de módulo y CI |
| 2026-10-01 | T-02/T-03 (CI) | `d346bb2` | Incompleto | unit 21 · pgTAP 55 · int 27 | CI en verde; falta el movimiento concurrente del árbol de ubicaciones |
| 2026-10-01 | T-02/T-03 | `3a3c357` | Incompleto | unit 21 · pgTAP 55 · int 27 | Core, RLS, JWT por JWKS y roles; faltaban el CI y el árbol concurrente |
| 2026-10-01 | T-01 (CI) | `899df8e` | Cumple | — | Cierra el criterio 13: CI en verde |
| 2026-10-01 | T-01 | `0286944` | Incompleto | unit 10 · pgTAP 6 · int 6 | Monorepo y CI en local; faltaba ejecutar el CI |
