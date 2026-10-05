---
name: PlatLab
description: Aplicación de trabajo diario para laboratorios; el saldo es el protagonista.
colors:
  canvas: "#f8fafc"
  surface: "#ffffff"
  surface-sunken: "#f1f5f9"
  ink: "#1e293b"
  ink-muted: "#475569"
  ink-subtle: "#5b6b7f"
  line: "#e2e8f0"
  line-strong: "#cbd5e1"
  # Acción de la plataforma; dentro de un módulo, su bloque [data-module] redefine las cuatro.
  action: "#1f5f96"
  action-hover: "#1a5182"
  action-pressed: "#15426b"
  action-soft: "#e6eef7"
  # Extremo del degradado de la tarjeta de acción rápida.
  action-deep: "#15426b"
  on-action: "#ffffff"
  brand: "#1f5f96"
  canvas-glow: "#ffffff"
  # Tema de Reactivos (índigo): [data-module='reagents'] en styles.css.
  reagents-action: "#4f46e5"
  reagents-action-hover: "#4338ca"
  reagents-action-pressed: "#3730a3"
  reagents-action-soft: "#eef2ff"
  reagents-action-deep: "#6d28d9"
  reagents-canvas-glow: "#eef0ff"
  success: "#1d7a46"
  success-soft: "#e5f3ea"
  warning: "#8a5a00"
  warning-soft: "#fdf2d8"
  danger: "#b42318"
  danger-soft: "#fcebe9"
typography:
  display: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "clamp(2rem, 1.4rem + 1.6vw, 2.75rem)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.03em" }
  metric: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "2.5rem", fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em", fontFeature: "\"tnum\"" }
  stat: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "1.875rem", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.025em", fontFeature: "\"tnum\"" }
  metric-sm: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "2.125rem", fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em", fontFeature: "\"tnum\"" }
  title: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "18px", fontWeight: 600, lineHeight: 1.556, letterSpacing: "-0.01em" }
  body-lg: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 400, lineHeight: 1.45 }
  body: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: 1.429, fontFeature: "\"cv11\", \"ss01\"" }
  meta: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "13px", fontWeight: 400 }
  label: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em" }
  quantity: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "18px", fontWeight: 600, fontFeature: "\"tnum\"" }
rounded: { control: "12px", panel: "16px", card: "24px", pill: "9999px" }
spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" }
components:
  button-primary: { backgroundColor: "{colors.action}", textColor: "{colors.on-action}", rounded: "{rounded.control}", padding: "0 16px", height: "40px" }
  button-primary-hover: { backgroundColor: "{colors.action-hover}" }
  button-primary-active: { backgroundColor: "{colors.action-pressed}" }
  button-secondary: { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.control}", padding: "0 16px", height: "40px" }
  button-ghost: { textColor: "{colors.ink-muted}", rounded: "{rounded.control}", padding: "0 12px", height: "32px" }
  input: { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.control}", padding: "0 12px", height: "40px" }
  card: { backgroundColor: "{colors.surface}", rounded: "{rounded.card}", padding: "24px" }
  shell-sidebar: { backgroundColor: "{colors.surface}", padding: "16px", width: "288px" }
  shell-topbar: { backgroundColor: "{colors.surface}", padding: "8px 32px", height: "64px" }
  profile-card: { backgroundColor: "{colors.canvas}", rounded: "{rounded.panel}", padding: "16px" }
  nav-item-active: { backgroundColor: "{colors.action}", textColor: "{colors.on-action}", rounded: "{rounded.control}", padding: "0 16px", height: "48px" }
  stat-card: { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.card}", padding: "24px" }
  quick-actions: { backgroundColor: "{colors.action}", textColor: "{colors.on-action}", rounded: "{rounded.card}", padding: "40px" }
  module-card: { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.card}", padding: "24px", height: "256px" }
  icon-chip: { backgroundColor: "{colors.action-soft}", textColor: "{colors.action}", rounded: "{rounded.control}", size: "40px" }
  badge-info: { backgroundColor: "{colors.action-soft}", textColor: "{colors.action}", rounded: "{rounded.pill}", padding: "2px 8px" }
  badge-warning: { backgroundColor: "{colors.warning-soft}", textColor: "{colors.warning}", rounded: "{rounded.pill}", padding: "2px 8px" }
  segmented-filter: { backgroundColor: "{colors.surface-sunken}", rounded: "{rounded.pill}", padding: "4px" }
  segmented-filter-active: { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.pill}", padding: "0 16px", height: "36px" }
  pending-notice: { backgroundColor: "{colors.warning-soft}", textColor: "{colors.warning}", rounded: "{rounded.card}", padding: "16px 20px" }
