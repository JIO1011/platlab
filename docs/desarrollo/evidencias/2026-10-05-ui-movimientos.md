# Verificación — Movimientos como libro por días (05-10-2026)

Fecha: 2026-10-05 · Commit base: 89d75bb, con cambios sin confirmar (toda la entrega), rama `feat/precision-suave` · Entorno: local (Docker + Supabase CLI, PostgreSQL 17, Chromium de Playwright)
Veredicto: **Incompleto**. Todo lo ejecutado cumple; quedan sin verificar el CI del commit de cierre y el encabezado fijo en móvil (ver «No verificado»).

Criterio fuente: [ADR 0012](../../05_decisiones.md#adr-0012), cambio del 05-10-2026 «Movimientos como libro por días».

## Criterios

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Decisión registrada en `docs/05` antes del código | ✅ | ADR 0012; incluye la salida de `@tanstack/react-table` |
| 2 | Filtros de tipo y periodo en la URL; la cifra del Resumen abre su lista | ✅ | **Navegador:** «Resumen: cifras que abren su lista…» (píldoras «Salidas» y «30 días» activas; «Todos» y «Todo» limpian la URL) |
| 3 | Asientos agrupados por día en la zona del espacio; cada fila abre la ficha | ✅ | **Navegador:** «G0: 100 g, salida de 20 g y ajuste…» (encabezado «Hoy», 3 asientos con tipo y responsables, «Pidió Óscar Operador», clic abre la ficha) |
| 4 | La API envía `product.id` en cada movimiento | ✅ | Contrato Zod + tipos regenerados; **integración:** 96 pruebas; **pgTAP:** 169 |
| 5 | Sin editar, borrar ni «deshacer»; cantidades como cadenas | ✅ | Revisión del código y del revisor de acabado (`Quantity` con la cadena de la API) |
| 6 | Accesibilidad WCAG 2.2 AA | ✅ | axe sin violaciones en movimientos, filtrados y modo consulta (13 pruebas) |
| 7 | Móvil y tableta sin desplazamiento horizontal | ✅ | **Navegador:** pruebas de móvil (360 px) y tableta (820 px) |
| 8 | Detector de impeccable | ✅ | `[]` |
| 9 | Revisor final de impeccable | ✅ | Un pase, «fix» con 7 puntos; 6 aplicados, 1 aplazado (ver abajo) |

## Comandos ejecutados

| # | Comando | Resultado | Detalle |
|---|---|---|---|
| 1 | `pnpm typecheck` · `pnpm lint` · `pnpm deps` · `pnpm knip` | exit 0 | 114 módulos, 0 violaciones; knip detectó `@tanstack/react-table` sin uso y se quitó |
| 2 | `pnpm test` | exit 0 | 37 pruebas |
| 3 | `pnpm db:types` · `pnpm test:db` · `pnpm test:int` | exit 0 | 169 pgTAP, 96 integración |
| 4 | `pnpm e2e` (tras `pnpm db:reset`), antes y después del revisor | exit 0 | 13 pruebas con axe, ambas veces |
| 5 | `impeccable detect --json` | exit 0 | `[]` |

## Revisor de acabado

Aplicados: encabezado de día fijo bajo la cabecera móvil (`top-[7.25rem] md:top-16`); texto que envuelve en filas estrechas, con la hora antes del responsable y «Saldo» a 13 px; cuenta «N asientos» omitida en el último día mientras haya más páginas; «Quitar filtros» en el estado vacío por filtro; flecha de enlace siempre visible; comentario de la píldora corregido (la del inventario lleva cuenta, son dos piezas distintas).
Aplazado: los cuatro botones de la cabecera ocupan mucho alto en el móvil. Afecta a toda la app de Reactivos y ya existía.

## No verificado

- **CI del commit de cierre:** se revisa tras subirlo.
- **Encabezado fijo en móvil:** la altura de la cabecera (unos 113 px) viene de la lectura del código del shell; las capturas son de página completa y no muestran el desplazamiento.
- **Pendiente:** acciones de la cabecera en móvil, `review-animations` formal.
