# 01 — Producto

Revisión: 12 de octubre de 2026. Única fuente de módulos, roles, flujos y pantallas. Las reglas de datos están en [03](03_datos.md) y el orden de entrega en [04](04_roadmap.md).

## 1. Propósito

Planificar, coordinar, ejecutar y controlar las actividades de laboratorio y sus recursos. Ciclo: planificar → solicitar → validar → aprobar → programar → preparar → ejecutar → cerrar → trazabilidad.

Principios:

- Registrar una sola vez y elegir de catálogos existentes.
- Validar automáticamente disponibilidad, stock y conflictos.
- Mostrar primero las excepciones.
- Una sola plataforma con módulos contratables.

Métricas de éxito, con objetivos fijados sobre la línea base del piloto:

- Prácticas gestionadas digitalmente y preparadas a tiempo.
- Conflictos de horario y solicitudes con recursos no disponibles.
- Compras duplicadas e inventario con ubicación conocida.
- Tiempo de revisión de solicitudes.

## 2. Clientes, espacios y aislamiento

```text
Titular (universidad o empresa) ──contrata──► Espacio A ──► ubicaciones, laboratorios, miembros, módulos
                                └──────────► Espacio B ──► independiente de A
```

- Cada contratación con operación propia es un espacio aislado. Existencias, reservas, miembros e informes nunca se comparten, aunque el titular sea el mismo.
- Un espacio contiene varios laboratorios como ubicaciones. Los roles valen para todo el espacio, no por laboratorio ([ADR 0008](05_decisiones.md#adr-0008), cambio del 05-10-2026).
- Una persona tiene una identidad y una membresía por espacio. Cambia de espacio de forma explícita y la pantalla se limpia.
- La licencia pertenece al espacio, no a quien lo creó. Transferir la propiedad no mueve datos ni contratos.
- El aislamiento se garantiza como describe [02 §5](02_arquitectura.md#5-aislamiento-entre-clientes).

## 3. Módulos

M1 es obligatorio. Cada módulo se contrata por espacio y funciona con sus dependencias. Una integración se activa cuando ambos módulos están habilitados.

| Módulo | Qué resuelve | Operaciones principales | Requiere | Se construye en |
|---|---|---|---|---|
| M1 Núcleo | Espacio, personas y control | Miembros, invitaciones, roles, ubicaciones, suscripción, documentos, auditoría y avisos | — | F1a |
| M2 Reactivos | Qué hay, dónde y en qué estado | Catálogo químico (CAS, concentración, peligros, SDS), lotes, ingresos, salidas, ajustes, traslados y bajas (ajuste a cero con motivo); custodia y retorno; caducidad y mínimos; fiscalizados y su reporte | M1 | R-00 en F1a; F2 |
| M3 Equipos | Activos y su estado | Resumen, Inventario por áreas con encargado, Informe exportable e Incidentes (fallas) ([ADR 0019](05_decisiones.md#adr-0019)); tipos de equipo; ficha con foto (código, marca, modelo, serie, alimentación, ubicación, responsable); condición, conservación y disponibilidad calculada; traslado trazado, fallas, QR, documentos, hoja de vida e historial; con M6, «Prestado» | M1 | F2 |
| M4 Laboratorios ([ADR 0023](05_decisiones.md#adr-0023)) | Solicitudes y agenda de los espacios físicos | Solicitudes del Docente con formato del espacio (núcleo fijo y campos libres) y recursos vinculados a los inventarios; bandeja del Administrador; Cronograma de horas por áreas donde el Administrador programa cada solicitud y asigna su responsable, sin choques; aforo, horarios, cierres y plazo de anticipación; después, reserva real, preparación, cierre con consumo y devolución, e impresión | M1 | F3 |
| M6 Materiales y Préstamos | Consumibles, reutilizables y préstamos | Existencias, préstamos de material y de equipos ([ADR 0019](05_decisiones.md#adr-0019)), devoluciones parciales, daños, pérdidas y transferencias | M1 | F4; un mínimo en F3 si P-04 lo exige |
| M7 Mantenimiento | Continuidad de equipos | Planes preventivos y calibraciones con próxima fecha, registro con informe y costo, correctivo enlazado al incidente y aviso de reemplazo (M-01, tras E-01); después, órdenes asignadas, bloqueo de agenda y repuestos | M1 + M3 | F2 (M-01); F5 |
| M8 Analítica y Alertas | Prevención y decisiones | Indicadores con periodo y fórmula, alertas configurables, resúmenes, escalamiento y reportes | M1 + un módulo operativo | F5 |

Construir un módulo no lo pone a la venta. Cada módulo avanza por etapas: desarrollo → piloto → general. Solo en etapa general entra en los paquetes publicados ([02 §6](02_arquitectura.md#6-autorización-etapas-y-admisión)).

Capacidades compartidas, que no se venden por separado: inventario (M2 y M6), agenda y conflictos (de Laboratorios; la consultan M3 y M7), incidencias, documentos, auditoría, avisos, importación y exportación.

Reglas entre módulos:

- Laboratorios solo verifica recursos de módulos habilitados. Sin M2, M3 o M6, esos recursos aparecen como «no verificados»: no hay stock, reserva ni consumo automático.
- Si P-04 muestra que una práctica usa material que se entrega y se devuelve, se adelanta a F3 un Materiales mínimo para cerrar ese circuito.
- Los avisos esenciales (caducidad, stock mínimo, averías y pendientes) pertenecen a cada módulo. M8 añade el análisis avanzado.
- Un módulo nuevo se agrega con el [contrato de módulo](02_arquitectura.md#4-contrato-de-módulo) sin modificar los existentes.

## 4. Paquetes

Un paquete es una combinación del registro de módulos; no crea versiones del código. Se vende cuando todos sus módulos están en etapa general (su G2 en el [roadmap](04_roadmap.md)).

| Oferta | Módulos | Se construye en |
|---|---|---|
| Inventario químico | M1 + M2 | F2 |
| Activos de laboratorio | M1 + M3 | F2 |
| Inventario institucional | M1 + M2 + M3 | F2 |
| Laboratorios (solicitudes y agenda) | M1 + M4 | F3 |
| Materiales y préstamos | M1 + M6 | F4 |
| Mantenimiento | M7 sobre M1 + M3 | F5 |
| Analítica avanzada | M8 sobre un paquete operativo | F5 |

Modelo comercial recomendado, pendiente de que lo confirme el usuario:

- **Licencia anual por espacio y paquete.** Es una suscripción que para universidades se factura como licencia anual. Incluye hosting, copias, soporte acordado y actualizaciones, con límites de uso descritos. Ampliar el servicio significa cambiar de paquete.
- **Incorporación única**, presupuestada según el trabajo real: configuración, migración y limpieza de datos, capacitación.
- **Desarrollos a medida**, cotizados aparte. Nunca se vuelve a cobrar un módulo que ya existe.
- **Precios:** los de la proforma no están validados. Se recalculan con infraestructura atribuible, soporte comprometido, mantenimiento, contingencia y margen.
- Sin pasarela de pago en el MVP.

## 5. Actores y roles

Hay dos planos que nunca se mezclan.

| Plano | Actor | Qué hace | Límite |
|---|---|---|---|
| PlatLab | Equipo PlatLab | Desde la consola separada: titulares, espacios, contratos, módulos, límites, estados y diagnóstico | No ve inventarios ni actividades de clientes por defecto |
| Espacio | Miembros con roles | Operan su institución según su rol | Solo entran a otro espacio si tienen membresía allí |

Los roles del espacio salen de un catálogo fijo en código. Son combinables y valen para todo el espacio: la ubicación dice dónde está algo, no quién puede verlo ([ADR 0008](05_decisiones.md#adr-0008), cambio del 05-10-2026).

| Rol | Propósito | Puede | No puede |
|---|---|---|---|
| Propietario | Gobierno de la cuenta; uno por espacio y transferible | Todo lo del Administrador en todo el espacio, sin asignación ([ADR 0008](05_decisiones.md#adr-0008), cambio del 02-10-2026); además, ver suscripción y uso, solicitar módulos, invitar miembros y asignar roles, configurar marca y ubicaciones, transferir la propiedad | Borrar registros, aprobar su propia solicitud o actuar como Responsable de fiscalizados sin que se le asigne ese rol |
| Administrador | Decide y configura la operación | Todo lo del Operador; revisar solicitudes (aprobar, rechazar, pedir cambios, proponer ajustes, reubicar); catálogos, laboratorios, formatos de solicitud, mínimos, motivos y destinos; ajustes y bajas con motivo; reportes | Borrar registros, aprobar su propia solicitud o invitar miembros sin delegación del propietario |
| Operador | Ejecuta el día a día | Ingresos, salidas (descargas), traslados, preparación, entregas y devoluciones; condición de equipos e incidencias; consultar toda la información operativa | Aprobar solicitudes, ajustar existencias, configurar o gestionar miembros |
| Docente | Solicita actividades de docencia | Crear solicitudes con el formato del espacio, ver el catálogo solicitable con disponibilidad orientativa, aceptar o declinar propuestas, seguir sus actividades y reportar incidencias de ellas | Fijar la sala definitiva, tocar el inventario o ver solicitudes ajenas |
| Estudiante (tesista) | Solicita actividades de investigación | Lo mismo que el Docente, con docente responsable y vigencia | Solicitar cuando vence su participación |
| Responsable de fiscalizados | Rol especial asignado por el propietario | Revisar las operaciones reguladas y el reporte del periodo según REG-01 | Nada más por este rol |

Reglas:

- Nadie borra registros de negocio. Los catálogos se archivan, las solicitudes se cancelan o rechazan con motivo y los movimientos se corrigen con otro movimiento. Los datos solo se eliminan en el procedimiento de salida del cliente ([02 §11](02_arquitectura.md#11-datos-reales-y-salida-del-cliente)).
- Los permisos forman una escalera: Propietario ⊇ Administrador ⊇ Operador. Al transferir la propiedad, los permisos del propietario pasan al nuevo propietario.
- Una persona puede tener varios roles, por ejemplo Administrador y Operador en un laboratorio pequeño, y roles distintos en cada espacio.
- El propietario puede delegar a un Administrador «gestionar miembros». Con esa delegación invita Operadores, Docentes y Estudiantes, pero no Administradores.
- La interfaz oculta las acciones no permitidas y la API las rechaza igualmente.
- Los alumnos de una práctica de clase no tienen cuenta en el alcance inicial; el docente solicita por el grupo.

Matriz de referencia (✔ incluido; — no incluido):

| Capacidad | Prop. | Admin. | Oper. | Doc./Est. |
|---|:-:|:-:|:-:|:-:|
| Suscripción, uso y solicitud de módulos | ✔ | — | — | — |
| Miembros y roles | ✔ | Delegable | — | — |
| Marca y ubicaciones | ✔ | ✔ | — | — |
| Catálogos, laboratorios, formatos y configuración de módulos | ✔ | ✔ | — | — |
| Ingresos, salidas, traslados, entregas y devoluciones | ✔ | ✔ | ✔ | — |
| Ajustes de existencias y bajas | ✔ | ✔ | — | — |
| Condición de equipos e incidencias | ✔ | ✔ | ✔ | Reportar |
| Revisar y decidir solicitudes | ✔ | ✔ | — | — |
| Preparar, iniciar y cerrar actividades | ✔ | ✔ | ✔ | — |
| Crear solicitudes y aceptar propuestas | — | — | — | ✔ |
| Consultar inventario | Todo | Todo | Todo | Catálogo solicitable |
| Reportes, exportaciones y auditoría | ✔ | ✔ | — | — |

La lista exacta de permisos vive en el manifiesto de cada módulo ([02 §4](02_arquitectura.md#4-contrato-de-módulo)). Esta matriz se valida con usuarios en P-03.

## 6. Flujos principales

### 6.1 Inventario de reactivos (M2)

| Operación | Quién | Efecto |
|---|---|---|
| Ingreso | Operador | Registra uno o más frascos de un lote en una ubicación; crea el lote si es nuevo |
| Salida (descarga) | Operador | Resta de un frasco, con motivo y destino de las listas del laboratorio. La del Operador queda pendiente y aparta la cantidad hasta que el Administrador la aprueba; la del Administrador o del Propietario es directa. Se rechaza si no alcanza, y un frasco vencido se puede usar con advertencia ([ADR 0012](05_decisiones.md#adr-0012)) |
| Ajuste | Administrador | Corrige un conteo con motivo; el saldo nunca se edita |
| Traslado | Operador | Mueve un frasco entero de una ubicación a otra en un paso ([ADR 0012](05_decisiones.md#adr-0012), entrega 4) |
| Baja de un frasco | Administrador | Ajuste a cero con motivo («Vencido», «Contaminado»); el lote no tiene estado propio ([ADR 0012](05_decisiones.md#adr-0012)) |
| Entrega a custodia y retorno | Operador | Lo entregado sigue en la existencia institucional; el retorno queda segregado hasta verificarlo |
| Preparación de soluciones (mejora posterior, [ADR 0014](05_decisiones.md#adr-0014)) | Operador | Si la solución se guarda, consume los insumos y crea un lote del producto preparado con su trazabilidad. Si se usa de inmediato, solo registra el consumo |

Cantidades:

- **Existencia física:** todo lo registrado, incluidas custodia y tránsito.
- **Disponible:** lo utilizable menos lo reservado.
- **Consumo:** solo un movimiento real confirmado.

Una caducidad desconocida se muestra «sin confirmar». Al elegir frascos, el orden FEFO propone primero el frasco utilizable que vence antes.

Fiscalizados: cada producto regulado tiene perfil, autorizaciones, sitios y cupos. Cada operación regulada guarda su detalle y el reporte del periodo lo revisa el Responsable de fiscalizados. REG-01 valida con el laboratorio el formato y las reglas antes de implementarlos; no se automatiza el envío a la autoridad.

### 6.2 Solicitud y práctica

En Laboratorios ([ADR 0023](05_decisiones.md#adr-0023)), con los inventarios habilitados. Todo entra por solicitud: el Administrador la programa en el Cronograma y programarla es aprobarla.

1. **Docente o Estudiante.** Llena el formato del espacio (o duplica una solicitud anterior) con la fecha, la franja y las condiciones. Agrega reactivos y materiales del catálogo solicitable, y equipos por tipo y características (un equipo concreto solo con justificación). Si algo no existe, agrega una línea «no catalogada». No elige la sala definitiva.
2. **Sistema.** Valida cada línea: ✔ disponible, ⚠ insuficiente o en conflicto, ✖ no existe o no verificado. Validar no reserva nada.
3. **Administrador.** Revisa su bandeja con las excepciones primero. En el Cronograma arrastra el bloque de la solicitud al área y la hora, y le asigna su responsable; desde la reserva real (L-01d), también los lotes y el equipo concreto de cada tipo pedido. Resuelve los faltantes: traslado desde otro laboratorio, preparación, mover un equipo o cambiar sala u hora. Luego decide:
   - **Aprobar.** Si respeta lo solicitado, confirma y reserva todo en una transacción.
   - **Proponer ajuste.** Si cambia fecha, cantidades, sustitutos o condiciones, el solicitante acepta o declina esa revisión. Aceptar confirma solo si todo sigue disponible ([ADR 0007](05_decisiones.md#adr-0007)).
   - **Pedir cambios o rechazar**, siempre con motivo.
4. **Operador.** Prepara y entrega a custodia, marca la actividad como lista y la inicia. Al cerrar registra el consumo real, la devolución verificada y las incidencias.
5. **Sistema.** Actualiza inventario, agenda e historial. Lo que no se concilia sigue visible como pendiente.

Estados: borrador → enviada → programada → en preparación → lista → en curso → cierre → finalizada. También existen cambios solicitados, rechazada y cancelada.

Casos especiales:

- El Administrador puede reubicar a una sala equivalente con aviso al solicitante, sin pedir otra aceptación.
- Las solicitudes sin excepciones aparecen como «listas para confirmar». Se aprueban en un paso, una a una o en lote; en el lote cada solicitud se confirma por separado y se informa su resultado.
- La autoconfirmación sin revisión humana no está en el alcance.

### 6.3 Equipos (M3, M7)

- El estado tiene cuatro dimensiones ([ADR 0019](05_decisiones.md#adr-0019)): estado (operativo, uso limitado, fuera de servicio, dado de baja), estado físico (bueno, regular, malo), tipo de falla, que vive en la falla, y disponibilidad, que se calcula.
- Reportar una falla indica si el equipo se puede seguir usando; si no, bloquea nuevas asignaciones y marca las reservas afectadas, sin cancelar nada en silencio.
- Un incidente (falla) pasa por reportado → en reparación → solucionado, y solucionarlo exige qué se hizo; es el último paso. Si nace de una práctica, hereda fecha, laboratorio, personas y recurso.
- Volver a operativo exige resultado y responsable. Un traslado cambia la ubicación y queda en el historial.
- Una falla en garantía avisa que se reclame al proveedor. El uso del equipo se registra con Laboratorios y Prácticas, no en M3.
- El Inventario se recorre por áreas (el primer nivel de ubicación bajo la sede), cada una con su encargado; el Informe es la tabla filtrada que se imprime y se exporta a Excel ([ADR 0019](05_decisiones.md#adr-0019)).
- Con M7: planes y calibraciones con próxima fecha y semáforo, registros con informe y costo, el correctivo registrado desde un incidente (puede solucionarlo y devolver el equipo a operativo) y el aviso «Evaluar reemplazo»; la ficha suma la pestaña Mantenimiento y el Informe, «Próximo mantenimiento».

### 6.4 Alta de un cliente y cambio de módulos

1. El Equipo PlatLab registra titular, espacio y contrato, aplica el paquete (derechos y límites) e invita al propietario. El espacio queda en `provisioning`.
2. El propietario acepta, configura marca y ubicaciones e invita a su equipo con su rol.
3. La importación muestra una vista previa y concilia el inventario inicial antes de operar.
4. Para cambiar módulos, el propietario lo solicita desde «Suscripción» y el Equipo PlatLab aplica el contrato. Desactivar bloquea operaciones nuevas, pero permite resolver pendientes y consultar.

## 7. Cómo se ve la plataforma

Recorrido: iniciar sesión → Inicio del último espacio usado, el tablero de módulos → abrir un módulo, que funciona como una app propia con su color ([ADR 0011](05_decisiones.md#adr-0011)). Quien tiene varios espacios cambia desde el nombre del espacio, en la barra lateral (arriba en el móvil); dentro de un módulo, la barra superior dice dónde se está.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ PlatLab · Depto. de Química (cambiar)        Buscar…        Avisos · Ana   │
├────────────────┬───────────────────────────────────────────────────────────┤
│ Inicio         │ Buenos días, Ana                                          │
│ ────────────── │ Pendientes: 3 por revisar · 2 entregas hoy                │
│ Administración │ ┌ Reactivos ─────┐ ┌ Equipos ───────┐ ┌ Agenda ────────┐  │
│                │ │ 4 por vencer   │ │ 1 averiado     │ │ 7 hoy          │  │
│                │ │ 2 bajo mínimo  │ │ 3 incidencias  │ │ 1 conflicto    │  │
│                │ │ ▂▃▅▂▆▃▇ salidas│ │                │ │                │  │
│                │ └────────────────┘ └────────────────┘ └────────────────┘  │
└────────────────┴───────────────────────────────────────────────────────────┘
```

- Las tarjetas se componen con los módulos habilitados y los permisos del usuario. Un módulo no contratado no aparece en la operación diaria; se explica en Administración → Suscripción.
- Cada tarjeta muestra cifras y un gráfico pequeño solo si hay datos reales. Toda la tarjeta abre el módulo; en su Resumen, cada cifra abre la lista que explica.
- Lo transversal vive en el Inicio y en la barra: pendientes y bandeja de aprobaciones, búsqueda y avisos.
- El Inicio prioriza según el rol:
  - Propietario: resumen de módulos, suscripción y uso.
  - Administrador: pendientes de revisión y alertas.
  - Operador: tareas de hoy.
  - Docente y Estudiante: «Mis solicitudes» y «Nueva solicitud».

Un módulo por dentro, con Reactivos como ejemplo:

```text
┌────────────────┬───────────────────────────────────────────────────────────┐
│ ← Inicio       │ Reactivos · Resumen     [Registrar ingreso] [Salida] [Ajustar]
│ ⊞ Módulos      │ ┌ Por vencer ┐ ┌ Bajo mínimo ┐ ┌ Salidas, 30 días ───────┐ │
│ ────────────── │ │     4      │ │      2      │ │ ▂▃▅▂▆▃▇▂▃▅▂▆           │ │
│ Resumen        │ └────────────┘ └─────────────┘ └─────────────────────────┘ │
│ Inventario     │ Actividad reciente                                         │
│ Movimientos    │                                                            │
│ Solicitudes    │ Inventario: tabla producto → lotes → ubicaciones, con      │
│ Fiscalizados   │ filtros, orden y exportación                               │
│                │                                                            │
└────────────────┴───────────────────────────────────────────────────────────┘
```

- El menú del módulo muestra solo las secciones que el rol puede usar y que ya existen. En Reactivos son cinco; los informes son Movimientos e Inventario filtrados, y Fiscalizados aparece con su entrega, solo para su responsable y el Administrador ([ADR 0014](05_decisiones.md#adr-0014)).
- Los botones visibles dependen del permiso del usuario.
- La ficha de producto reúne datos químicos, SDS, lotes, existencias por ubicación e historial.
- Registrar una salida toma pocos pasos: buscar el producto, indicar la cantidad con atajos, elegir motivo y destino de listas y ver el saldo resultante.
- La ficha de un equipo tiene pestañas Información, Mantenimiento, Fallas e Historial, y Reservas cuando llega la agenda ([ADR 0019](05_decisiones.md#adr-0019)).
- Nueva solicitud: Datos → Recursos → Revisar. El Cronograma muestra un día en una tabla de horas por áreas, con la bandeja «Por programar» al costado; en el móvil, un área a la vez y «Programar…» en lugar de arrastrar ([ADR 0023](05_decisiones.md#adr-0023)).

Dirección visual (tomada de ReactiLab desde el 04-10-2026, [ADR 0010](05_decisiones.md#adr-0010)):

- Colores: fondo gris pizarra claro `#F8FAFC`, superficie blanca, texto `#1E293B`/`#475569` y acción azul `#1F5F96` en la plataforma.
- Cada módulo tematiza su app con su color de acento, por ejemplo Reactivos en índigo `#4F46E5`; el Inicio y la marca siguen en azul.
- Estados en verde, ámbar o rojo, siempre con texto y no solo con color. La cifra con signo de una salida va en rojo suave y la de un ingreso en verde suave.
- Inter; títulos y cifras grandes, con cifras tabulares.
- Esquinas de 12 px en controles, 16 px en paneles y 24 px en tarjetas; píldora en filtros y etiquetas. Tarjetas con borde fino y elevación al pasar el puntero.
- Barra lateral pegada al borde, con la tarjeta de la persona, el menú con iconos (el activo relleno con el acento) y «Salir» al pie; barra superior translúcida.
- Resumen con una tarjeta degradada de acción rápida, indicadores con icono de color y la actividad como línea de tiempo.
- Una acción primaria por sección; objetivo WCAG 2.2 AA; foco visible e iconos con etiqueta.
- Sin imágenes decorativas ni gráficos sin dato real.

Situaciones que siempre se diseñan:

- Otro usuario confirmó antes la misma reserva o salida.
- Propuesta frente a reserva confirmada.
- Caducidad sin confirmar.
- Módulo en consulta.
- «Sin permiso» frente a «contrato vencido».
- Sesión expirada o sin conexión.
- Importación con errores.
- Carga, vacío y error como estados distintos.

Muestra «Actualizado hace…» y un botón de actualizar; nunca promete «en vivo».

Lecciones de ReactiLab (`/home/jio/Documentos/Inventario_V1`):

- **Conservar:**
  - Salida rápida con atajos, motivo y destino.
  - Vista agrupada de producto a lote o envase.
  - SDS visible al retirar.
  - Motivo obligatorio en los ajustes.
  - Bandeja de aprobaciones con contador.
- **Descartar:**
  - Frasco, lote y código fusionados, y altas sin movimiento de ingreso.
  - Ajuste sin signo, ubicación en texto libre y traslados sin traza.
  - Borrado usado como baja y un «FIFO» basado en la menor cantidad.
  - Tarjetas como única vista y botones visibles sin permiso.
  - ReactiLab no tiene importación: el asistente de PlatLab se diseña desde cero.

## 8. Fuera del alcance inicial

- App móvil nativa y operación offline.
- ERP o compras, pasarela de pago y facturación automática.
- SSO SAML, hardware o lectores dedicados, IA e integraciones no definidas.
- Expediente académico de estudiantes.
- Envío automático de reportes a la autoridad.
- Preparación de soluciones en Reactivos: mejora posterior a completar el módulo ([ADR 0014](05_decisiones.md#adr-0014)).

Cada uno requiere una decisión y un alcance propios.
