---
version: 1
slug: "src-main-tsx"
primary_target: "src/main.tsx"
related_targets: []
---

# Superficie: aplicación de clientes — acceso, Inicio como tablero de módulos y la app de Reactivos

Modo: Operate. Escritorio primero, adaptada desde 360 px. Alcance confirmado el 01-10-2026 y ampliado el 02-10-2026 (ADR 0011): acceso, selector de espacio, Inicio como tablero de módulos y la app de Reactivos con Resumen, Inventario y Movimientos, más Nuevo reactivo, Nuevo lote, Registrar ingreso, Registrar salida y Ajustar. Fuera: Informes, Fiscalizados, Documentos, Configuración, búsqueda, avisos, salida rápida (R-01) y tema oscuro.

Audiencia y tarea: Propietario, Administrador y Operador del laboratorio registran entradas y salidas y necesitan ver el saldo resultante con certeza. El Administrador y el Propietario (que tiene sus permisos, ADR 0008 del 02-10-2026) crean reactivos y lotes y ajustan por conteo con motivo.

Estados obligatorios: carga, vacío, error, sin permiso, módulo no disponible, módulo en consulta, stock insuficiente en el formulario y sesión expirada.

## Direction contract

THESIS: El saldo es el protagonista. Cada pantalla responde «¿cuánto hay, dónde y quién lo movió?» antes que cualquier adorno. El Inicio da la vista de conjunto por módulo y cada módulo se usa como una herramienta propia (ADR 0011); se rechaza el tablero genérico de tarjetas con iconos y métricas sin dato.

OWN-WORLD: «Precisión suave» (ADR 0010, 02-10-2026): lienzo #F5F7FB con paneles blancos flotantes de 20–24 px de radio y sombras suaves en capas; navegación y barra superior también flotan. Texto #102A43/#526275 y una sola acción #1F5F96. Inter con títulos y cifras grandes, cifras tabulares en columnas. Gráficos de una sola serie en el azul de acción, solo con datos reales y con su tabla (ADR 0011). Sin imágenes decorativas ni vidrio.

STORY: El usuario entra, elige su espacio y en el Inicio ve una tarjeta por módulo con sus cifras y las salidas de los últimos 30 días. Abre Reactivos y el menú pasa a ser el de esa app (Resumen, Inventario, Movimientos, con regreso al Inicio y salto a otro módulo). Registra un movimiento en una hoja desde cualquier sección y ve el saldo nuevo confirmado por el servidor.

FIRST VIEWPORT: Inicio: saludo grande, fecha y tarjetas de módulo (icono, nombre, dos cifras grandes, minigráfico de salidas y su frase); toda la tarjeta abre el módulo. Resumen de Reactivos: título grande con las acciones a la derecha (una primaria: Registrar salida), tres cifras que abren su lista, el gráfico de salidas por día (puntero, teclado y tabla) y la actividad reciente en filas (icono, reactivo, lote · ubicación, responsable · hora, cantidad con signo).

FORM: Shell de aplicación con dos modos de navegación (plataforma y app de módulo) y tabla densa (posición 1 de 1). Seed: exento de tirada de conceptos porque la composición la fijan docs/01_producto.md §7 y el ADR 0011, que el usuario decidió el 02-10-2026 («Como otra app», «Cifras + gráfico real», «Estructura ahora»), sobre el alcance que confirmó el 01-10-2026 («Confirmar tal cual», «Escritorio, adaptada al móvil»).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
