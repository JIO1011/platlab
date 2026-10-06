# Verificación — R-01A, entrega 3: mínimos y estado del lote (05-10-2026)

Fecha: 2026-10-05 · Commit base: 3b0f40f, con cambios sin confirmar (toda la entrega), rama `feat/precision-suave` · Entorno: local (Docker + Supabase CLI, PostgreSQL 17, Auth local ES256, Chromium de Playwright)
Veredicto: **Incompleto**. Todo lo ejecutado cumple; queda sin verificar el CI del commit de cierre (ver «No verificado»).

Criterios fuente:
- [ADR 0012](../../05_decisiones.md#adr-0012), cambio del 05-10-2026 «mínimos y estado del lote».
- [ADR 0008](../../05_decisiones.md#adr-0008), cambio del 05-10-2026 (los roles valen para todo el espacio).
- [03 §4](../../03_datos.md#4-inventario-y-reactivos): condición del lote, bajo mínimo e historial.

## Criterios

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Decisiones registradas en `docs/05` antes del código | ✅ | ADR 0008 y ADR 0012 (05-10-2026). Se alinearon 01 §5, 03 §3–§4, README y CLAUDE.md |
| 2 | Mínimo opcional por reactivo, para todo el espacio; solo el Administrador lo fija | ✅ | **Integración:** «el mínimo lo fija el Administrador…» (al crear y con PUT; Operador 403; cero 400; null lo quita; auditoría). **pgTAP:** el runtime solo cambia `minimum_quantity` y `version` del ítem; mínimo > 0 |
| 3 | Bajo mínimo con la existencia física (vencidos, cuarentena y lo apartado); sin existencias cuenta; igual al mínimo no | ✅ | **Integración:** misma prueba (0 g, 30 g, 50 de 50, con 10 g apartados y el lote en cuarentena) |
| 4 | En el Resumen, «Bajo mínimo» reemplaza a «Reactivos» y abre el inventario filtrado | ✅ | **Navegador:** «mínimos y estado del lote…» (`?minimo=bajo`, píldora activa, Acetona e Hidróxido de sodio con «Bajo mínimo», Cloruro de sodio fuera). Sin mínimos, la tarjeta dice «Sin mínimos fijados» (`productsWithMinimum`) |
| 5 | Estado del lote con motivo e historial que no se edita; sin salidas ni aprobaciones en cuarentena o bloqueado | ✅ | **Integración:** «cuarentena y bloqueo con motivo…» (sin motivo 400, Operador 403, mismo estado 400, salida 400, ajuste e ingreso 201, historial de 3 cambios, auditoría) y «si el lote pasa a cuarentena después de pedirse…». **pgTAP:** sin registro no cambia el estado (disparador diferido); el historial no se edita ni se borra; nadie registra en nombre de otro |
| 6 | Descartar es definitivo: una baja `disposal` lleva a cero todos los frascos; con salidas pendientes no procede | ✅ | **Integración:** «descartar da de baja todo el saldo…» (pendiente 400, Operador 403, una operación con 3 asientos y su motivo, todo en cero, sin vuelta a otro estado, sin ingresos, lote vacío sin operación). **pgTAP:** baja sin motivo, baja con signo positivo, descartado con saldo, salida de «descartado» e ingreso en un lote descartado se rechazan |
| 7 | Concurrencia: descarte y solicitud simultáneos | ✅ | **Integración:** «un descarte y una solicitud simultáneos…»: nunca queda un lote descartado con algo apartado o con saldo. El ingreso relee el estado bajo el bloqueo del lote |
| 8 | Interfaz: ficha con mínimo, estado del lote por frasco, descarte con lista y confirmación, «Bajas» en Movimientos | ✅ | **Navegador:** misma prueba (cambiar mínimo, cuarentena con motivo visible y sin «Salida», descarte con motivo de la lista y confirmación obligatoria, filtro «Bajas») |
| 9 | Accesibilidad WCAG 2.2 AA | ✅ | axe sin violaciones en 14 pruebas, incluidas las hojas de mínimo, estado del lote y descarte |
| 10 | Dominio por encima del estilo | ✅ | Sin UI optimista ni «deshacer»; descartar no se ofrece con salidas pendientes ni antes de cargar todos los frascos del lote; botón de envío en rojo solo para el descarte |
| 11 | Detector y revisor de impeccable | ✅ | Detector `[]`; revisor: un pase con 7 correcciones, todas aplicadas (ver abajo) |

## Comandos ejecutados

| # | Comando | Resultado | Detalle |
|---|---|---|---|
| 1 | `pnpm typecheck` · `pnpm lint` · `pnpm deps` · `pnpm knip` | exit 0 | 115 módulos, 335 dependencias, 0 violaciones; sin código muerto |
| 2 | `pnpm test` | exit 0 | 37 pruebas |
| 3 | `pnpm db:reset` · `pnpm db:types` | exit 0 | 13 migraciones + seed + demo; `*.queries.ts` regenerados |
| 4 | `pnpm test:db` | exit 0 | pgTAP: 186 pruebas (17 nuevas) |
| 5 | `pnpm test:int` | exit 0 | 100 pruebas (4 nuevas); se actualizaron 6 por el permiso nuevo y las cifras nuevas del resumen |
| 6 | `pnpm e2e` (tras `pnpm db:reset`) | exit 0 | 14 pruebas Playwright con axe (1 nueva), antes y después del revisor |
| 7 | `impeccable detect --json` | exit 0 | `[]` |

## Revisor de acabado

Aplicadas las 7 correcciones:
1. La pista de «Bajo mínimo» ya no parece una fracción: «Inventario: 5 reactivos · 9 frascos».
2. Con salidas pendientes, el descarte no se ofrece: se ocultan motivo y confirmación, el botón queda desactivado y el aviso enlaza a Solicitudes.
3. La lista de lo que se dará de baja carga todas las páginas de frascos; hasta entonces el descarte queda desactivado.
4. Sin mínimos fijados, la tarjeta dice «Sin mínimos fijados» (cifra nueva `productsWithMinimum`).
5. Etiquetas de sección iguales en toda la hoja, y la leyenda separada de la línea.
6. El rojo de «Descartar» llega solo al elegirlo; el radio usa el rojo.
7. Icono neutro del lote (`Shield`, o `ShieldAlert` si no está habilitado) y el motivo recortado a dos líneas con el texto completo al pasar el puntero.

## No verificado

- **CI del commit de cierre:** se revisa tras subirlo.
- **Móvil de las hojas nuevas:** el revisor no tuvo captura móvil de la ficha con un lote en cuarentena ni de las hojas de mínimo y de estado del lote; las pruebas de 360 px y 820 px siguen pasando sin desplazamiento horizontal.
- **Retirar el ámbito por ubicación del código:** pendiente en `docs/05` (los roles valen para todo el espacio, pero `location_id` y sus consultas siguen).
- **Pendiente de R-01A:** entrega 4 (traslados, conteo y QR).
