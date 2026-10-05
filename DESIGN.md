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
  # Acción de la plataforma; dentro de un módulo, su bloque [data-module] redefine las cuatro.
  action: "#1f5f96"
  action-hover: "#1a5182"
  action-pressed: "#15426b"
  action-soft: "#e6eef7"
  on-action: "#ffffff"
  brand: "#1f5f96"
  canvas-glow: "#ffffff"
  # Tema de Reactivos: [data-module='reagents'] en styles.css.
  reagents-action: "#7c3aed"
  reagents-action-hover: "#6d28d9"
  reagents-action-pressed: "#5b21b6"
  reagents-action-soft: "#f1eafe"
  reagents-canvas-glow: "#f1e9ff"
  success: "#1d7a46"
  success-soft: "#e5f3ea"
  warning: "#8a5a00"
  warning-soft: "#fdf2d8"
  danger: "#b42318"
  danger-soft: "#fcebe9"
typography:
  display: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "clamp(2rem, 1.4rem + 1.6vw, 2.75rem)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.03em" }
  metric: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "2.5rem", fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em", fontFeature: "\"tnum\"" }
  metric-sm: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "2.125rem", fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em", fontFeature: "\"tnum\"" }
  title: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "18px", fontWeight: 600, lineHeight: 1.556, letterSpacing: "-0.01em" }
  body-lg: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 400, lineHeight: 1.45 }
  body: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: 1.429, fontFeature: "\"cv11\", \"ss01\"" }
  meta: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "13px", fontWeight: 400 }
  label: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em" }
  quantity: { fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "18px", fontWeight: 600, fontFeature: "\"tnum\"" }
