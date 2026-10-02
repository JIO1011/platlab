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
  headline:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.556
    letterSpacing: "-0.01em"
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
  control: "8px"
  panel: "12px"
  card: "14px"
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
  nav-item-active:
    backgroundColor: "{colors.action-soft}"
    textColor: "{colors.action}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
---

# Design System: PlatLab

> **Fuentes que mandan.** Este archivo describe lo construido y enlaza; no copia.
> Dirección visual: [docs/01_producto.md §7 «Dirección visual»](docs/01_producto.md#7-cómo-se-ve-la-plataforma).
> Stack y frontend: [docs/02_arquitectura.md §2](docs/02_arquitectura.md#2-stack) y [§8](docs/02_arquitectura.md#8-frontend).
> Sistema de diseño y movimiento: [ADR 0010](docs/05_decisiones.md#adr-0010).
> **Tokens:** la única fuente es [`packages/ui/src/styles.css`](packages/ui/src/styles.css). Los valores del encabezado YAML se derivan de ese archivo para las herramientas de diseño; si difieren, manda `styles.css`.

## Overview

**Creative North Star: "El libro de saldos"**

Cada pantalla responde primero «¿cuánto hay, dónde y quién lo movió?». La interfaz es una herramienta de trabajo densa y tranquila: lienzo frío, paneles blancos con borde fino, una sola voz de acción y cifras grandes alineadas a la derecha con su unidad. El historial se lee como un libro: nada se edita, todo queda firmado. La dirección y sus motivos están en 01 §7 y en el ADR 0010.

**Key Characteristics:**
- El saldo es la columna dominante; las cantidades llevan siempre su unidad atenuada.
- Una acción primaria por sección; el resto son botones secundarios o fantasma.
- Profundidad por tono y borde fino; sombra solo en paneles y superposiciones.
- El servidor confirma antes de que la pantalla cambie.

## Colors

Neutros fríos azul pizarra con un único azul de acción; los estados solo aparecen como pareja de color suave y texto.

### Primary
- **Azul de acción** (`action`): botón primario, enlace, foco, cursor de escritura, pestaña activa. Sus variantes `action-hover` y `action-pressed` son estados del mismo botón; `action-soft` es el fondo de selección, del elemento de navegación activo y de la opción resaltada.

### Neutral
- **Lienzo** (`canvas`): fondo de la aplicación y hover de fila.
- **Superficie** (`surface`): paneles, hojas, campos, barra superior.
- **Superficie hundida** (`surface-sunken`): encabezado de tabla, hover de botón secundario o fantasma, esqueletos y campos deshabilitados.
- **Tinta** (`ink`): texto principal y cifras. **Tinta atenuada** (`ink-muted`): metadatos, unidades, ayudas. **Tinta tenue** (`ink-subtle`): marcadores de posición, «(opcional)», saldos en cero.
- **Línea** (`line`): divisores y bordes de panel. **Línea fuerte** (`line-strong`): borde de campos y botón secundario.

### Estados
- **Éxito / Aviso / Peligro** (`success`, `warning`, `danger` con su `-soft`): texto sobre su fondo suave. Peligro también marca el borde del campo inválido.

### Named Rules
**La regla de la voz única.** Solo `action` invita a actuar. Los tipos de movimiento (ingreso, salida, ajuste) no son estados: se distinguen por icono y texto, nunca con colores de alerta.

**La regla del texto obligatorio.** Ningún estado se comunica solo con color: todo Badge y todo aviso lleva texto.

## Typography

**Fuente:** Inter Variable (con ui-sans-serif, system-ui), con `cv11` y `ss01` activos en el cuerpo.

**Character:** una sola familia con peso y tamaño como únicas palancas; cifras tabulares en toda cantidad.

### Hierarchy
- **Headline** (600, 24 px, −0.02em): título de página («Reactivos», «Inicio»).
- **Title** (600, 18 px, −0.01em): título de hoja y total por reactivo.
- **Body** (400–500, 14 px): tablas, campos, botones, navegación.
- **Meta** (400, 13 px): «Actualizado hace…», ayudas y errores de campo, código y CAS.
- **Label** (600, 12 px, 0.04em, mayúsculas): solo encabezados de columna de tabla. Badge y títulos de grupo del Select usan 12 px sin mayúsculas.

### Named Rules
**La regla de la cifra tabular.** Toda cantidad, saldo o detalle numérico usa `tabular-nums` y se alinea a la derecha.

## Layout

- **Shell:** barra superior fija de 56 px (espacio actual que nunca se recorta, persona, Salir) y navegación lateral de 224 px dentro de un contenedor de 1400 px; el contenido de página se limita a 72 rem (`max-w-6xl`). Por debajo de 768 px la navegación pasa a una fila desplazable bajo la barra.
- **Ritmo:** escala de 4 px. Página con 16/32 px de margen lateral (móvil/escritorio), 24 px entre bloques, 20 px entre campos de formulario, 24 × 20 px de relleno en hojas.
- **Inventario producto → lote → ubicación:** en escritorio, un `tbody` por reactivo; su fila de encabezado muestra nombre, código y CAS, y el total del reactivo en Title; debajo, una fila por lote y ubicación con sangría de 32 px, caducidad y saldo. Por debajo de 768 px la tabla se sustituye por una lista apilada: reactivo con total a la derecha y, debajo, sus lotes con sangría y borde izquierdo. Las acciones por fila son botones fantasma pequeños.
- **Barra de página:** título a la izquierda y acciones a la derecha; en el móvil la primaria pasa al primer lugar.

## Elevation & Depth

Híbrido sobrio: la profundidad se construye con tono (lienzo → superficie → hundida) y borde fino. Dos sombras con el tinte de `ink`, definidas en `styles.css`.

### Shadow Vocabulary
- **Elevada** (`shadow-raised`): paneles de tabla y botón primario; apenas un contacto.
- **Superposición** (`shadow-overlay`): hojas, menú del Select y avisos.

### Named Rules
**La regla del contacto.** Las sombras no decoran: solo separan lo que flota (superposiciones) o lo que se trabaja (panel de tabla).

## Shapes

Radios por papel, no por tamaño: `control` (8 px) en botones, campos, avisos en línea y navegación; `panel` (12 px) en paneles de tabla y avisos; `card` (14 px) en tarjetas de Inicio y en el borde expuesto de la hoja; píldora en Badge e icono de StatePanel. Opciones del Select y esqueletos usan 6 px. Bordes de 1 px; el borde discontinuo marca solo el aviso vacío de Inicio.

## Components

### Buttons
- **Forma:** `control`; alturas de 32, 40 y 36 px (pequeño, normal, icono); iconos de 16 px.
- **Primario:** `action` sobre `on-action` con sombra elevada. **Secundario** (por defecto): superficie con línea fuerte. **Fantasma:** tinta atenuada, fondo hundido al pasar.
- **Estados:** transición de 150 ms con `ease-out-expo` y escala 0,98 al pulsar (solo con movimiento permitido). `loading` deshabilita, anuncia `aria-busy` y no cambia el ancho.

### Inputs / Fields
- **Field** da la etiqueta, la ayuda permanente y el error, y los entrega por contexto (`useFieldControl`): un control envuelto (Controller, campo con unidad) sigue unido a su etiqueta. «(opcional)» se escribe en la etiqueta; el error tiene `role="alert"` y dice cómo resolverlo.
- **Estilo:** superficie, línea fuerte, `control`, 40 px. Foco: borde `action` y anillo de 3 px al 20 %. Inválido: borde `danger`.
- **Select** (Radix): menú anclado a su origen con `pop-in`; agrupa opciones por título (p. ej., lotes bajo su reactivo, un grupo por nombre en orden de aparición) y muestra a la derecha un dato secundario tabular (saldo, caducidad).
- **Quantity:** recibe cadenas decimales de la API, nunca `number`; muestra coma decimal y punto de miles es-EC, signo menos tipográfico, `+` opcional en el historial y la unidad atenuada. La entrada usa `inputMode="decimal"`, acepta coma o punto, normaliza a cadena con punto y muestra «Se registrará …» bajo el campo; la unidad va dentro del campo, a la derecha.

### Sheet (formularios de movimiento)
Radix Dialog: lateral derecha de 460 px en escritorio, inferior con 92 dvh como máximo en el móvil. Encabezado con título y descripción, cuerpo desplazable, pie fijo con Cancelar (fantasma) y la acción primaria. Se monta de nuevo en cada apertura (formulario limpio, clave idempotente nueva) y queda montada al cerrar para animar la salida. Los errores generales van arriba, en un aviso `danger-soft`.

### Chips: Badge
Píldora de 12 px con tono neutral, info, éxito, aviso o peligro; siempre con texto. «Caducidad desconocida» es un Badge de aviso, nunca un gris.

### Cards / Containers: StatePanel
Vacío, error, sin permiso, módulo no disponible y sin conexión son estados distintos: icono en círculo tonal, título, qué pasa y, si cabe, una acción. Carga = Skeleton quieto que ocupa el lugar del contenido.

### Navigation
Elemento activo en `action-soft` con texto `action`; inactivos en tinta atenuada con hover hundido. Pestañas subrayadas con 2 px de `action` en la activa.

### Avisos (Sonner)
Arriba a la derecha bajo la barra, en `panel` con sombra de superposición. Solo informan un resultado ya confirmado por el servidor.

### Movimiento implementado
- Curvas: `ease-out-expo` para pulsación, fundidos y menús; `ease-sheet` (cajón, sin rebote) para hojas.
- Superposiciones: fundido de entrada 180 ms y de salida 150 ms; menú `pop-in` 160 ms desde su origen.
- Hojas: 260 ms al entrar y 180 ms al salir. Quedan fuera del rango de 150–200 ms de las superposiciones porque el ADR 0010 les asigna «spring sin rebote»; la curva de cajón lo aproxima.
- Las salidas son siempre más cortas que las entradas y usan curva de salida.
- `prefers-reduced-motion`: hojas y menús pasan a fundidos (180/150 ms); se quitan desplazamientos y escalas, no los fundidos.
- Sin bucles: esqueletos quietos; no se animan filas ni escritura.

## Do's and Don'ts

### Do:
- **Do** usar los tokens semánticos de `packages/ui/src/styles.css`; nunca un color literal en un componente.
- **Do** mostrar toda cantidad con Quantity: cadena decimal, coma es-EC, cifras tabulares, unidad atenuada, alineada a la derecha.
- **Do** agrupar el inventario producto → lote → ubicación con el total por reactivo, y pasar a lista apilada por debajo de 768 px.
- **Do** registrar movimientos en una Sheet con una sola acción primaria al pie.
- **Do** mostrar «Actualizado hace…» con un botón Actualizar; nunca prometer «en vivo».
- **Do** diseñar carga, vacío, error, sin permiso y módulo no disponible como estados distintos con StatePanel.

### Don't:
- **Don't** usar UI optimista sobre existencias: la tabla se refresca con lo confirmado por el servidor.
- **Don't** ofrecer «deshacer» en un movimiento confirmado: se corrige con otro movimiento (ajuste).
- **Don't** comunicar un estado solo con color ni pintar los tipos de movimiento con colores de alerta.
- **Don't** mostrar acciones que el rol no permite: se ocultan y la API las rechaza igual.
- **Don't** animar en bucle, animar filas ni usar rebote.
- **Don't** pasar una cantidad por `number` en la interfaz.
