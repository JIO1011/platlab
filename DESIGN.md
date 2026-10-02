---
name: PlatLab
description: Aplicación de trabajo diario para laboratorios; el saldo es el protagonista.
colors:
  canvas: "#f5f7fb"
  surface: "#ffffff"
  surface-sunken: "#eef2f7"
  ink: "#102a43"
  ink-muted: "#526275"
  ink-subtle: "#5e6d80"
  line: "#dde4ed"
  line-strong: "#c3cdd9"
  action: "#1f5f96"
  action-hover: "#1a5182"
  action-pressed: "#15426b"
  action-soft: "#e6eef7"
  on-action: "#ffffff"
  success: "#1d7a46"
  success-soft: "#e5f3ea"
  warning: "#8a5a00"
  warning-soft: "#fdf2d8"
  danger: "#b42318"
  danger-soft: "#fcebe9"
typography:
  display:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.4rem + 1.6vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  metric:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "\"tnum\""
  metric-sm:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "\"tnum\""
  title:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.556
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.429
    fontFeature: "\"cv11\", \"ss01\""
  meta:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.04em"
  quantity:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    fontFeature: "\"tnum\""
rounded:
  control: "10px"
  panel: "20px"
  card: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-primary-active:
    backgroundColor: "{colors.action-pressed}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "24px"
  shell-sidebar:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "16px"
    width: "240px"
  shell-topbar:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "8px 24px"
    height: "56px"
  nav-item-active:
    backgroundColor: "{colors.action-soft}"
    textColor: "{colors.action}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  nav-pill-active:
    backgroundColor: "{colors.action-soft}"
    textColor: "{colors.action}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  tabs-list:
    backgroundColor: "{colors.surface-sunken}"
    rounded: "{rounded.pill}"
    padding: "4px"
  tabs-trigger-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  quick-action-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.card}"
    padding: "20px"
    height: "112px"
  quick-action:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
    height: "112px"
  badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Design System: PlatLab