rounded: { control: "10px", panel: "20px", card: "24px", pill: "9999px" }
spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" }
components:
  button-primary: { backgroundColor: "{colors.action}", textColor: "{colors.on-action}", rounded: "{rounded.control}", padding: "0 16px", height: "40px" }
  button-primary-hover: { backgroundColor: "{colors.action-hover}" }
  button-primary-active: { backgroundColor: "{colors.action-pressed}" }
  button-secondary: { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.control}", padding: "0 16px", height: "40px" }
  button-ghost: { textColor: "{colors.ink-muted}", rounded: "{rounded.control}", padding: "0 12px", height: "32px" }
  input: { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", rounded: "{rounded.control}", padding: "0 12px", height: "40px" }
  card: { backgroundColor: "{colors.surface}", rounded: "{rounded.card}", padding: "24px" }
  shell-sidebar: { backgroundColor: "{colors.surface}", rounded: "{rounded.card}", padding: "16px", width: "240px" }
  shell-topbar: { backgroundColor: "{colors.surface}", rounded: "{rounded.panel}", padding: "8px 24px", height: "56px" }
  nav-item-active: { backgroundColor: "{colors.action-soft}", textColor: "{colors.action}", rounded: "{rounded.control}", padding: "0 14px", height: "44px" }
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
> - Decisiones: [ADR 0010](docs/05_decisiones.md#adr-0010) (sistema, «precisión suave», color por módulo, tarjetas de catálogo), [ADR 0011](docs/05_decisiones.md#adr-0011) (Inicio como tablero, módulos como apps) y [ADR 0012](docs/05_decisiones.md#adr-0012) (por frasco, aprobación de salidas).
> - **Tokens:** la única fuente es [`packages/ui/src/styles.css`](packages/ui/src/styles.css); el YAML de arriba se deriva de él, y si difieren manda `styles.css`.
> - **Medidas y comportamiento de cada pieza:** manda su código, en [`packages/ui/src/components`](packages/ui/src/components) y [`apps/web/src/features`](apps/web/src/features). Este archivo solo fija lo que es norma. Las capturas de la última revisión están en `apps/web/.impeccable/review/`.

## Overview

**Creative North Star: «El libro de saldos», en precisión suave.** Cada pantalla responde primero «¿cuánto hay, dónde y quién lo movió?». Lienzo frío con un brillo leve, paneles blancos flotantes de esquinas amplias con sombras suaves en capas, una sola voz de acción por contexto y cifras grandes con su unidad. El historial se lee como un libro: nada se edita, todo queda firmado.

- El saldo es la columna dominante; las cantidades llevan siempre su unidad atenuada.
- Una acción primaria por sección; el resto, secundarias o fantasma.
- Profundidad por paneles flotantes con sombra, nunca por halos, vidrio ni imágenes.
- Gráficos de una sola serie, solo con datos reales y con lectura en texto.
- El servidor confirma antes de que la pantalla cambie.

## Colors

- **Acción** (`action` y sus tres variantes): una sola voz por contexto. Azul en la plataforma (Inicio, acceso); dentro de un módulo, su tema redefine los cuatro tokens. `action-soft` es el fondo de selección, de lo activo y de lo informativo.
- **Marca** (`brand`): solo el logotipo; no cambia con el tema del módulo.
- **Reactivos:** lila (`reagents-*`), activado con `[data-module='reagents']` en `<html>` para que lo hereden hojas, menús y avisos, que viven en portales.
- **Neutros:** `canvas` (fondo, con un degradado fijo de `canvas-glow`), `surface` (paneles), `surface-sunken` (pistas, hover, esqueletos), `ink` / `ink-muted` / `ink-subtle` (texto principal, atenuado, tenue), `line` / `line-strong` (divisores y bordes de campo).
- **Estados:** `success`, `warning`, `danger`, cada uno como texto sobre su `-soft`.
  - Lo pendiente de decidir va en ámbar y solo si existe: pastilla del filtro, aviso del Resumen, píldora del Inicio e insignia «Pendiente».
  - Una solicitud decidida es Aprobada (éxito), Rechazada (peligro) o Cancelada (neutro).
  - Lo apartado no es una alerta: va en `info`, el acento del módulo.

**Reglas con nombre**
- **Voz única.** Solo `action` invita a actuar. Los tipos de movimiento (ingreso, salida, ajuste) se distinguen por icono y texto, nunca con colores de alerta.
- **Texto obligatorio.** Ningún estado se comunica solo con color: todo Badge y todo aviso lleva texto.
- **Serie única.** Un gráfico muestra una serie, en `action`, sin leyenda: el título la nombra.
- **Acento por módulo.** El acento vive solo en los tokens de cada módulo; los componentes no llevan colores de módulo literales. Verde, ámbar y rojo son de estado y ningún módulo ni tipo de ítem los usa como color propio. Cada acento se valida para WCAG AA y cada módulo registrado tiene su bloque (lo exige `packages/modules/src/define-module.test.ts`).

## Typography

Inter Variable, una sola familia. El tamaño y el tracking cerrado dan la voz a títulos y cifras; el peso y el tono separan el resto.

| Escala | Uso |
|---|---|
| Display (32–44 px fluido) | título de página y saludo |
| Metric (40 px) y Metric-sm (34 px) | cifras que abren o encabezan la vista que las explica |
| Title (18 px) | título de hoja, tarjeta y sección; saldo de un frasco |
| Body-lg (15 px) · Body (14 px) | navegación de escritorio; tablas, campos y botones |
| Meta (13 px) | «Actualizado hace…», ayudas, código, CAS, detalles |
| Label (12 px, mayúsculas) | encabezados de columna y rótulos de tarjeta de catálogo |

**Reglas con nombre**
- **Cifra tabular.** Toda cantidad, saldo o contador usa `tabular-nums`; en tablas y filas se alinea a la derecha.
- **Tamaño con dato.** Las cifras grandes solo muestran datos reales del servidor y llevan a su vista; nunca una métrica decorativa.
- **Escala que no se pierde.** Las clases se combinan con `cn` de `packages/ui`, que enseña a tailwind-merge la escala propia (`display`, `metric`, `metric-sm`, `body-lg`). Un tamaño nuevo en `styles.css` se añade también a `cn.ts`.

## Layout

- **Shell flotante** desde 768 px: barra lateral de 240 px y barra superior de 56 px como paneles sobre el lienzo. Por debajo, solo la barra superior.
- **Dos modos de navegación (ADR 0011).** En la plataforma, el menú es «Inicio»; los módulos se abren desde sus tarjetas. Dentro de un módulo, el menú es el de esa app: «← Inicio», el selector de módulo y las secciones del manifiesto. En el móvil, una fila de píldoras desplazables junto al selector compacto, con la sección actual siempre a la vista.
- **Inicio** es un tablero con una tarjeta-enlace por módulo, de 20 rem como mínimo. **Entrada directa:** se abre el último espacio usado y se cambia desde la barra; no hay pantalla para elegir.
- **Cabecera de módulo:** título Display, «Actualizado hace…» con la marca más antigua de lo que se ve y las acciones a la derecha. Por debajo de 1024 px, las acciones van en dos columnas con la primaria primero y a todo el ancho.
- **Inventario en dos niveles (ADR 0012):** no hay tabla. Rejilla de tarjetas de reactivo y, en su ficha, una tarjeta por frasco. Solicitudes: una tarjeta por solicitud, en una columna.
- **Movimientos:** tabla desde 1024 px; por debajo, filas de actividad.
- **Contenido** de hasta 72 rem. **Ritmo** en escala de 4 px; 16 px entre tarjetas.
- **Consultas de contenedor:** las piezas que viven en columnas estrechas y anchas (fila de actividad, eje X del gráfico) se adaptan a su contenedor, no a la ventana.

## Elevation & Depth

La profundidad viene de paneles blancos que flotan, no de bordes: tarjetas y barras llevan sombra y no borde. Tres sombras con el tinte de `ink`, en `styles.css`.

- **Elevada** (`shadow-raised`): contenido (tarjetas, botón primario, opción activa de un selector segmentado).
- **Flotante** (`shadow-float`): estructura (barras laterales y superior, tarjeta de acceso) y el hover de una tarjeta-enlace.
- **Superposición** (`shadow-overlay`): lo que se abre encima (hojas, menús, avisos, información emergente).

**La regla de la capa justa.** Cada sombra dice a qué capa pertenece la pieza; ninguna es un halo de color ni decora. La única sombra que cambia por estado es la de un enlace entero: una tarjeta sube de elevada a flotante al pasar el puntero (el aviso ámbar del Resumen, plano en reposo, toma la elevada).

## Shapes

Radios por papel, no por tamaño: `control` (10 px) en botones, campos y navegación; `panel` (20 px) en la barra superior y los avisos; `card` (24 px) en tarjetas, barra lateral y hojas; píldora en etiquetas, filtros, Badge y atajos. Bordes de 1 px solo en controles, divisores y superposiciones.

## Components

Cada pieza vive en `packages/ui/src/components` o en su función de `apps/web/src/features`. Lo que sigue es lo que debe respetar cualquier pieza nueva.

- **Buttons.** Primario (`action`, con sombra elevada), secundario (por defecto) y fantasma. Pulsación de 150 ms; `loading` deshabilita sin cambiar el ancho.
- **Field y Select.** El Field da etiqueta, ayuda y error y los entrega por contexto, así que un control envuelto sigue unido a su etiqueta. El error tiene `role="alert"` y dice cómo resolverlo. El Select y el DropdownMenu (Radix) comparten superficie y entrada.
- **Quantity.** Recibe cadenas decimales de la API, nunca `number`: coma es-EC, punto de miles, signo menos tipográfico y unidad atenuada. Una cantidad que la interfaz escribe en un campo usa `toDecimalInput` (coma decimal, sin miles), porque «2.257» volvería como 2,257.
- **ChoiceField.** Motivo y destino se eligen de la lista del laboratorio, con píldoras de radio dentro de un `fieldset`; quien puede ampliar la lista ve «Agregar». Texto libre solo si la lista está vacía y no puede ampliarla.
- **StatePanel y Skeleton.** Vacío, error, sin permiso, módulo no disponible y sin conexión son estados distintos. La carga es un esqueleto quieto con `role="status"`, de la forma del contenido.
- **Tabla.** Dentro de una tarjeta, cifras a la derecha. Una salida aprobada muestra a quien aprobó y, debajo, «Pidió X».
- **IconChip** (`packages/ui`). Icono sobre fondo suave en `control`. Tonos `accent` (toma el color del módulo), `neutral` y de estado; tamaños `md` y `sm`. Decorativo (`aria-hidden`): el significado va en el texto de al lado.
- **Tarjeta de catálogo (ADR 0010, 04-10-2026).** Es el patrón de toda tarjeta de catálogo de cualquier módulo; hoy lo usa la de reactivo. Tarjeta-enlace con IconChip (el icono sale de un dato real, como el estado físico), rótulo en Label con el dato de identidad a la derecha, nombre y código, una línea y la fila «Total» con una píldora con icono; la cifra va en `action`. Sin existencias pasa a chip neutro y píldora ámbar con icono y texto.
- **Tarjeta de módulo (Inicio).** Tarjeta-enlace con IconChip, nombre, cifras reales, un minigráfico y una frase de texto. Si hay pendientes, una píldora ámbar los dice y la tarjeta los anuncia con `aria-describedby`. Lleva el `data-module` de su módulo.
- **Ficha del reactivo.** Resumen y una tarjeta por frasco: el código del frasco nunca se parte y la barra de % restante usa aritmética exacta (un frasco con menos del 1 % dice «<1 %» y conserva un trazo visible). «Salida» solo con saldo disponible, es decir, el saldo menos lo apartado.
- **Hojas de movimiento (Sheet).** Radix Dialog; panel flotante en escritorio y hoja inferior en el móvil. Se monta de nuevo en cada apertura, con formulario limpio y clave idempotente nueva. Una sola acción primaria al pie. La salida ofrece atajos de cantidad, «Quedarán X», el aviso de frasco vencido (se permite) y la sugerencia FEFO. Para quien no aprueba se titula «Solicitar salida» y la cantidad queda apartada hasta que se decida.
- **Solicitudes.** Una tarjeta por solicitud con su estado en texto. Quien aprueba usa «Aprobar salida» (secundaria) y «Rechazar» (fantasma, con motivo obligatorio en línea); quien pidió solo ve «Cancelar solicitud». El filtro «Pendientes / Todas» vive en la URL.
- **Gráficos.** Una serie en `action`, con su lectura en texto, y una tabla de datos cuando es interactivo. Sin datos no se dibuja un gráfico vacío: va un texto.
- **Avisos (Sonner).** Solo informan un resultado ya confirmado por el servidor. Si la pieza que lanza la acción se desmonta al confirmarse, el aviso se emite tras `mutateAsync`, no en los callbacks de `mutate`.

### Movimiento

`ease-out-expo` para pulsación, fundidos y menús; `ease-sheet` (cajón, sin rebote) para hojas. Superposiciones de 150–200 ms que nacen de su origen; hojas de 260 ms al entrar. Las salidas son más cortas que las entradas. Con `prefers-reduced-motion`, hojas y menús pasan a fundidos. No hay bucles ni se animan filas, barras o escritura.

## Do's and Don'ts

### Do
- **Do** usar los tokens semánticos de `styles.css`; nunca un color literal en un componente.
- **Do** mostrar toda cantidad con Quantity y calcular porcentajes, restas y atajos con `decimal.ts` (BigInt).
- **Do** reservar Display para el título de página y Metric para contadores reales enlazados a su vista.
- **Do** hacer toda tarjeta de catálogo con el patrón de la de reactivo y sacar su color del acento del módulo.
- **Do** dar a cada módulo nuevo su bloque `[data-module]` en `styles.css`, validado para AA, y su tarjeta en el Inicio.
- **Do** mostrar lo pendiente de decidir en ámbar y solo si existe, con la misma frase en el Resumen y en el Inicio.
- **Do** ofrecer motivo y destino como opciones de la lista del laboratorio.
- **Do** diseñar carga, vacío, error, sin permiso y módulo no disponible como estados distintos.
- **Do** mostrar «Actualizado hace…» con un botón Actualizar; nunca prometer «en vivo».

### Don't
- **Don't** usar UI optimista sobre existencias ni ofrecer «deshacer» en un movimiento confirmado: se corrige con otro movimiento.
- **Don't** comunicar un estado solo con color ni pintar los tipos de movimiento con colores de alerta.
- **Don't** dar color propio a un tipo de ítem, ni usar verde, ámbar o rojo como acento de módulo.
- **Don't** mostrar acciones que el rol no permite: se ocultan y la API las rechaza igual.
- **Don't** usar imágenes decorativas, vidrio, gráficos sin dato ni métricas inventadas.
- **Don't** sumar cantidades de unidades distintas ni pasar una cantidad por `number`; tampoco escribir en un campo una cantidad con `formatDecimal`.
- **Don't** anidar enlaces dentro de una tarjeta que ya es enlace.
- **Don't** animar en bucle, animar filas ni usar rebote.
