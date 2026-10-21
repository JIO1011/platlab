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
  # Tema de Reactivos (índigo): [data-module='reagents'] en styles.css.
  reagents-action: "#4f46e5"
  reagents-action-hover: "#4338ca"
  reagents-action-pressed: "#3730a3"
  reagents-action-soft: "#eef2ff"
  reagents-action-deep: "#6d28d9"
  # Tema de Equipos (azul): [data-module='equipment'].
  equipment-action: "#1967d2"
  equipment-action-deep: "#1e40af"
  # Tema de Mantenimiento (petróleo): [data-module='maintenance'].
  maintenance-action: "#0e7490"
  maintenance-action-deep: "#0c4a6e"
  # Tema de Laboratorios (fucsia): [data-module='labs'].
  labs-action: "#a21caf"
  labs-action-deep: "#701a75"
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

> **Fuentes que mandan.** Este archivo resume y enlaza; no copia.
> - Dirección visual: [01 §7](docs/01_producto.md#7-cómo-se-ve-la-plataforma) y [§6.1](docs/01_producto.md#61-inventario-de-reactivos-m2); stack: [02 §2](docs/02_arquitectura.md#2-stack) y [§8](docs/02_arquitectura.md#8-frontend).
> - Decisiones: [ADR 0010](docs/05_decisiones.md#adr-0010) (sistema, color por módulo), [0011](docs/05_decisiones.md#adr-0011) (Inicio como tablero), [0012](docs/05_decisiones.md#adr-0012) (por frasco, aprobación de salidas).
> - **Tokens:** la única fuente es [`packages/ui/src/styles.css`](packages/ui/src/styles.css); el YAML se deriva de él y, si difieren, manda `styles.css`.
> - **Medidas de cada pieza:** manda su código (`packages/ui/src/components`, `apps/web/src/features`). Aquí solo está la norma. Capturas de la última revisión: `apps/web/.impeccable/review/`.

## Overview

**Creative North Star: «El libro de saldos», con el diseño de ReactiLab.** Cada pantalla responde primero «¿cuánto hay, dónde y quién lo movió?». Lienzo gris pizarra neutro y plano (sin degradado, ADR 0021), tarjetas blancas de esquinas amplias con borde fino, una sola voz de acción por contexto y cifras grandes con su unidad. El historial se lee como un libro: nada se edita, todo queda firmado.

- El saldo es la columna dominante; las cantidades llevan siempre su unidad atenuada.
- Una acción primaria por sección; el resto, secundarias o fantasma.
- Profundidad por borde fino, sombra mínima y elevación al pasar el puntero.
- Gráficos de una sola serie, solo con datos reales y con lectura en texto.
- El servidor confirma antes de que la pantalla cambie.

## Colors

- **Acción** (`action` y variantes): una sola voz por contexto. Azul en la plataforma (Inicio, acceso); dentro de un módulo, su tema redefine los tokens, incluido `action-deep`. `action-soft` es el fondo de selección, chips de icono y lo informativo; el elemento activo del menú va relleno con `action`.
- **Marca** (`brand`): solo el logotipo; no cambia con el módulo.
- **Reactivos:** índigo (`reagents-*`) con `action-deep` violeta como extremo del degradado. El tema se activa con `[data-module]` en `<html>` para que lo hereden hojas, menús y avisos, que viven en portales.
- **Equipos y Mantenimiento** (ADR 0021): con el mismo esquema. El degradado se oscurece hacia un tono vecino, para que se note como en Reactivos.
  - Equipos va del azul al azul real, sin llegar al índigo; Mantenimiento, del petróleo al azul petróleo, sin ir al verde de los estados. Los extremos pasan AA con texto blanco.
  - Laboratorios usa fucsia (`#a21caf`, 6,3:1 con blanco) y su degradado va al ciruela `#701a75`: ni el violeta de Reactivos ni el rojo de los estados.
- **Neutros** (pizarra): `canvas` (fondo plano de toda la app), `surface` (paneles), `surface-sunken` (pistas, hover, esqueletos), `ink` / `ink-muted` / `ink-subtle` (texto principal, atenuado, tenue), `line` / `line-strong` (divisores y bordes de campo).
- **Estados:** `success`, `warning`, `danger`, cada uno como texto sobre su `-soft`.
  - Lo pendiente de decidir va en ámbar y solo si existe (pastilla, aviso del Resumen, píldora del Inicio, insignia).
  - Una solicitud decidida: Aprobada (éxito), Rechazada (peligro), Cancelada (neutro).
  - Lo apartado no es una alerta: va en `info`, el acento del módulo.

**Reglas con nombre**
- **Voz única.** Solo `action` invita a actuar (botones, enlaces, selección). Excepción acotada: la cifra con signo y el círculo de icono de la fila de actividad (salida en rojo, ingreso en verde, ajuste en acento), siempre con signo y tipo escritos. En ningún otro lugar los tipos de movimiento usan colores de estado.
- **Texto obligatorio.** Ningún estado se comunica solo con color: todo Badge y todo aviso lleva texto.
- **Serie única.** Un gráfico muestra una serie, en `action`, sin leyenda: el título la nombra. Excepción: «Incidentes en 12 meses» de Equipos (reportados en `action`, solucionados en `success`) en barras agrupadas por mes, con leyenda de cuadrados y texto ([ADR 0019](docs/05_decisiones.md#adr-0019)).
- **Acento por módulo.** Vive solo en los tokens del módulo; los componentes no llevan colores de módulo literales. Cada acento se valida para WCAG AA y cada módulo registrado tiene su bloque (lo exige `packages/modules/src/define-module.test.ts`).

## Typography

Inter Variable, una familia. El tamaño y el tracking cerrado dan la voz a títulos y cifras; el peso y el tono separan el resto.

| Escala | Uso |
|---|---|
| Display (32–44 px fluido, 700) | título de página y saludo |
| Stat (30 px, 700) | cifra de StatCard y total de la tarjeta de reactivo |
| Metric (40 px) y Metric-sm (34 px) | cifras que abren o encabezan la vista que las explica |
| Title (18 px) | título de hoja, tarjeta y sección; saldo de un frasco |
| Body-lg (15 px) · Body (14 px) | navegación de escritorio; tablas, campos y botones |
| Meta (13 px) | «Actualizado hace…», ayudas, código, CAS, detalles |
| Label (12 px, mayúsculas) | rótulos de tarjeta de catálogo; los encabezados de columna van en 13 px, peso medio y tipo oración, iguales en todas las tablas (ADR 0021) |

**Reglas con nombre**
- **Cifra tabular.** Toda cantidad, saldo o contador usa `tabular-nums`; en tablas y filas, alineada a la derecha.
- **Tamaño con dato.** Las cifras grandes son datos reales del servidor y llevan a su vista; nunca decorativas.
- **Escala que no se pierde.** Las clases se combinan con `cn` de `packages/ui`; un tamaño nuevo en `styles.css` se añade también a `cn.ts`.

## Layout

- **Shell anclado** desde 768 px: barra lateral de 288 px (borde derecho) y barra superior fija de 64 px, translúcida y con borde inferior. Bajo 768 px, solo la barra superior. Nada flota.
- **Barra lateral:** logotipo, tarjeta de la persona (nombre, espacio, rol real), rótulo del menú, elementos con icono (el activo, relleno con `action`) y «Salir» al pie.
  - La tarjeta es el selector de espacio ([ADR 0011](docs/05_decisiones.md#adr-0011)): con varios, abre el menú.
- **Navegación en dos modos.** En la plataforma, «Inicio» y los módulos desde sus tarjetas. Dentro de un módulo: «← Inicio», el selector de módulo y las secciones del manifiesto; en el móvil, píldoras desplazables.
- **Barra superior:** dice dónde se está («Reactivos › Inventario»); las migas de un nivel interior se suman con `useShellTrail`. «Volver» es un botón circular de 44 px fuera del membrete.
- **Densidad de módulo:** base de 15 px (`:root[data-module]`) en lugar de 16; casi todo está en `rem`. Inicio y acceso mantienen 16 px.
- **Cabecera de módulo:** título Display y «Actualizado hace…»; acciones a la derecha. «Escanear» (`ScanLine`) va en la cabecera de las secciones que lo usan, abre `openSheet({ kind: 'scan' })`.
- **Resumen de cada módulo** (ADR 0021): cuatro StatCard `compact` por urgencia enlazadas a su lista; debajo, dos columnas 7/5 desde `xl` (banda de acción rápida y gráfico; «Por atender» y actividad) y, al pie, avisos en tarjeta solo si su cuenta es mayor que cero.
- **Inventario en dos niveles:** rejilla de tarjetas y, en la ficha, el detalle de cada ítem.
- **Etiquetas QR** (ADR 0012, 0019): marco, hoja, barra inferior y modo con giro viven en `app/labels/`; cada módulo aporta solo el texto de su etiqueta. Hoja A4 adhesiva de 3 × 8, negro sobre blanco; al imprimir solo sale `.print-area`.
- **Contenido** de hasta 72 rem; ritmo de 4 px, 16 px entre tarjetas; consultas de contenedor en columnas estrechas.

## Elevation & Depth

Borde fino más sombra mínima: el borde es un anillo de 1 px de `line` dentro de la propia sombra, así no cambia el tamaño de nada. Tres sombras en `styles.css`:

- **Elevada** (`shadow-raised`): tarjetas, botón primario, opción activa de un selector segmentado.
- **Flotante** (`shadow-float`): hover de una tarjeta-enlace y tarjeta de acceso.
- **Superposición** (`shadow-overlay`): lo que se abre encima (hojas, menús, avisos, información emergente).

**La regla de la capa justa.** Cada sombra dice a qué capa pertenece la pieza; ninguna es un halo de color. La tarjeta-enlace sube 4 px y pasa de elevada a flotante al pasar el puntero (con movimiento reducido, solo cambia la sombra). Las barras de la estructura no llevan sombra: usan borde.

## Shapes

Radios por papel, no por tamaño: `control` (12 px) en botones, campos y navegación; `panel` (16 px) en la tarjeta de la persona y paneles pequeños; `card` (24 px) en tarjetas, indicadores y hojas; píldora en etiquetas, filtros, Badge y atajos. Las barras de la estructura son rectas. Bordes de 1 px en tarjetas (como anillo de la sombra), controles, divisores y superposiciones.

## Components

El detalle por pantalla anterior a la compactación está en git: `git show 48264ac:DESIGN.md`.

Cada pieza vive en `packages/ui/src/components` o en `apps/web/src/features`; su código manda en medidas y textos. Lo que sigue lo debe respetar cualquier pieza nueva.

**Piezas base**
- **Buttons.** Primario (`action`, sombra elevada), secundario y fantasma; pulsación de 150 ms; `loading` deshabilita sin cambiar el ancho. Solo de icono: círculo con `Tooltip` y `aria-label`.
- **Field y Select.** El Field da etiqueta, ayuda y error; el error lleva `role="alert"` y dice cómo resolverlo. `ErrorBalloon` flota bajo el campo sin empujar el diseño.
- **Quantity.** Recibe cadenas decimales de la API, nunca `number`: coma es-EC, signo menos tipográfico y unidad atenuada. Lo que se escribe en un campo usa `toDecimalInput`.
- **ChoiceField.** Motivo y destino se eligen de la lista del laboratorio (píldoras de radio); quien puede ampliarla ve «Agregar» y papelera por opción, que archiva con aviso «Deshacer» dentro de la hoja (`sheetToasterId`).
- **Tooltip y HelpTip.** Tooltip nombra un control de solo icono; HelpTip (ⓘ) lleva explicaciones, abre con clic, toque o foco y cierra con Esc.
- **IconChip, StatCard.** IconChip decorativo (`aria-hidden`), tonos `accent`, `neutral` y de estado. StatCard: etiqueta, cifra, línea de estado e IconChip; con `tone` `danger` o `warning` se tiñe con el `-soft` del estado, y el llamador lo pasa solo si la cuenta es mayor que cero.
- **Acción rápida** (`app/quick-actions.tsx`): tarjeta degradada de `action` a `action-deep` con las acciones del módulo; su botón principal va invertido (blanco sobre el acento).
- **Marca de agua.** Banda de acción rápida y tarjetas de módulo y de catálogo llevan `ModuleMark`, casi invisible y `aria-hidden`.

**Patrones comunes**
- **Cabecera de ficha.** Vidrio con `IconTile`, nombre como `h1`, pastillas de datos y ⟳ «Actualizar»; a la derecha, la primaria degradada y botones redondos de solo icono. Un ítem dado de baja no ofrece acciones.
- **Tarjeta de catálogo** (patrón de todo módulo): tarjeta-enlace de radio amplio con marca de agua, `IconChip` pequeño, insignias de 11 px y la cifra principal en `action` con avisos en una fila de altura reservada para alinear las de una fila. Rejilla de 4 por fila desde `xl`, 3 en `lg`, 2 en `sm`, 1 en el móvil.
- **Secciones y listas.** Cada sección: su `SectionHeader` y una primaria. Tabla con columnas por consulta de contenedor (`@3xl`), filas de altura uniforme con realce y sin cebra, y el nombre como enlace que cubre la fila (`after:absolute after:inset-0`) con el foco dibujado en ella.
- **Barra de filtros** (`app/filter-bar.tsx`, ADR 0021): un botón por filtro con su menú (`Popover`), que dice lo elegido y se tiñe con `action-soft`; «Limpiar» si hay algo puesto; se aplica al marcar y vive en la URL. En el móvil se desliza en horizontal con botones de 44 px.
- **Panel de filtros y cajón** (Movimientos): grupos plegables con casillas tipo Excel (44 px en el móvil), aplicación inmediata y fichas de filtro activo con ×. El Drawer entra desde la derecha con `ease-sheet` y devuelve el foco.
- **Hojas (Sheet, FormSheet).** Radix Dialog centrado (hasta 512 px; `wide="xl"` para altas) con cabecera de icono en `action`, título, descripción y cierre; «* Campos obligatorios» si hay opcionales; al pie, «Cancelar» y una sola primaria con el verbo de la acción. Se montan de nuevo en cada apertura (formulario limpio, clave idempotente nueva). El botón principal nunca se desactiva: al enviar marca lo que falta. Una acción destructiva usa botón rojo, sin degradado.
  - Las secciones opcionales son desplegables plegados que se abren ante un error y no borran lo escrito.
- **Gráficos.** Una serie en `action`, título que la nombra, frase de lectura en texto, «Ver datos» con la tabla, puntero y teclado con `aria-live`, y aviso en lugar del gráfico si no hay datos (excepción: ver «Serie única»).
- **Semáforo de plazos y barras de nivel.** Punto de 8 px más texto (rojo vencido, ámbar hasta 30 días, verde después, gris sin plan). `StockLevelBar` (más de 50 %, verde; 20–50 %, ámbar; menos de 20 %, rojo) siempre con texto y `aria-label`.
- **Estados (StatePanel y Skeleton).** Vacío, error (`QueryErrorState`), sin permiso, módulo no disponible y sin conexión son estados distintos. La carga es un esqueleto quieto de la forma del contenido.
- **Avisos (Sonner).** Solo informan un resultado ya confirmado por el servidor; si la pieza que lo lanza se desmonta, se emite tras `mutateAsync`.
- **Escaneo.** La hoja «Escanear etiqueta» lee el QR `/q/:código`; apaga la cámara al cerrar.
- **Imprimir y exportar.** Un menú «Exportar» solo con el permiso de informe: «Imprimir o guardar PDF» (`app/print-dialog.tsx`: pantalla completa con Volver e Imprimir, filtros y fecha en texto, hasta 1.000 filas con aviso) y «Excel (.xlsx)», con «Preparando…» deshabilitado y fallo por Sonner. En papel todo es texto en tinta, sin color.
- **Accesibilidad.** Foco visible siempre; área táctil de 44 px en el móvil; pestañas que se desplazan sin barra; nombre accesible en todo control de icono; cifras y estados con texto.
- **Móvil.** Una columna, acciones a todo el ancho y tablas como tarjetas apiladas.

**Pantallas propias** (el detalle manda en su código)
- **Reactivos.** Resumen, Inventario (tarjeta de reactivo y ficha con tarjeta por frasco), Solicitudes, Movimientos (libro por días, Totales, filtros en URL), Conteo y Etiquetas ([ADR 0010](docs/05_decisiones.md#adr-0010), [0012](docs/05_decisiones.md#adr-0012), [0015](docs/05_decisiones.md#adr-0015)). «Salida» va rellena solo en el frasco «Usar primero»; el color de un frasco cuenta un estado y siempre con texto.
- **Equipos.** Inventario por áreas y tipos, ficha con Incidentes, Documentos e Historial, Informe, Hoja de vida imprimible y Resumen con incidentes ([ADR 0019](docs/05_decisiones.md#adr-0019), [0021](docs/05_decisiones.md#adr-0021)). «Dar de baja» es definitivo y pide confirmar.
- **Áreas** ([ADR 0024](docs/05_decisiones.md#adr-0024), sección del Núcleo bajo «Inicio»). Un croquis, nunca una tabla: la sede o el edificio es un contorno de pared gruesa (`line-strong`) sobre una cuadrícula de puntos, con su nombre como leyenda sobre el borde, y cada área, un cuarto (tarjeta blanca) con nombre, encargado y una cifra por módulo (icono del módulo, número, nombre; cada cifra es un enlace a la lista filtrada). El cuarto por construir es un cuadro punteado «Nueva área»; el selector «Áreas | Departamentos» cambia la vista, con los mismos cuartos. Abrir un área abre una hoja con sus estantes; renombrar, encargado y archivar son hojas aparte que vuelven a ella. El filtro que llega a un módulo se muestra como ficha quitable con el nombre.
- **Mantenimiento.** Por hacer, Historial, Planes e Indicadores; el registro es una hoja corta con resultado en tres botones (Conforme, Con observaciones, No conforme) y no se edita: se corrige o anula con motivo ([ADR 0020](docs/05_decisiones.md#adr-0020), [0021](docs/05_decisiones.md#adr-0021)).
- **Laboratorios** ([ADR 0023](docs/05_decisiones.md#adr-0023)). Un formato es una hoja A4 que parte de la plantilla estándar (`features/labs/form-paper.tsx`), una tabla de bordes finos de 12 px (rejilla con `gap-px` sobre `line-strong`) que se edita en el mismo lugar. Encabezado en una sola franja (espacio de trabajo, título con «Revisión N» y casilla «Código»); barra «Sección I» y filas «etiqueta | valor» de a dos (el título de la práctica, a lo ancho), con la etiqueta en mayúsculas sobre `surface-sunken` y el valor en blanco con un ejemplo fantasma; Recursos, una tabla real con su cabecera de dos filas (Reactivos, Equipos, Materiales; tres filas de muestra en pantalla). La hoja es densa: filas de 24 px en pantalla y, al imprimir, de 4,5 mm a 8 pt, con el presupuesto de una A4 (encabezado 14 mm, Observaciones 12, Entrega / Recepción 18) y filas vacías de Recursos que llenan lo que sobra (mínimo 30; si no caben, pasan a otra página con la cabecera repetida, `form-sheet.ts`). Los controles de edición miden 44 px en el móvil y 24 px en escritorio; las notas de ayuda no se imprimen. Observaciones y Entrega / Recepción con dos firmas. Los encabezados usan el color suave del módulo (`action-soft` con `action-deep`, AA) y la hoja fuerza su impresión (`print-color-adjust`). Sin candados: la Sección I son filas de 1 a 3 datos (`form-rows.tsx`) y todo se renombra con un clic (línea punteada, nombre accesible propio); un dato se reordena y pasa de fila arrastrando su asa (dnd kit), con Espacio y flechas en ella o con Alt + flecha en la etiqueta, y soltarlo entre filas le da una propia. Los cinco datos esenciales no se quitan (un aviso lo explica); los opcionales se quitan y se vuelven a agregar; los datos libres abren sus ajustes en un `Popover` (tipo, opciones, obligatorio, quitar). Los títulos de sección, las columnas de Recursos, Observaciones y las firmas (de 1 a 3) también se agregan, ocultan o quitan. «Formatos» es una lista de tarjetas (nombre, título, revisión y fecha; los archivados, plegados) y «Nuevo formato» se crea desde una hoja con el nombre y «Partir de»; cada formato abre su hoja con el nombre editable aparte, «Archivar» con confirmación en la página y «Publicar revisión». Barra de revisión y acciones fija: abajo en el móvil, arriba en escritorio; un formato archivado se ve solo en lectura. «Imprimir» monta la hoja de solo lectura como única hoja A4 (`print-report`).

### Movimiento

`ease-out-expo` para pulsación, fundidos y menús; `ease-sheet` (cajón, sin rebote) para hojas. Superposiciones de 150–200 ms desde su origen; hojas de 260 ms al entrar; las salidas, más cortas. Con `prefers-reduced-motion`, hojas y menús pasan a fundidos y las elevaciones de tarjeta se omiten. Sin bucles ni animación de filas o barras; la única excepción es reordenar arrastrando (200 ms con `ease-out-expo`, sin movimiento con `prefers-reduced-motion`).

## Do's and Don'ts

### Do
- **Do** usar los tokens semánticos de `styles.css`; nunca un color literal en un componente.
- **Do** mostrar toda cantidad con Quantity y calcular porcentajes, restas y atajos con `decimal.ts` (BigInt).
- **Do** reservar Display para el título de página y Metric para contadores reales enlazados a su vista.
- **Do** hacer toda tarjeta de catálogo con el patrón común y sacar su color del acento del módulo.
- **Do** dar a cada módulo nuevo su bloque `[data-module]` en `styles.css`, validado para AA, y su tarjeta en el Inicio.

### Don't
- **Don't** usar UI optimista sobre existencias ni ofrecer «deshacer» en un movimiento confirmado: se corrige con otro movimiento.
- **Don't** comunicar un estado solo con color ni pintar los tipos de movimiento con colores de estado fuera de la fila de actividad.
- **Don't** usar verde, ámbar o rojo como acento ni dar color propio a un tipo de ítem.
- **Don't** mostrar acciones que el rol no permite.
- **Don't** usar imágenes decorativas, halos de color, gráficos sin dato ni métricas inventadas.
- **Don't** sumar unidades distintas, pasar una cantidad por `number` ni escribir en un campo con `formatDecimal`.
- **Don't** animar en bucle ni usar rebote.