> **Fuentes que mandan.** Este archivo describe lo construido y enlaza; no copia.
> Dirección visual: [docs/01_producto.md §7 «Dirección visual»](docs/01_producto.md#7-cómo-se-ve-la-plataforma).
> Stack y frontend: [docs/02_arquitectura.md §2](docs/02_arquitectura.md#2-stack) y [§8](docs/02_arquitectura.md#8-frontend).
> Sistema de diseño y movimiento: [ADR 0010](docs/05_decisiones.md#adr-0010), con su cambio del 02-10-2026 («precisión suave»).
> **Tokens:** la única fuente es [`packages/ui/src/styles.css`](packages/ui/src/styles.css). Los valores del encabezado YAML se derivan de ese archivo para las herramientas de diseño; si difieren, manda `styles.css`.

## Overview

**Creative North Star: "El libro de saldos", en precisión suave**

Cada pantalla responde primero «¿cuánto hay, dónde y quién lo movió?». La interfaz es una herramienta de trabajo tranquila: lienzo frío con un brillo leve desde arriba a la izquierda, paneles blancos flotantes de esquinas amplias y sombras suaves en capas, una sola voz de acción y cifras grandes con su unidad. La navegación y la barra superior también son paneles que flotan sobre el lienzo. El historial se lee como un libro: nada se edita, todo queda firmado. La dirección y sus motivos están en 01 §7 y en el ADR 0010.

**Key Characteristics:**
- El saldo es la columna dominante; las cantidades llevan siempre su unidad atenuada.
- Títulos y contadores grandes; el cuerpo sigue siendo denso y legible.
- Una acción primaria por sección; el resto son botones secundarios o fantasma.
- Profundidad por paneles flotantes con sombra en capas, nunca por halos, vidrio ni imágenes.
- El servidor confirma antes de que la pantalla cambie.

## Colors

Neutros fríos azul pizarra con un único azul de acción; los estados solo aparecen como pareja de color suave y texto.

### Primary
- **Azul de acción** (`action`): botón primario, acción rápida principal, enlace, foco, cursor de escritura y la marca. Sus variantes `action-hover` y `action-pressed` son estados del mismo botón; `action-soft` es el fondo de selección, del elemento de navegación activo, de la opción resaltada, del hover de los contadores de Inicio y del círculo de icono de las acciones rápidas secundarias.

### Neutral
- **Lienzo** (`canvas`): fondo de la aplicación bajo un degradado radial blanco fijo en la esquina superior izquierda; también hover de fila y de la lista de espacios, y fondo del recuadro de cuentas de demo.
- **Superficie** (`surface`): paneles, tarjetas, barra lateral, barra superior, hojas, campos, encabezado de tabla y pestaña activa.
- **Superficie hundida** (`surface-sunken`): pista de las pestañas, hover de botón secundario, fantasma y navegación, círculo de icono de las filas de actividad, esqueletos y campos deshabilitados.
- **Tinta** (`ink`): texto principal y cifras. **Tinta atenuada** (`ink-muted`): metadatos, unidades, ayudas, navegación inactiva. **Tinta tenue** (`ink-subtle`): marcadores de posición, «(opcional)», saldos en cero.
- **Línea** (`line`): divisores internos de tarjetas y tablas, bordes de hojas y del menú del Select. **Línea fuerte** (`line-strong`): borde de campos y del botón secundario.

### Estados
- **Éxito / Aviso / Peligro** (`success`, `warning`, `danger` con su `-soft`): texto sobre su fondo suave. Peligro también marca el borde del campo inválido.

### Named Rules
**La regla de la voz única.** Solo `action` invita a actuar. Los tipos de movimiento (ingreso, salida, ajuste) no son estados: se distinguen por icono y texto, nunca con colores de alerta.

**La regla del texto obligatorio.** Ningún estado se comunica solo con color: todo Badge y todo aviso lleva texto.

## Typography

**Fuente:** Inter Variable (con ui-sans-serif, system-ui), con `cv11` y `ss01` activos en el cuerpo.

**Character:** una sola familia; el tamaño grande y el tracking cerrado dan la voz a títulos y cifras, el peso y el tono separan el resto. Cifras tabulares en toda cantidad.

### Hierarchy
- **Display** (600, fluido de 32 a 44 px, interlínea 1,1, −0.03em): título de página y saludo de Inicio («Reactivos», «Buenos días, …», «Inicia sesión», «Elige un espacio de trabajo»).
- **Metric** (600, 40 px; **Metric-sm**, 34 px en el móvil; interlínea 1, −0.03em, tabulares): contadores del resumen de Inicio, siempre enlazados a la vista que los explica.
- **Title** (600, 18 px, −0.01em): título de hoja y de tarjeta, total por reactivo.
- **Body-lg** (400–600, 15 px, interlínea 1,45): navegación de escritorio, nombre del espacio en la barra y fecha bajo el saludo.
- **Body** (400–500, 14 px): tablas, campos, botones, pestañas, navegación del móvil.
- **Meta** (400, 13 px): «Actualizado hace…», ayudas y errores de campo, código y CAS, detalle de las filas de actividad.
- **Label** (600, 12 px, 0.04em, mayúsculas): solo encabezados de columna de tabla. Badge, títulos de grupo del Select y tipo de movimiento usan 12 px sin mayúsculas.

### Named Rules
**La regla de la cifra tabular.** Toda cantidad, saldo o contador usa `tabular-nums`; en tablas y filas se alinea a la derecha.

**La regla del tamaño con dato.** Las cifras grandes (Metric) solo muestran datos reales del servidor y llevan a su vista; nunca una métrica decorativa.

## Layout

- **Shell flotante:** en escritorio, el lienzo deja 16 px de margen y 8 px entre columnas. La barra lateral (240 px) es un panel fijo con la marca y la navegación, de la altura de la ventana menos los márgenes. La barra superior es un panel fijo de 56 px como mínimo con el espacio actual a la izquierda (el propio selector cuando hay varios espacios; nunca se recorta) y, a la derecha, el nombre de la persona y «Salir». Por debajo de 768 px desaparece la barra lateral: la barra superior muestra la marca compacta, el espacio y «Salir» solo con icono, y debajo corre una fila desplazable de píldoras de navegación.
- **Contenido:** limitado a 72 rem (`max-w-6xl`), con 16/24 px de margen lateral (móvil/escritorio) y 24/32 px sobre el título.
- **Inicio en bloques:** saludo Display con la fecha debajo; por módulo, una rejilla de 12 columnas desde 1024 px: resumen (7 columnas) con dos contadores separados por una línea, acciones rápidas (5 columnas) en mosaico de 2 × 2 y actividad reciente a todo el ancho. Sin acciones permitidas, el resumen ocupa las 12 columnas. En el móvil, todo se apila y el mosaico sigue en dos columnas.
- **Barra de página:** título Display a la izquierda y acciones a la derecha; en el móvil, las acciones pasan a una rejilla de dos columnas con la primaria primero y a todo el ancho.
- **Inventario producto → lote → ubicación:** en escritorio, un `tbody` por reactivo dentro de una tarjeta; su fila de encabezado muestra nombre, código y CAS, y el total del reactivo en Title; debajo, una fila por lote y ubicación con sangría de 32 px, caducidad y saldo. Por debajo de 768 px la tabla se sustituye por una lista apilada: reactivo con total a la derecha y, debajo, sus lotes con sangría y borde izquierdo. Las acciones por fila son botones fantasma pequeños (44 px de alto en el móvil).
- **Movimientos en el móvil:** filas de actividad en lugar de tabla.
- **Pantallas de entrada:** acceso en una tarjeta centrada de 420 px; selector de espacio en una columna de 520 px con la lista en una tarjeta.
- **Ritmo:** escala de 4 px. 16 px entre bloques de Inicio y 24 px entre módulos; 24 px de relleno en tarjetas (16 px en el móvil), 20 px en acciones rápidas, 24 × 20 px en hojas.

## Elevation & Depth

La profundidad viene de paneles blancos que flotan sobre el lienzo, no de bordes: las tarjetas y barras no llevan borde, solo sombra. Tres sombras en capas con el tinte de `ink`, definidas en `styles.css`. El lienzo recibe un degradado radial blanco, fijo, desde la esquina superior izquierda.

### Shadow Vocabulary
- **Elevada** (`shadow-raised`): tarjetas de contenido (resumen, actividad, tablas de Reactivos), acciones rápidas, botón primario y pestaña activa.
- **Flotante** (`shadow-float`): el shell (barra lateral y barra superior) y las tarjetas de las pantallas de entrada (acceso, lista de espacios).
- **Superposición** (`shadow-overlay`): hojas, menú del Select y avisos.

### Named Rules
**La regla de la capa justa.** Cada sombra dice a qué capa pertenece la pieza: contenido (elevada), estructura (flotante) o algo que se abrió encima (superposición). Ninguna sombra es un halo de color ni se usa para decorar.

## Shapes

Radios por papel, no por tamaño: `control` (10 px) en botones, campos, navegación de escritorio y avisos en línea; `panel` (20 px) en la barra superior, avisos de Sonner, contadores y filas de la lista de espacios; `card` (24 px) en tarjetas, barra lateral, acciones rápidas, hojas y menús de entrada; píldora en pestañas, navegación del móvil, Badge y círculos de icono. Opciones del Select, esqueletos de línea, el enlace «Actualizar» y el selector segmentado de las hojas usan 6 px. Bordes de 1 px solo en controles, divisores y superposiciones.

## Components

### Buttons
- **Forma:** `control`; alturas de 32, 40 y 36 px (pequeño, normal, icono); iconos de 16 px.
- **Primario:** `action` sobre `on-action` con sombra elevada. **Secundario** (por defecto): superficie con línea fuerte. **Fantasma:** tinta atenuada, fondo hundido al pasar.
- **Estados:** transición de 150 ms con `ease-out-expo` y escala 0,98 al pulsar (solo con movimiento permitido). `loading` deshabilita, anuncia `aria-busy` y no cambia el ancho.

### Inputs / Fields
- **Field** da la etiqueta, la ayuda permanente y el error, y los entrega por contexto (`useFieldControl`): un control envuelto (Controller, campo con unidad) sigue unido a su etiqueta. «(opcional)» se escribe en la etiqueta; el error tiene `role="alert"` y dice cómo resolverlo.
- **Estilo:** superficie, línea fuerte, `control`, 40 px. Foco: borde `action` y anillo de 3 px al 20 %. Inválido: borde `danger`.
- **Select** (Radix): menú en `control` con sombra de superposición, anclado a su origen con `pop-in`; agrupa opciones por título (p. ej., lotes bajo su reactivo, un grupo por nombre en orden de aparición) y muestra a la derecha un dato secundario tabular (saldo, caducidad).
- **Quantity:** recibe cadenas decimales de la API, nunca `number`; muestra coma decimal y punto de miles es-EC, signo menos tipográfico, `+` opcional en el historial y la unidad atenuada. La entrada usa `inputMode="decimal"`, acepta coma o punto, normaliza a cadena con punto y muestra «Se registrará …» bajo el campo; la unidad va dentro del campo, a la derecha.

### Cards / Containers
- **Tarjeta:** superficie, `card`, sombra elevada, sin borde, 24 px de relleno (16 px en el móvil). Encabezado con Title a la izquierda y un enlace de acción a la derecha («Abrir Reactivos», «Ver movimientos»).
- **Tabla:** dentro de una tarjeta con recorte; encabezado en superficie con línea inferior, filas divididas por `line`, hover en lienzo, cifras a la derecha.
- **StatePanel:** vacío, error, sin permiso, módulo no disponible y sin conexión son estados distintos: icono en círculo tonal, título, qué pasa y, si cabe, una acción. Carga = Skeleton quieto que ocupa el lugar del contenido (en Inicio, con la forma de las tarjetas).

### Navigation
- **Escritorio:** elementos de 44 px en `control`, Body-lg e icono de 18 px; activo en `action-soft` con texto `action`; inactivos en tinta atenuada con hover hundido.
- **Móvil:** píldoras de 40 px en una fila desplazable bajo la barra, con los mismos colores.
- **Pestañas:** píldoras de 36 px sobre una pista hundida; la activa sube a superficie con sombra elevada.

### Acciones rápidas (Inicio)
Mosaicos de `card` de 112 px de alto como mínimo, con icono en círculo arriba y la etiqueta abajo. El primero, «Registrar salida», es primario (`action`); los demás van en superficie con icono sobre `action-soft`. Solo aparecen las acciones que el rol y el estado del módulo permiten. Pulsación con escala 0,98.

### Fila de actividad
Un movimiento como asiento: círculo hundido de 40 px con el icono del tipo, reactivo en Body medio y, debajo, lote · ubicación · hora · responsable en Meta; a la derecha, la cantidad con signo en negrita y el tipo en 12 px. En el móvil, el detalle se parte en dos líneas y el responsable va antes de la hora para que el recorte nunca lo oculte.

### Sheet (formularios de movimiento)
Radix Dialog sobre un velo de tinta al 25 %. En escritorio, panel flotante de 460 px con 16 px de margen al borde de la ventana y `card` en todas las esquinas; en el móvil, hoja inferior a todo el ancho con 92 dvh como máximo y `card` arriba. Encabezado con título y descripción, cuerpo desplazable, pie fijo con Cancelar (fantasma) y la acción primaria. Se monta de nuevo en cada apertura (formulario limpio, clave idempotente nueva) y queda montada al cerrar para animar la salida. Los errores generales van arriba, en un aviso `danger-soft`.

### Chips: Badge
Píldora de 12 px con tono neutral, info, éxito, aviso o peligro; siempre con texto. «Caducidad desconocida» es un Badge de aviso, nunca un gris.

### Avisos (Sonner)
Arriba a la derecha bajo la barra, en `panel` con borde de línea y sombra de superposición. Solo informan un resultado ya confirmado por el servidor.

### Movimiento implementado
- Curvas: `ease-out-expo` para pulsación, fundidos y menús; `ease-sheet` (cajón, sin rebote) para hojas.
- Superposiciones: fundido de entrada 180 ms y de salida 150 ms; menú `pop-in` 160 ms desde su origen.
- Hojas: 260 ms al entrar y 180 ms al salir, desde la derecha en escritorio y desde abajo en el móvil. Quedan fuera del rango de 150–200 ms de las superposiciones porque el ADR 0010 les asigna «spring sin rebote»; la curva de cajón lo aproxima.
- Las salidas son siempre más cortas que las entradas y usan curva de salida.
- `prefers-reduced-motion`: hojas y menús pasan a fundidos (180/150 ms); se quitan desplazamientos y escalas, no los fundidos.
- Sin bucles: esqueletos quietos; no se animan filas ni escritura. Los únicos desplazamientos sueltos son de 2 px en las flechas de los enlaces al pasar.

## Do's and Don'ts

### Do:
- **Do** usar los tokens semánticos de `packages/ui/src/styles.css`; nunca un color literal en un componente.
- **Do** construir pantallas con paneles blancos flotantes sobre el lienzo: tarjeta en `card` con sombra elevada, sin borde.
- **Do** mostrar toda cantidad con Quantity: cadena decimal, coma es-EC, cifras tabulares, unidad atenuada.
- **Do** reservar Display para el título de página y Metric para contadores reales enlazados a su vista.
- **Do** agrupar el inventario producto → lote → ubicación con el total por reactivo, y pasar a lista apilada por debajo de 768 px.
- **Do** registrar movimientos en una Sheet con una sola acción primaria al pie.
- **Do** mostrar «Actualizado hace…» con un botón Actualizar; nunca prometer «en vivo».
- **Do** diseñar carga, vacío, error, sin permiso y módulo no disponible como estados distintos con StatePanel.

### Don't:
- **Don't** usar UI optimista sobre existencias: la tabla se refresca con lo confirmado por el servidor.
- **Don't** ofrecer «deshacer» en un movimiento confirmado: se corrige con otro movimiento (ajuste).
- **Don't** comunicar un estado solo con color ni pintar los tipos de movimiento con colores de alerta.
- **Don't** mostrar acciones que el rol no permite: se ocultan y la API las rechaza igual.
- **Don't** usar imágenes decorativas, vidrio, gráficos sin dato ni métricas inventadas (ADR 0010, 02-10-2026).
- **Don't** animar en bucle, animar filas ni usar rebote.
- **Don't** pasar una cantidad por `number` en la interfaz.
