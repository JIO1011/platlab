---
version: 1
slug: "src-main-tsx"
primary_target: "src/main.tsx"
related_targets: []
---

# Superficie: aplicación de clientes — acceso, Inicio como tablero de módulos y la app de Reactivos

Modo: Operate. Escritorio primero, adaptada desde 360 px. Alcance confirmado el 01-10-2026 y ampliado el 02-10-2026 (ADR 0011): acceso con entrada directa al último espacio y cambio desde la barra, Inicio como tablero de módulos y la app de Reactivos con Resumen, Inventario en dos niveles (tarjetas por reactivo y la ficha de cada uno con sus frascos, ADR 0012) y Movimientos, más Nuevo reactivo, Registrar ingreso por frascos (con lote nuevo en la misma hoja), Registrar salida (atajos, «quedarán», sugerencia FEFO, aviso de vencido, y motivo y destino de las listas) y Ajustar. Fuera por ahora (siguientes entregas de R-01A): aprobación de salidas, avisos de por vencer y bajo mínimo, estado del lote editable, traslados, conteo y QR. Fuera de R-01A: Informes, Fiscalizados, Documentos, Configuración, búsqueda, avisos por correo y tema oscuro.

Audiencia y tarea: Propietario, Administrador y Operador del laboratorio registran entradas y salidas y necesitan ver el saldo resultante con certeza. El Administrador y el Propietario (que tiene sus permisos, ADR 0008 del 02-10-2026) crean reactivos y lotes y ajustan por conteo con motivo.

Estados obligatorios: carga, vacío, error, sin permiso, módulo no disponible, módulo en consulta, stock insuficiente en el formulario y sesión expirada.

## Direction contract

THESIS: El saldo es el protagonista. Cada pantalla responde «¿cuánto hay, dónde y quién lo movió?» antes que cualquier adorno. El Inicio da la vista de conjunto por módulo y cada módulo se usa como una herramienta propia (ADR 0011); se rechaza el tablero genérico de tarjetas con iconos y métricas sin dato.

OWN-WORLD: «Precisión suave» (ADR 0010, 02-10-2026): lienzo #F5F7FB con paneles blancos flotantes de 20–24 px de radio y sombras suaves en capas; navegación y barra superior también flotan. Texto #102A43/#526275. Color por módulo (ADR 0010, 02-10-2026): la plataforma, el Inicio y la marca van en azul #1F5F96, y dentro de su app cada módulo tematiza el acento (botón principal, enlaces, menú activo, foco, gráficos, icono y brillo del lienzo). Reactivos va en lila #7C3AED, y cada tarjeta del Inicio lleva el color de su módulo. Verde, ámbar y rojo, solo para estados. Inter con títulos y cifras grandes, cifras tabulares en columnas. Gráficos de una sola serie en el acento del módulo, solo con datos reales y con su tabla en el Resumen (ADR 0011). Sin imágenes decorativas ni vidrio.

STORY: El usuario entra directamente al último espacio que usó (ADR 0011) y en el Inicio ve una tarjeta por módulo en su color. Abre Reactivos, una app en lila con su menú. En Inventario ve un reactivo por tarjeta con su total y sus frascos; abre la ficha y ve cada frasco con su código, su caducidad y lo que le queda. Registra la salida desde un frasco, con el que vence antes ya sugerido, y ve el saldo nuevo confirmado por el servidor (ADR 0012, ReactiLab como referencia de UX).

FIRST VIEWPORT: Inicio en azul: barra con el nombre del espacio (con varios, abre el menú de espacios), saludo grande, fecha y tarjetas de módulo en su color (icono, nombre, dos cifras grandes, minigráfico de salidas y su frase); toda la tarjeta abre el módulo. Resumen de Reactivos en lila: título grande con las acciones a la derecha (una primaria: Registrar salida), tres cifras que abren su lista, el gráfico de salidas por día (puntero, teclado y tabla) y la actividad reciente en filas (icono, reactivo, lote · ubicación, responsable · hora, cantidad con signo). Inventario: buscador e interruptor «Mostrar sin existencias», y tarjetas por reactivo (nombre, código y CAS, total grande, «N frascos»). Ficha: miga «← Inventario» sobre el nombre, resumen (existencia, código, CAS, estado físico) y tarjetas por frasco (código del lote-NN sin partir, ubicación, saldo, caducidad con texto, barra de % restante, Salida y Ajustar como secundarias), e historial del reactivo. Una sola primaria por pantalla: «Registrar salida», que en la ficha llega acotada al reactivo y con el frasco FEFO elegido.

FORM: Shell de aplicación con dos modos de navegación (plataforma y app de módulo); el inventario es de dos niveles con tarjetas (reactivos y frascos), no una tabla densa, y el historial sigue en tabla en escritorio (posición 1 de 1). Seed: exento de tirada de conceptos porque la composición la fijan docs/01_producto.md §6.1 y §7 y los ADR 0011 y 0012, que el usuario decidió el 02-10-2026 («Como otra app», «Cifras + gráfico real», «Estructura ahora», «Directo al último espacio», «Tematizar cada app», «Por frasco, como ReactiLab», con su inventario en dos niveles como referencia), sobre el alcance que confirmó el 01-10-2026 («Confirmar tal cual», «Escritorio, adaptada al móvil»).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