---

# Design System: PlatLab

> **Fuentes que mandan.** Este archivo resume el sistema y enlaza; no copia.
> - Dirección visual: [01 §7](docs/01_producto.md#7-cómo-se-ve-la-plataforma) y flujo del inventario en [§6.1](docs/01_producto.md#61-inventario-de-reactivos-m2).
> - Stack y frontend: [02 §2](docs/02_arquitectura.md#2-stack) y [§8](docs/02_arquitectura.md#8-frontend).
> - Decisiones: [ADR 0010](docs/05_decisiones.md#adr-0010) (sistema, color por módulo, tarjetas de catálogo y el diseño tomado de ReactiLab, 04-10-2026), [ADR 0011](docs/05_decisiones.md#adr-0011) (Inicio como tablero, módulos como apps) y [ADR 0012](docs/05_decisiones.md#adr-0012) (por frasco, aprobación de salidas).
> - **Tokens:** la única fuente es [`packages/ui/src/styles.css`](packages/ui/src/styles.css); el YAML de arriba se deriva de él, y si difieren manda `styles.css`.
> - **Medidas y comportamiento de cada pieza:** manda su código, en [`packages/ui/src/components`](packages/ui/src/components) y [`apps/web/src/features`](apps/web/src/features). Este archivo solo fija lo que es norma. Las capturas de la última revisión están en `apps/web/.impeccable/review/`.

## Overview

**Creative North Star: «El libro de saldos», con el diseño de ReactiLab.** Cada pantalla responde primero «¿cuánto hay, dónde y quién lo movió?». Lienzo gris pizarra con un brillo leve, tarjetas blancas de esquinas amplias con borde fino que se elevan al pasar el puntero, una sola voz de acción por contexto y cifras grandes con su unidad. El historial se lee como un libro: nada se edita, todo queda firmado.

- El saldo es la columna dominante; las cantidades llevan siempre su unidad atenuada.
- Una acción primaria por sección; el resto, secundarias o fantasma.
- Profundidad por borde fino, sombra mínima y elevación al pasar el puntero; nunca por halos de color ni imágenes.
- Gráficos de una sola serie, solo con datos reales y con lectura en texto.
- El servidor confirma antes de que la pantalla cambie.

## Colors

- **Acción** (`action` y sus variantes): una sola voz por contexto. Azul en la plataforma (Inicio, acceso); dentro de un módulo, su tema redefine los tokens, incluido `action-deep`. `action-soft` es el fondo de selección, de chips de icono y de lo informativo; el elemento activo del menú va relleno con `action`.
- **Marca** (`brand`): solo el logotipo; no cambia con el tema del módulo.
- **Reactivos:** índigo (`reagents-*`, `#4f46e5` sobre `#eef2ff`), con `action-deep` (violeta) como extremo del degradado; activado con `[data-module='reagents']` en `<html>` para que lo hereden hojas, menús y avisos, que viven en portales.
- **Neutros** (escala pizarra): `canvas` (fondo, con un degradado fijo de `canvas-glow`), `surface` (paneles), `surface-sunken` (pistas, hover, esqueletos), `ink` / `ink-muted` / `ink-subtle` (texto principal, atenuado, tenue), `line` / `line-strong` (divisores y bordes de campo).
- **Estados:** `success`, `warning`, `danger`, cada uno como texto sobre su `-soft`.
  - Lo pendiente de decidir va en ámbar y solo si existe: pastilla del filtro, aviso del Resumen, píldora del Inicio e insignia «Pendiente».
  - Una solicitud decidida es Aprobada (éxito), Rechazada (peligro) o Cancelada (neutro).
  - Lo apartado no es una alerta: va en `info`, el acento del módulo.

**Reglas con nombre**
- **Voz única.** Solo `action` invita a actuar: botones, enlaces y selección. Una excepción acotada: la cifra con signo y el círculo de icono de la fila de actividad llevan color suave (salida en rojo, ingreso en verde, ajuste en acento). El signo y el tipo siguen escritos, así que el color nunca es el único dato; en ningún otro lugar los tipos de movimiento usan colores de estado.
- **Texto obligatorio.** Ningún estado se comunica solo con color: todo Badge y todo aviso lleva texto.
- **Serie única.** Un gráfico muestra una serie, en `action`, sin leyenda: el título la nombra.
- **Acento por módulo.** El acento vive solo en los tokens de cada módulo; los componentes no llevan colores de módulo literales. Verde, ámbar y rojo son de estado y ningún módulo ni tipo de ítem los usa como color propio. Cada acento se valida para WCAG AA y cada módulo registrado tiene su bloque (lo exige `packages/modules/src/define-module.test.ts`).

## Typography

Inter Variable, una sola familia. El tamaño y el tracking cerrado dan la voz a títulos y cifras; el peso y el tono separan el resto.

| Escala | Uso |
|---|---|
| Display (32–44 px fluido, 700) | título de página y saludo |
| Stat (30 px, 700) | cifra de StatCard y total de la tarjeta de reactivo |
| Metric (40 px) y Metric-sm (34 px) | cifras que abren o encabezan la vista que las explica |
| Title (18 px) | título de hoja, tarjeta y sección; saldo de un frasco |
| Body-lg (15 px) · Body (14 px) | navegación de escritorio; tablas, campos y botones |
| Meta (13 px) | «Actualizado hace…», ayudas, código, CAS, detalles |
| Label (12 px, mayúsculas) | encabezados de columna y rótulos de tarjeta de catálogo |

**Reglas con nombre**
- **Cifra tabular.** Toda cantidad, saldo o contador usa `tabular-nums`; en tablas y filas se alinea a la derecha.
- **Tamaño con dato.** Las cifras grandes solo muestran datos reales del servidor y llevan a su vista; nunca una métrica decorativa.
- **Escala que no se pierde.** Las clases se combinan con `cn` de `packages/ui`; un tamaño nuevo en `styles.css` se añade también a `cn.ts`.

## Layout

- **Shell anclado** desde 768 px: barra lateral pegada al borde, de 288 px y alto completo, con borde derecho; barra superior fija (64 px mínimo), translúcida y con borde inferior. Ya no hay paneles flotantes. Por debajo de 768 px, solo la barra superior.
- **Barra lateral:** logotipo, tarjeta de la persona con su rol, rótulo del menú («Menú principal» o «Menú de {módulo}»), elementos con icono (el activo, relleno con `action`) y «Salir» al pie.
- **Dos modos de navegación (ADR 0011).** En la plataforma, el menú es «Inicio»; los módulos se abren desde sus tarjetas. Dentro de un módulo, el menú es el de esa app: «← Inicio», el selector de módulo y las secciones del manifiesto. En el móvil, píldoras desplazables junto al selector compacto.
- **Inicio** es un tablero con una tarjeta-enlace por módulo, de 20 rem como mínimo. **Entrada directa:** se abre el último espacio usado y se cambia desde la barra; no hay pantalla para elegir.
- **Cabecera de módulo:** título Display y «Actualizado hace…» con la marca más antigua de lo que se ve. En el Resumen de Reactivos, las acciones de ingreso y salida no van en la cabecera sino en la tarjeta de acción rápida; en las demás secciones, a la derecha.
- **Resumen:** acción rápida, cuatro StatCard en rejilla (2 columnas, 4 desde 1280 px), gráfico y actividad.
- **Inventario en dos niveles (ADR 0012):** rejilla de tarjetas de reactivo y, en su ficha, una tarjeta por frasco. Solicitudes: una tarjeta por solicitud.
- **Movimientos:** tabla desde 1024 px; por debajo, filas de actividad.
- **Contenido** de hasta 72 rem; ritmo de 4 px, 16 px entre tarjetas.
- **Consultas de contenedor** para piezas que viven en columnas estrechas y anchas (fila de actividad, eje X del gráfico).

## Elevation & Depth

Borde fino más sombra mínima: el borde es un anillo de 1 px de `line` dentro de la propia sombra, así no cambia el tamaño de nada. Tres sombras en `styles.css`.

- **Elevada** (`shadow-raised`): anillo + sombra mínima; contenido (tarjetas, botón primario, opción activa de un selector segmentado).
- **Flotante** (`shadow-float`): anillo + sombra amplia; el hover de una tarjeta-enlace y la tarjeta de acceso.
- **Superposición** (`shadow-overlay`): lo que se abre encima (hojas, menús, avisos, información emergente).

**La regla de la capa justa.** Cada sombra dice a qué capa pertenece la pieza; ninguna es un halo de color ni decora. Lo que cambia por estado es un enlace entero: la tarjeta-enlace (módulo, reactivo, indicador) sube 4 px y pasa de elevada a flotante al pasar el puntero; la elevación va con `motion-safe`, y con movimiento reducido solo cambia la sombra. Las barras de la estructura no llevan sombra: usan borde.

## Shapes

Radios por papel, no por tamaño: `control` (12 px) en botones, campos y navegación; `panel` (16 px) en la tarjeta de la persona y otros paneles pequeños; `card` (24 px) en tarjetas, indicadores y hojas; píldora en etiquetas, filtros, Badge y atajos. Las barras de la estructura son rectas. Bordes de 1 px en tarjetas (como anillo de la sombra), controles, divisores y superposiciones.

## Components

Cada pieza vive en `packages/ui/src/components` o en su función de `apps/web/src/features`. Lo que sigue es lo que debe respetar cualquier pieza nueva.

- **Buttons.** Primario (`action`, con sombra elevada), secundario (por defecto) y fantasma. Pulsación de 150 ms (en la barra lateral, el activo lleva sombra del acento); `loading` deshabilita sin cambiar el ancho.
- **Field y Select.** El Field da etiqueta, ayuda y error por contexto. El error tiene `role="alert"` y dice cómo resolverlo. Select y DropdownMenu (Radix) comparten superficie.
- **Quantity.** Recibe cadenas decimales de la API, nunca `number`: coma es-EC, punto de miles, signo menos tipográfico y unidad atenuada. Lo que la interfaz escribe en un campo usa `toDecimalInput` (coma decimal, sin miles).
- **ChoiceField.** Motivo y destino se eligen de la lista del laboratorio (píldoras de radio en un `fieldset`); quien puede ampliarla ve «Agregar».
- **StatePanel y Skeleton.** Vacío, error, sin permiso, módulo no disponible y sin conexión son estados distintos. La carga es un esqueleto quieto de la forma del contenido.
- **Tabla.** Dentro de una tarjeta, cifras a la derecha.
- **IconChip** (`packages/ui`). Icono sobre fondo suave en `control`; en StatCard, de 40 a 48 px. Tonos `accent` (toma el color del módulo), `neutral` y de estado; tamaños `md` y `sm`. Decorativo (`aria-hidden`): el significado va en el texto de al lado.
- **StatCard** (`packages/ui`). Indicador: etiqueta, cifra grande, línea de estado y IconChip de color a la derecha. El color es de estado solo si hay estado («Por aprobar» en ámbar con pendientes; «Al día» en verde) y del acento si no. Es presentación: quien lo enlaza lo envuelve en un `<a class="group">` y la tarjeta se eleva.
- **Acción rápida (Resumen de Reactivos).** Tarjeta degradada de `action` a `action-deep` con título, una frase y las acciones de ingreso y salida; es la acción primaria de la pantalla, así que su botón principal va invertido (blanco sobre el acento).
- **Fila de actividad.** Línea de timeline: círculo de icono y cantidad con signo sobre fondo suave (ver «Voz única»).
- **Marca de agua.** Las tarjetas-enlace de módulo y de reactivo llevan el icono de su propio módulo, grande y casi invisible, decorativo (`aria-hidden`); crece al pasar el puntero con `motion-safe`.
- **Tarjeta de catálogo (ADR 0010, 04-10-2026).** Es el patrón de toda tarjeta de catálogo de cualquier módulo; hoy lo usa la de reactivo. Tarjeta-enlace con IconChip (el icono sale de un dato real, como el estado físico), rótulo en Label con el dato de identidad a la derecha, nombre y código, una línea y la fila «Total» con una píldora con icono; la cifra va en `action`. Sin existencias: chip neutro y píldora ámbar con icono y texto.
- **Tarjeta de módulo (Inicio).** Tarjeta-enlace (borde fino, elevación de 4 px) con IconChip, nombre, cifras reales, un minigráfico y una frase de texto. Si hay pendientes, una píldora ámbar los dice y la tarjeta los anuncia con `aria-describedby`. Lleva el `data-module` de su módulo.
- **Ficha del reactivo (nivel 2, como el detalle de ReactiLab).** Resumen con IconChip del estado físico, la existencia grande en `action`, la píldora de frascos y los datos (código, CAS, estado físico) como píldoras. Cada frasco es una tarjeta con píldoras de ubicación y caducidad con icono, código y saldo grande en `action`, barra de % restante y acciones compactas («Salida» en tono suave, «Ajustar» solo con icono y nombre accesible). El borde cuenta el estado, siempre con texto: verde con la insignia «FEFO» el que conviene usar primero (la misma sugerencia de la hoja de salida), rojo el vencido, ámbar el vacío. El código nunca se parte; la barra usa aritmética exacta («<1 %» conserva un trazo visible); «Salida» solo con saldo disponible (saldo menos lo apartado). El historial es una línea de tiempo como la del Resumen.
- **Hojas de movimiento (Sheet).** Radix Dialog; panel lateral en escritorio y hoja inferior en el móvil. Se monta de nuevo en cada apertura (formulario limpio, clave idempotente nueva). Una sola acción primaria al pie. La salida ofrece atajos de cantidad, «Quedarán X», el aviso de frasco vencido (se permite) y la sugerencia FEFO. Para quien no aprueba: «Solicitar salida», con la cantidad apartada.
- **Solicitudes.** Una tarjeta por solicitud con su estado en texto. «Aprobar salida» (secundaria) y «Rechazar» (fantasma, con motivo obligatorio); quien pidió solo ve «Cancelar solicitud». El filtro «Pendientes / Todas» vive en la URL.
- **Avisos (Sonner).** Solo informan un resultado ya confirmado por el servidor. Si la pieza que lo lanza se desmonta al confirmarse, se emite tras `mutateAsync`.

### Movimiento

`ease-out-expo` para pulsación, fundidos y menús; `ease-sheet` (cajón, sin rebote) para hojas. Superposiciones de 150–200 ms desde su origen; hojas de 260 ms al entrar; las salidas, más cortas. Con `prefers-reduced-motion`, hojas y menús pasan a fundidos y las elevaciones de tarjeta se omiten. Sin bucles ni animación de filas o barras.

## Do's and Don'ts

### Do
- **Do** usar los tokens semánticos de `styles.css`; nunca un color literal en un componente.
- **Do** mostrar toda cantidad con Quantity y calcular porcentajes, restas y atajos con `decimal.ts` (BigInt).
- **Do** reservar Display para el título de página y Metric para contadores reales enlazados a su vista.
- **Do** hacer toda tarjeta de catálogo con el patrón de la de reactivo y sacar su color del acento del módulo.
- **Do** dar a cada módulo nuevo su bloque `[data-module]` en `styles.css`, validado para AA, y su tarjeta en el Inicio.
- **Do** mostrar lo pendiente de decidir en ámbar y solo si existe, con la misma frase en el Resumen y en el Inicio.

### Don't
- **Don't** usar UI optimista sobre existencias ni ofrecer «deshacer» en un movimiento confirmado: se corrige con otro movimiento.
- **Don't** comunicar un estado solo con color ni pintar los tipos de movimiento con colores de estado fuera de la cifra y el icono de la fila de actividad.
- **Don't** dar color propio a un tipo de ítem ni usar verde, ámbar o rojo como acento.
- **Don't** mostrar acciones que el rol no permite.
- **Don't** usar imágenes decorativas, halos de color, gráficos sin dato ni métricas inventadas.
- **Don't** sumar unidades distintas, pasar una cantidad por `number` ni escribir en un campo con `formatDecimal`.
- **Don't** animar en bucle ni usar rebote.
