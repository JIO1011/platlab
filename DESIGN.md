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
    padding: "0 14px"
    height: "40px"
  module-switcher:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "48px"
  module-switcher-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "40px"
  dropdown-menu:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "4px"
  dropdown-menu-item:
    textColor: "{colors.ink}"
    padding: "0 10px"
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
  module-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
    height: "256px"
  module-card-icon:
    backgroundColor: "{colors.action-soft}"
    textColor: "{colors.action}"
    rounded: "{rounded.control}"
    size: "40px"
  stat-link:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px 20px"
  stat-link-lg:
    padding: "24px"
  chart-bar:
    backgroundColor: "{colors.action}"
    width: "24px"
  chart-tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  filter-chip:
    backgroundColor: "{colors.action-soft}"
    textColor: "{colors.action}"
    rounded: "{rounded.pill}"
    padding: "0 4px 0 14px"
    height: "36px"
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
> Inicio como tablero y cada módulo como app: [ADR 0011](docs/05_decisiones.md#adr-0011).
> **Tokens:** la única fuente es [`packages/ui/src/styles.css`](packages/ui/src/styles.css). Los valores del encabezado YAML se derivan de ese archivo para las herramientas de diseño; si difieren, manda `styles.css`.

## Overview

**Creative North Star: "El libro de saldos", en precisión suave**

Cada pantalla responde primero «¿cuánto hay, dónde y quién lo movió?». La interfaz es una herramienta de trabajo tranquila: lienzo frío con un brillo leve desde arriba a la izquierda, paneles blancos flotantes de esquinas amplias y sombras suaves en capas, una sola voz de acción y cifras grandes con su unidad. La navegación y la barra superior también son paneles que flotan sobre el lienzo. El Inicio es un tablero con una tarjeta por módulo, y cada módulo se usa como una app propia con su menú. El historial se lee como un libro: nada se edita, todo queda firmado. La dirección y sus motivos están en 01 §7 y en los ADR 0010 y 0011.

**Key Characteristics:**
- El saldo es la columna dominante; las cantidades llevan siempre su unidad atenuada.
- Títulos y contadores grandes; el cuerpo sigue siendo denso y legible.
- Una acción primaria por sección; el resto son botones secundarios o fantasma.
- Profundidad por paneles flotantes con sombra en capas, nunca por halos, vidrio ni imágenes.
- Gráficos de una sola serie en `action`, solo con datos reales y siempre con una lectura en texto.
- El servidor confirma antes de que la pantalla cambie.

## Colors

Neutros fríos azul pizarra con un único azul de acción; los estados solo aparecen como pareja de color suave y texto.

### Primary
- **Azul de acción** (`action`): botón primario, enlace, foco, cursor de escritura, la marca, las barras de los gráficos y el recuadro del icono en el selector de módulo. Sus variantes `action-hover` y `action-pressed` son estados del mismo botón; `action-soft` es el fondo de selección, del elemento de navegación activo, de la opción resaltada del Select y del DropdownMenu, del icono de la tarjeta de módulo, de la etiqueta de filtro y del hover de «Actualizar».

### Neutral
- **Lienzo** (`canvas`): fondo de la aplicación bajo un degradado radial blanco fijo en la esquina superior izquierda; también hover de fila y de la lista de espacios, y fondo del recuadro de cuentas de demo.
- **Superficie** (`surface`): paneles, tarjetas, barra lateral, barra superior, hojas, campos, encabezado de tabla y pestaña activa.
- **Superficie hundida** (`surface-sunken`): pista de las pestañas, hover de botón secundario, fantasma y navegación, círculo de icono de las filas de actividad, esqueletos y campos deshabilitados.
- **Tinta** (`ink`): texto principal y cifras; también el fondo de la información emergente de los gráficos, con texto en `surface`. **Tinta atenuada** (`ink-muted`): metadatos, unidades, ayudas, navegación inactiva. **Tinta tenue** (`ink-subtle`): marcadores de posición, «(opcional)», saldos en cero.
- **Línea** (`line`): divisores internos de tarjetas y tablas, bordes de hojas y de los menús (Select y DropdownMenu), líneas guía de los gráficos y base del minigráfico. **Línea fuerte** (`line-strong`): borde de campos y del botón secundario, y la línea de cero de TrendChart.

### Estados
- **Éxito / Aviso / Peligro** (`success`, `warning`, `danger` con su `-soft`): texto sobre su fondo suave. Peligro también marca el borde del campo inválido.

### Named Rules
**La regla de la voz única.** Solo `action` invita a actuar. Los tipos de movimiento (ingreso, salida, ajuste) no son estados: se distinguen por icono y texto, nunca con colores de alerta.

**La regla del texto obligatorio.** Ningún estado se comunica solo con color: todo Badge y todo aviso lleva texto.

**La regla de la serie única.** Un gráfico muestra una sola serie, en `action`, sin leyenda: el título la nombra.

## Typography

**Fuente:** Inter Variable (con ui-sans-serif, system-ui), con `cv11` y `ss01` activos en el cuerpo.

**Character:** una sola familia; el tamaño grande y el tracking cerrado dan la voz a títulos y cifras, el peso y el tono separan el resto. Cifras tabulares en toda cantidad.

### Hierarchy
- **Display** (600, fluido de 32 a 44 px, interlínea 1,1, −0.03em): título de página y saludo de Inicio («Buenos días, …», «Reactivos» en el Resumen, el nombre de la sección en las demás, «Inicia sesión», «Elige un espacio de trabajo»).
- **Metric** (600, 40 px; interlínea 1, −0.03em, tabulares): cifras de StatLink desde 1024 px. **Metric-sm** (34 px): cifras de las tarjetas de módulo de Inicio en todos los anchos y de StatLink por debajo de 1024 px. Siempre enlazadas a la vista que las explica.
- **Title** (600, 18 px, −0.01em): título de hoja y de tarjeta (nombre del módulo en Inicio, «Salidas por día», «Actividad reciente»), total por reactivo.
- **Body-lg** (400–600, 15 px, interlínea 1,45): navegación de escritorio, nombre del módulo en el selector, nombre del espacio en la barra y fecha bajo el saludo.
- **Body** (400–500, 14 px): tablas, campos, botones, navegación del móvil, etiquetas de las cifras y de StatLink, etiqueta de filtro.
- **Meta** (400, 13 px): «Actualizado hace…», ayudas y errores de campo, código y CAS, detalle de las filas de actividad, frase bajo el minigráfico y tabla de datos del gráfico.
- **Label** (600, 12 px, 0.04em, mayúsculas): solo encabezados de columna de tabla. Badge, títulos de grupo del Select, tipo de movimiento, ejes e información emergente de los gráficos usan 12 px sin mayúsculas.

### Named Rules
**La regla de la cifra tabular.** Toda cantidad, saldo o contador usa `tabular-nums`; en tablas y filas se alinea a la derecha.

**La regla del tamaño con dato.** Las cifras grandes (Metric) solo muestran datos reales del servidor y llevan a su vista; nunca una métrica decorativa.

## Layout

- **Shell flotante:** desde 768 px, el lienzo deja 16 px de margen y 8 px entre columnas. La barra lateral (240 px) es un panel fijo con la marca y la navegación, de la altura de la ventana menos los márgenes. La barra superior es un panel fijo de 56 px como mínimo con el espacio actual a la izquierda (el propio selector cuando hay varios espacios; nunca se recorta) y, a la derecha, el nombre de la persona y «Salir». Por debajo de 768 px desaparece la barra lateral y la barra superior muestra el espacio y «Salir» solo con icono.
- **Dos modos de navegación (ADR 0011):** en la plataforma, el menú solo tiene «Inicio» y los módulos se abren desde sus tarjetas. Dentro de un módulo, el menú es el de esa app: «← Inicio», el selector de módulo y las secciones del manifiesto, debajo de una línea. En el móvil, dentro de un módulo, una flecha de regreso de 40 px sustituye a la marca compacta, y bajo la barra corre una fila con el selector de módulo compacto fijo a la izquierda y las secciones en píldoras desplazables a su derecha; una máscara desvanece los dos bordes (12 px a la izquierda, 40 px a la derecha), la barra de desplazamiento se oculta y la sección actual se trae a la vista en cada navegación. En la plataforma, el móvil no tiene fila de píldoras.
- **Contenido:** limitado a 72 rem (`max-w-6xl`), con 16/24 px de margen lateral (móvil/escritorio) y 24/32 px sobre el título.
- **Inicio como tablero:** saludo Display con la fecha debajo y, 32 px más abajo, una rejilla `repeat(auto-fill, minmax(min(100%, 20rem), 1fr))` con 16 px de separación: una tarjeta de módulo de 20 rem como mínimo, que junto a la barra lateral de la tableta no se estrecha y en el móvil ocupa todo el ancho. La carga reproduce la rejilla con esqueletos de 256 px.
- **Cabecera de la app de módulo:** título Display y, debajo, «Actualizado hace…» en Meta con el enlace «Actualizar»; las acciones van a la derecha y bajan si no caben. La marca de tiempo es la más antigua de las consultas que la sección muestra, nunca la más fresca. Por debajo de 1024 px, las acciones forman una rejilla de dos columnas: la primaria primero y a todo el ancho; si las secundarias son impares, la última también toma la fila entera.
- **Resumen de un módulo:** tres StatLink (en columna, 12 px entre ellos, por debajo de 1024 px; tres columnas con 16 px desde 1024 px) y, debajo, una rejilla de 12 columnas desde 1024 px: el gráfico (7 columnas) y la actividad reciente (5), alineados arriba. Las tarjetas del Resumen tienen 20 px de relleno y 24 px desde 640 px.
- **Inventario producto → lote → ubicación:** en escritorio, un `tbody` por reactivo dentro de una tarjeta; su fila de encabezado muestra nombre, código y CAS, y el total del reactivo en Title; debajo, una fila por lote y ubicación con sangría de 32 px, caducidad y saldo. Por debajo de 1024 px la tabla se sustituye por una lista apilada: reactivo con total a la derecha y, debajo, sus lotes con sangría y borde izquierdo. Las acciones por fila son botones fantasma pequeños (44 px de alto por debajo de 1024 px).
- **Movimientos:** por debajo de 1024 px, filas de actividad en lugar de tabla, con el motivo o destino en una línea Meta alineada al texto. Un filtro activo aparece como etiqueta quitable encima de la tarjeta.
- **Pantallas de entrada:** acceso en una tarjeta centrada de 420 px; selector de espacio en una columna de 520 px con la lista en una tarjeta.
- **Consultas de contenedor:** las piezas que viven tanto en una columna estrecha como a todo el ancho se adaptan a su contenedor, no a la ventana: la fila de actividad (desde 36 rem, `@xl`) y el eje X de TrendChart (marcas semanales desde 32 rem, `@lg`).
- **Ritmo:** escala de 4 px. 16 px entre tarjetas de Inicio y del Resumen; 24 px de relleno en tarjetas (20 px en el Resumen por debajo de 640 px y 16 px en la lista apilada), 24 × 20 px en hojas.

## Elevation & Depth

La profundidad viene de paneles blancos que flotan sobre el lienzo, no de bordes: las tarjetas y barras no llevan borde, solo sombra. Tres sombras en capas con el tinte de `ink`, definidas en `styles.css`. El lienzo recibe un degradado radial blanco, fijo, desde la esquina superior izquierda.

### Shadow Vocabulary
- **Elevada** (`shadow-raised`): tarjetas de contenido (tarjetas de módulo, StatLink, gráfico, actividad, tablas de Reactivos), botón primario, selector de módulo compacto y pestaña activa.
- **Flotante** (`shadow-float`): el shell (barra lateral y barra superior), las tarjetas de las pantallas de entrada (acceso, lista de espacios) y el estado de hover de las tarjetas-enlace (tarjeta de módulo y StatLink), con transición de 150 ms.
- **Superposición** (`shadow-overlay`): hojas, menús (Select y DropdownMenu), información emergente de los gráficos y avisos.

### Named Rules
**La regla de la capa justa.** Cada sombra dice a qué capa pertenece la pieza: contenido (elevada), estructura (flotante) o algo que se abrió encima (superposición). Ninguna sombra es un halo de color ni se usa para decorar. La única sombra que cambia por estado es la de una tarjeta que es enlace entero: sube de elevada a flotante al pasar el puntero.

## Shapes

Radios por papel, no por tamaño: `control` (10 px) en botones, campos, navegación de escritorio y avisos en línea; `panel` (20 px) en la barra superior, avisos de Sonner, contadores y filas de la lista de espacios; `card` (24 px) en tarjetas, tarjetas de módulo, StatLink, barra lateral y hojas; píldora en pestañas, navegación del móvil, selector de módulo compacto, etiqueta de filtro, Badge y círculos de icono. El icono de la tarjeta de módulo va en un recuadro `control` de 40 px. Opciones de los menús, esqueletos de línea, el enlace «Actualizar», el área enfocable del gráfico y el selector segmentado de las hojas usan 6 px; las barras de los gráficos, 4 px solo arriba. Bordes de 1 px solo en controles, divisores, líneas guía y superposiciones.

## Components

### Buttons
- **Forma:** `control`; alturas de 32, 40 y 36 px (pequeño, normal, icono); iconos de 16 px.
- **Primario:** `action` sobre `on-action` con sombra elevada. **Secundario** (por defecto): superficie con línea fuerte. **Fantasma:** tinta atenuada, fondo hundido al pasar.
- **Estados:** transición de 150 ms con `ease-out-expo` y escala 0,98 al pulsar (solo con movimiento permitido). `loading` deshabilita, anuncia `aria-busy` y no cambia el ancho.

### Inputs / Fields
- **Field** da la etiqueta, la ayuda permanente y el error, y los entrega por contexto (`useFieldControl`): un control envuelto (Controller, campo con unidad) sigue unido a su etiqueta. «(opcional)» se escribe en la etiqueta; el error tiene `role="alert"` y dice cómo resolverlo.
- **Estilo:** superficie, línea fuerte, `control`, 40 px. Foco: borde `action` y anillo de 3 px al 20 %. Inválido: borde `danger`.
- **Select** (Radix): menú en `control` con sombra de superposición, anclado a su origen con `pop-in`; agrupa opciones por título (p. ej., lotes bajo su reactivo, un grupo por nombre en orden de aparición) y muestra a la derecha un dato secundario tabular (saldo, caducidad).
- **DropdownMenu** (Radix): misma superficie y entrada que el Select (superficie, borde `line`, `control`, sombra de superposición, 4 px de relleno, `pop-in` desde su disparador, 6 px de separación, alineado al inicio y al menos tan ancho como el disparador). Opciones de 40 px en Body con icono de 16 px en tinta atenuada; la resaltada pasa a `action-soft`, como en el Select. Hoy lo usa el selector de módulo.
- **Quantity:** recibe cadenas decimales de la API, nunca `number`; muestra coma decimal y punto de miles es-EC, signo menos tipográfico, `+` opcional en el historial y la unidad atenuada. La entrada usa `inputMode="decimal"`, acepta coma o punto, normaliza a cadena con punto y muestra «Se registrará …» bajo el campo; la unidad va dentro del campo, a la derecha.

### Cards / Containers
- **Tarjeta:** superficie, `card`, sombra elevada, sin borde, 24 px de relleno. Encabezado con Title a la izquierda y, si cabe, un enlace de acción a la derecha («Ver movimientos»).
- **Tabla:** dentro de una tarjeta con recorte; encabezado en superficie con línea inferior, filas divididas por `line`, hover en lienzo, cifras a la derecha.
- **StatePanel:** vacío, error, sin permiso, módulo no disponible y sin conexión son estados distintos: icono en círculo tonal, título, qué pasa y, si cabe, una acción. Carga = Skeleton quieto que ocupa el lugar del contenido (en Inicio, con la forma de las tarjetas).

### Navigation
- **Escritorio:** elementos de 44 px en `control` y Body-lg; «Inicio» lleva icono de 18 px y las secciones de un módulo van sin icono. Activo en `action-soft` con texto `action`; inactivos en tinta atenuada con hover hundido.
- **Regreso «← Inicio»:** enlace fantasma de 36 px en Body y tinta atenuada, con flecha de 16 px, encima del selector de módulo. En el móvil, botón de icono de 40 px en el lugar de la marca.
- **Selector de módulo (ModuleSwitcher):** nombra el módulo actual y abre un DropdownMenu con las apps del miembro; la actual lleva una marca `action`. Normal, en la barra lateral: 48 px a todo el ancho, `control`, icono blanco sobre un recuadro `action` de 32 px, nombre en Body-lg semibold y doble chevron. Compacto, en el móvil: píldora de 40 px en superficie con sombra elevada, icono sobre un círculo `action` de 24 px y nombre en Body. Abierto o al pasar, superficie hundida.
- **Móvil:** píldoras de 40 px con los mismos colores, en la fila desplazable a la derecha del selector compacto.
- **Pestañas:** píldoras de 36 px sobre una pista hundida; la activa sube a superficie con sombra elevada. El componente sigue en `packages/ui`, pero desde el ADR 0011 las secciones del módulo son rutas del menú y la web no lo usa.

### Tarjeta de módulo (Inicio)
Una tarjeta-enlace por módulo: toda la tarjeta abre la app y no contiene otros enlaces. Superficie, `card`, 24 px de relleno, 256 px de alto como mínimo y sombra elevada que pasa a flotante al pasar. Arriba, el icono en un recuadro `action-soft` de 40 px, el nombre en Title y una flecha `action` que se desplaza 2 px al pasar. Abajo, dos cifras en un `dl` de dos columnas (Metric-sm sobre su etiqueta en Body atenuado), el minigráfico y una frase en Meta que dice el total («12 salidas en los últimos 30 días» o «Sin salidas en los últimos 30 días»). El enlace se nombra «Abrir {módulo}» y las cifras lo describen.

### StatLink (Resumen de un módulo)
Una cifra que abre la lista que la explica. Por debajo de 1024 px, fila compacta (16 × 20 px de relleno) con la etiqueta a la izquierda y la cifra Metric-sm a la derecha; desde 1024 px, tarjeta de 24 px de relleno con la etiqueta arriba y la cifra Metric debajo. El chevron de 16 px está siempre visible en tinta tenue y pasa a `action` al pasar o con foco; la sombra sube a flotante al pasar.

### Gráficos
- **Sparkline** (tarjeta de módulo): barras `action` de 24 px como máximo, 2 px de separación y 4 px de radio arriba, sobre una base `line`, en 48 px de alto. Es decorativo (`aria-hidden`) y sin interacción, porque la tarjeta entera es un enlace; la frase en texto es la lectura accesible.
- **TrendChart** (Resumen): una serie en `action`, con las mismas barras, en 160 px de alto (224 px desde 1024 px). Eje Y con 2 o 3 marcas enteras (0, la mitad si es entera y el máximo) en 12 px tabulares; líneas guía de 1 px en `line` y la de cero en `line-strong`, detrás de las barras. Eje X con el primer día y «Hoy», y marcas semanales cuando el contenedor mide 32 rem o más.
- **Interacción:** la columna entera es la zona de puntero. Al pasar el puntero, o con flechas, Inicio y Fin cuando el gráfico tiene el foco, la barra activa se mantiene y las demás bajan al 45 % de opacidad (150 ms); encima aparece la información emergente en `ink` con texto `surface`, `control` y sombra de superposición: la cifra en semibold y el día. Una región viva anuncia el mismo dato, el grupo se nombra con un resumen (total y día con más) y un `<details>` «Ver los datos en tabla» deja todos los puntos disponibles sin interactuar.
- **Sin datos:** no se dibuja un gráfico vacío; en su lugar va un texto (en el Resumen, sobre un recuadro hundido `panel`).

### Etiqueta de filtro (Movimientos)
Píldora `action-soft` de 36 px con texto `action` en Body medio («Salidas · últimos 30 días») y un botón de 28 px para quitarla, nombrado «Quitar el filtro: …». Con el filtro y sin resultados, el estado vacío lo dice y sugiere quitarlo.

### Fila de actividad
Un movimiento como asiento: círculo hundido de 40 px con el icono del tipo; en la primera línea, el reactivo en Body medio y la cantidad con signo en semibold; en la segunda, lote · ubicación en Meta y el tipo en 12 px. Se adapta a su contenedor, no a la ventana: desde 36 rem (`@xl`), responsable y fecha completa siguen al detalle en la misma línea; por debajo, bajan a una tercera línea con la fecha corta. El responsable siempre va antes que la hora, para que un recorte nunca oculte quién movió el stock.

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
- Tarjetas-enlace: la sombra cambia en 150 ms; las barras del gráfico atenúan su opacidad en 150 ms. La información emergente aparece sin animación.
- Sin bucles: esqueletos quietos; no se animan filas, barras ni escritura. Los únicos desplazamientos sueltos son de 2 px en las flechas de los enlaces al pasar.

## Do's and Don'ts

### Do:
- **Do** usar los tokens semánticos de `packages/ui/src/styles.css`; nunca un color literal en un componente.
- **Do** construir pantallas con paneles blancos flotantes sobre el lienzo: tarjeta en `card` con sombra elevada, sin borde.
- **Do** mostrar toda cantidad con Quantity: cadena decimal, coma es-EC, cifras tabulares, unidad atenuada.
- **Do** reservar Display para el título de página y Metric para contadores reales enlazados a su vista.
- **Do** dar a cada módulo una tarjeta-enlace en Inicio y, dentro, su propio menú con «← Inicio», el selector de módulo y sus secciones.
- **Do** hacer que un gráfico cuente sucesos (p. ej., salidas por día), en una sola serie `action`, con su lectura en texto, y una tabla cuando es interactivo.
- **Do** agrupar el inventario producto → lote → ubicación con el total por reactivo, y pasar a lista apilada por debajo de 1024 px.
- **Do** registrar movimientos en una Sheet con una sola acción primaria al pie.
- **Do** mostrar «Actualizado hace…», con la marca más antigua de lo que se ve, y un botón Actualizar; nunca prometer «en vivo».
- **Do** diseñar carga, vacío, error, sin permiso y módulo no disponible como estados distintos con StatePanel.

### Don't:
- **Don't** usar UI optimista sobre existencias: la tabla se refresca con lo confirmado por el servidor.
- **Don't** ofrecer «deshacer» en un movimiento confirmado: se corrige con otro movimiento (ajuste).
- **Don't** comunicar un estado solo con color ni pintar los tipos de movimiento con colores de alerta.
- **Don't** mostrar acciones que el rol no permite: se ocultan y la API las rechaza igual.
- **Don't** usar imágenes decorativas, vidrio, gráficos sin dato ni métricas inventadas (ADR 0010, 02-10-2026).
- **Don't** sumar en un gráfico o una cifra cantidades de unidades distintas, ni dibujar un gráfico vacío: sin datos, va un texto.
- **Don't** anidar enlaces dentro de una tarjeta que ya es enlace.
- **Don't** animar en bucle, animar filas ni usar rebote.
- **Don't** pasar una cantidad por `number` en la interfaz.
