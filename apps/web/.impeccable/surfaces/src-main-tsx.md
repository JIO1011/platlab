---
version: 1
slug: "src-main-tsx"
primary_target: "src/main.tsx"
related_targets: []
---

# Superficie: aplicación de clientes — acceso, Inicio y tablero de Reactivos

Modo: Operate. Escritorio primero, adaptada desde 360 px. Alcance confirmado el 01-10-2026: acceso, selector de espacio, Inicio con la tarjeta de Reactivos y tablero (Inventario y Movimientos) con Nuevo reactivo, Nuevo lote, Registrar ingreso, Registrar salida y Ajustar. Fuera: Fiscalizados, Documentos, Configuración, búsqueda, avisos, salida rápida (R-01) y tema oscuro.

Audiencia y tarea: Administrador y Operador del laboratorio registran entradas y salidas y necesitan ver el saldo resultante con certeza; el Administrador crea reactivos y lotes y ajusta por conteo con motivo.

Estados obligatorios: carga, vacío, error, sin permiso, módulo no disponible, módulo en consulta, stock insuficiente en el formulario y sesión expirada.

## Direction contract

THESIS: El saldo es el protagonista. Cada pantalla responde «¿cuánto hay, dónde y quién lo movió?» antes que cualquier adorno; se rechaza el tablero genérico de tarjetas con iconos y métricas sin acción.

OWN-WORLD: «Precisión suave» (ADR 0010, 02-10-2026): lienzo #F5F7FB con paneles blancos flotantes de 20–24 px de radio y sombras suaves en capas; navegación y barra superior también flotan. Texto #102A43/#526275 y una sola acción #1F5F96. Inter con títulos y cifras grandes, cifras tabulares; pestañas en píldora. Sin imágenes decorativas, vidrio ni gráficos sin dato.

STORY: El usuario entra, elige su espacio y en Inicio ve de un vistazo cuánto inventario consultable tiene, qué se movió hace poco y quién lo movió, con sus acciones rápidas a mano; abre Reactivos, registra un movimiento en una hoja y ve el saldo nuevo confirmado por el servidor.

FIRST VIEWPORT: Inicio en bloques: saludo grande; resumen de Reactivos con cifras grandes enlazadas; acciones rápidas en mosaico (Registrar salida como primaria) y actividad reciente en filas (icono, reactivo, lote · ubicación · hora · responsable, cantidad con signo). En el tablero: título grande con las acciones a la derecha (una primaria: Registrar salida), pestañas en píldora y la tabla producto → lote → ubicación con el saldo dominante.

FORM: Shell de aplicación con navegación lateral y tabla densa (posición 1 de 1). Seed: exento de tirada de conceptos porque la composición la fija el documento de producto, docs/01_producto.md §7 («Reactivos [Registrar ingreso] [Registrar salida] [Ajustar] … Pestañas: Inventario · Movimientos … Inventario: tabla producto → lotes → ubicaciones»), y el usuario confirmó ese alcance el 01-10-2026 con «Confirmar tal cual» y «Escritorio, adaptada al móvil».

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
