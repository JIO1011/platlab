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

OWN-WORLD: Fondo #F5F7FB, superficies blancas con borde hairline frío, texto #102A43/#526275, una sola acción #1F5F96. Inter con cifras tabulares; cantidades grandes y alineadas a la derecha con su unidad. Bordes de 8 px en controles y 12 px en paneles. Estados en verde, ámbar o rojo siempre con texto.

STORY: El usuario entra, elige su espacio, ve en Inicio cuánto inventario consultable tiene y abre Reactivos; registra un movimiento en una hoja lateral y ve el saldo nuevo confirmado por el servidor y la fila del historial con su nombre.

FIRST VIEWPORT: Barra superior con el espacio actual y el usuario; navegación lateral con Inicio y los módulos visibles. En el tablero, título «Reactivos» con las acciones permitidas a la derecha (una primaria: Registrar salida), pestañas Inventario · Movimientos y la tabla producto → lote → ubicación con el saldo como columna dominante.

FORM: Shell de aplicación con navegación lateral y tabla densa (posición 1 de 1). Seed: exento de tirada de conceptos porque la composición la fija el documento de producto, docs/01_producto.md §7 («Reactivos [Registrar ingreso] [Registrar salida] [Ajustar] … Pestañas: Inventario · Movimientos … Inventario: tabla producto → lotes → ubicaciones»), y el usuario confirmó ese alcance el 01-10-2026 con «Confirmar tal cual» y «Escritorio, adaptada al móvil».

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
