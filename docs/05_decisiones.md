# 05 — Decisiones y pendientes

Revisión: 7 de octubre de 2026. Registro resumido de decisiones de arquitectura (ADR); cada ADR dice solo lo vigente. Una decisión aceptada solo se reemplaza con otra que indique qué cambia. El texto completo anterior de los ADR 0001–0007 está en el commit `bc26fa8`.

| ADR | Tema | Estado |
|---|---|---|
| [0001](#adr-0001) | Espacios de trabajo y autorización | Aceptado el 28-09-2026 |
| [0002](#adr-0002) | Contratos, derechos y límites | Aceptado el 28-09-2026 |
| [0003](#adr-0003) | Refresco y protección de tráfico | Aceptado el 28-09-2026 |
| [0004](#adr-0004) | Identidad y consola del Equipo PlatLab | Aceptado el 28-09-2026 |
| [0005](#adr-0005) | Datos reales, respaldos y acceso privilegiado | Aceptado como criterio el 29-09-2026; las capacidades se validan antes de G1 |
| [0006](#adr-0006) | SQL tipado y pruebas | Aceptado el 28-09-2026 |
| [0007](#adr-0007) | Asignación y aprobación condicionada | Aceptado el 29-09-2026 |
| [0008](#adr-0008) | Roles y actores | Aceptado el 30-09-2026; la matriz detallada se valida en P-03 |
| [0009](#adr-0009) | Etapas de módulo y admisión de operaciones | Aceptado el 30-09-2026 |
| [0010](#adr-0010) | Sistema de diseño y movimiento | Aceptado el 01-10-2026 |
| [0011](#adr-0011) | Inicio como tablero y cada módulo como app | Aceptado el 02-10-2026 |
| [0012](#adr-0012) | Reactivos por frasco y salidas con aprobación | Aceptado el 02-10-2026 |
| [0013](#adr-0013) | Delegación por riesgo y puertas del harness | Aceptado el 07-10-2026 |

<a id="adr-0001"></a>
## ADR 0001 — Espacios de trabajo y autorización

- Nombres canónicos: `core.workspaces`, `workspace_id` y `/v1/workspaces/:workspaceId`. En la interfaz se dice «Espacio de trabajo»; «tenant» queda solo como concepto.
- Titular jurídico (`platform.customer_accounts`), espacio y propietario son cosas distintas. Un titular puede tener varios espacios.
- Cada identidad tiene membresías locales y cada espacio, un propietario. El Equipo PlatLab aplica los módulos según el contrato.
- El catálogo de roles, permisos y delegación es fijo en código y versionado; no hay editor de roles.
- El aislamiento se aplica en API, RLS, FKs compuestas, archivos, trabajos, exportaciones y caché.
- Las ubicaciones físicas llegan en F1a; las unidades administrativas se difieren.

Motivo: un solo código para todos los clientes y un aislamiento verificable.

<a id="adr-0002"></a>
## ADR 0002 — Contratos, derechos y límites

- Los paquetes tienen versiones inmutables. Los contratos guardan revisiones como evidencia comercial.
- `apply_contract_revision` es el único camino para cambiar derechos y límites:
  1. Verifica staff, MFA, versión e idempotencia.
  2. Bloquea y valida las dependencias.
  3. Proyecta `core.workspace_entitlements` y `platform.workspace_limits` en una sola transacción auditada.
- También valida que la etapa de cada módulo corresponda al tipo de contrato ([ADR 0009](#adr-0009)).
- El runtime solo lee derechos y límites efectivos. La expiración bloquea operaciones nuevas en cada petición; resolver pendientes y consultar siguen la admisión por dos ejes ([ADR 0009](#adr-0009)).
- El estado operativo del módulo es independiente del derecho. Reducir una cuota bloquea el consumo nuevo, pero no borra datos.
- Sin motor de cobros ni suscripciones solapadas en el MVP.
- Alcance en F1a: el comando es una función SQL que solo ejecuta el rol de migraciones, desde fixtures y pruebas; la revisión lista módulos con vigencia, periodo de cierre y acceso de consulta. Llegan después: retirar módulos por revisión, la auditoría de staff y los límites (consola O-01), y los paquetes versionados (F1b).

Motivo: una sola autoridad evita contradicciones entre contrato, paquete y permisos.

Cambios: 30-09, 01-10-2026 (historial en git).

<a id="adr-0003"></a>
## ADR 0003 — Refresco y protección de tráfico

- Un endpoint agregado por vista. Solo el tablero operativo visible usa sondeo; docentes y estudiantes no tienen sondeo periódico.
- Límites separados para lecturas y comandos, por actor y por espacio, más un límite por IP. Los valores están en [02 §12](02_arquitectura.md#12-parámetros-iniciales).
- `@fastify/rate-limit` en memoria mientras haya una sola API; Redis compatible antes de tener varias réplicas.
- Sin contadores HTTP en PostgreSQL. Workers KV no sirve para contadores estrictos.
- ETag queda diferido porque no reduce peticiones. Las respuestas privadas llevan `no-store`.
- Las cuotas de negocio (archivos, puestos y trabajos) se controlan siempre de forma transaccional en PostgreSQL.

Motivo: el sondeo general agotaba un límite único por espacio.

<a id="adr-0004"></a>
## ADR 0004 — Identidad y consola del Equipo PlatLab

- **JWT.** Asimétrico, verificado con `jose` y JWKS. Emisor, audiencia, algoritmo y `kid` están fijados. La membresía o la cuenta de staff se comprueban en PostgreSQL.
- **Acceso.** Por correo en F1a y con OAuth de Google y Microsoft en F3 (Microsoft con `email` y `xms_edov`). OAuth no es SAML ni concede membresía, y nunca se da acceso por dominio de correo.
- **Invitación con un solo correo.** La cuenta se confirma al canjearla. Nunca se usa `email_confirm: true` ni se acepta por GET.
- **Consola.** `apps/console` en `console.<dominio>`, con la API común `/v1/console/*`. Exige JWT + `aal2` + staff activo + permiso; Cloudflare Access es opcional. Usa las tablas `platform.staff_accounts` y `platform.staff_audit_events`.
- **Nombre.** El personal del proveedor es el «Equipo PlatLab» (`staff`), porque «Operador» es un rol del laboratorio.

Cambios: 30-09-2026 (historial en git).

<a id="adr-0005"></a>
## ADR 0005 — Datos reales, respaldos y acceso privilegiado

- La demo es sintética. Un trial o piloto usa datos reales solo tras G1: primero la carga controlada y después la operación.
- El encargo lo acepta un representante autorizado; no se presume que el propietario lo sea.
- La retención de las copias se fija por repositorio antes de G1; ni 7 ni 30 días se dan por cumplimiento. La eliminación comunicada y el fin del encargo tienen términos propios (3 y 5 días), que se validan con asesoría.
- Un registro minimizado de supresiones se vuelve a aplicar antes de abrir una restauración.
- Recuperación: RPO de 24 h aceptado durante las pruebas y el piloto (30-09-2026). Se recomienda que el laboratorio conserve su registro actual durante el piloto para poder reconstruir. Operar con PlatLab como único registro exige PITR ([02 §12](02_arquitectura.md#12-parámetros-iniciales)).
- Tres caminos privilegiados:
  - La consola.
  - La automatización.
  - La intervención excepcional nominativa, con MFA, motivo y evidencia.

  No se fija un número arbitrario de personas.

Motivo: el proveedor sí puede acceder por la infraestructura; ese acceso se controla y documenta en lugar de negarse.

<a id="adr-0006"></a>
## ADR 0006 — SQL tipado y pruebas

- `pg` + PgTyped, generado contra una base local reconstruida desde las migraciones; `numeric` se maneja como cadena.
- Un `PoolClient` por caso de uso; nunca `pool.query` dentro de la transacción. Kysely queda descartado por ahora.
- Ubicaciones con `parent_id` y CTE recursiva; `ltree` solo si una medición lo exige.
- Pruebas en cuatro capas:
  - pgTAP bajo los roles reales.
  - Integración API.
  - Concurrencia con conexiones reales.
  - Un flujo Playwright por incremento.

<a id="adr-0007"></a>
## ADR 0007 — Asignación y aprobación condicionada

- El solicitante (Docente o Estudiante) propone desde una plantilla la fecha o franja y los recursos. No asigna sala ni compromete recursos, y las sugerencias del sistema no aprueban ni reservan.
- El Administrador, o quien tenga el permiso de revisión en ese ámbito, asigna sala y recursos del mismo espacio y confirma. Si respeta lo solicitado, no hace falta otra aceptación. Preparar y entregar corresponde al Operador.
- Cambiar fecha o franja, cantidades, sustitutos o condiciones exige una revisión preaprobada con vencimiento. Si el solicitante la acepta, el servidor revalida y confirma en una transacción.
- Si al aceptar hay un conflicto, la actividad queda en `accepted_pending_review` sin reservas parciales (savepoint). Un error técnico revierte todo.
- La reubicación equivalente (misma fecha o franja, recursos y condiciones) se hace con un comando auditado y notificado, sin nueva aceptación.
- El sistema nunca aprueba por su cuenta. La confirmación en lote ejecuta cada solicitud en su propia transacción e informa el resultado de cada una; un conflicto no bloquea a las demás.
- Los equipos se solicitan por tipo y características, y el Administrador asigna el activo concreto. Pedir un activo específico exige una justificación.

Cambios: 30-09-2026 (historial en git).

<a id="adr-0008"></a>
## ADR 0008 — Roles y actores

- **Dos planos.** En el de PlatLab está el Equipo PlatLab, que usa la consola. En el del espacio están el Propietario, el Administrador, el Operador, el Docente, el Estudiante (tesista) y el rol especial Responsable de fiscalizados.
- **Roles.** Son paquetes de permisos del catálogo fijo, combinables y asignados con un ámbito.
- **Escalera de permisos: Propietario ⊇ Administrador ⊇ Operador.**
  - El Operador ejecuta y consulta toda la información operativa y hace los registros del día a día.
  - El Administrador incluye todo lo del Operador, decide las solicitudes, configura los catálogos y aplica ajustes. No invita personas ni asigna roles sin la delegación del propietario.
  - El Propietario gobierna suscripción, miembros y propiedad. Tiene en todo el espacio los permisos del Administrador (y por tanto los del Operador) sin que nadie se los asigne ni pueda retirárselos mientras lo sea; al transferir la propiedad, pasan al nuevo propietario.
  - En SQL, los permisos efectivos son las asignaciones vigentes más los del rol Administrador para la membresía propietaria, en un solo lugar (`core.effective_role_assignments`).
- **Responsable de fiscalizados.** Es una designación aparte; el Propietario no la recibe salvo que se le asigne.
- **Los roles valen para todo el espacio, no por laboratorio.** El Operador accede a todo Reactivos, con todas sus ubicaciones. La ubicación es un dato del registro (dónde está cada frasco), no un límite de acceso. Los laboratorios se gestionan en M4 Laboratorios.
- **Ámbito técnico.** `core.role_assignments.location_id` queda siempre nulo: no hay forma de asignarlo en el producto. Retirarlo del código está pendiente.
- **Límites.** Nadie borra registros de negocio y, por defecto, nadie aprueba su propia solicitud.
- **Alumnos de clase.** No tienen cuenta en el alcance inicial.

Motivo:

- Es el vocabulario del usuario y de ReactiLab.
- Separa decidir de ejecutar sin obligar a tener dos personas en un laboratorio pequeño.

La matriz está en [01 §5](01_producto.md#5-actores-y-roles).

Cambios: 02-10, 05-10-2026 (historial en git).

<a id="adr-0009"></a>
## ADR 0009 — Etapas de módulo y admisión de operaciones

- **Etapas.** Cada módulo declara en su manifiesto una etapa: `development → pilot → general`.
  - `development`: solo en ambientes con datos sintéticos.
  - `pilot`: además en espacios con contrato de piloto; se alcanza tras el G0 del módulo.
  - `general`: en cualquier paquete publicado; se alcanza tras el G2 del módulo.
- **Contratos.** `apply_contract_revision` rechaza un módulo cuya etapa no corresponde al tipo de contrato, y el runtime lo vuelve a comprobar. La admisión de datos reales del espacio (G1) sigue siendo un control aparte.
- **Ambiente.** Se marca en la base (`platform.environment`), que nace como datos reales. Solo el seed local o de CI y el aprovisionamiento de staging o demo lo marcan como sintético. Si se olvida marcarlo, un módulo en `development` se deniega: el error siempre cae del lado seguro. Un contrato de tipo `demo` solo se admite en un ambiente sintético.
- **Admisión de dos ejes con denegación por defecto.** Cada comando declara su clase de acción: operación nueva, resolución de pendientes, o consulta y exportación. Una sola función evalúa dos ejes independientes, espacio y módulo, y admite solo lo que ambos permiten. Cualquier estado no listado se deniega. Se prueban todas las combinaciones ([02 §6](02_arquitectura.md#6-autorización-etapas-y-admisión)).
- **Módulo del recurso.** La admisión y el permiso se evalúan contra el módulo dueño del recurso, no contra la capacidad compartida. Las operaciones se exponen con rutas y permisos de ese módulo.
- **Bloqueo.** La admisión lee espacio, derecho y membresía con bloqueo compartido en la misma consulta con la que decide. Los cambios de estado modifican esas filas y esperan a las operaciones en curso. El orden de bloqueo es fijo: espacio → derecho → membresía → datos.
- **Plazos.** El contrato fija la duración del periodo de cierre y el alcance de la suspensión comercial; no se inventan plazos.

Motivo:

- La demo y el piloto necesitan usar módulos antes de venderlos, sin abrirlos a todos los clientes.
- Las obligaciones abiertas (devoluciones, custodias) deben poder resolverse aunque venza el contrato.
- Una decisión de autorización no puede quedar obsoleta por un cambio de estado concurrente.

Cambios: 30-09, 01-10-2026 (historial en git).

<a id="adr-0010"></a>
## ADR 0010 — Sistema de diseño y movimiento

Medidas, patrones y estados: `DESIGN.md` y `packages/ui/src/styles.css` (solo enlazan aquí).

- **Dirección.** Precisión operativa con calma: pautas de Apple (HIG) en una aplicación de trabajo, con el lenguaje visual de ReactiLab (solo el diseño; su código no se copia, por la licencia por aclarar, CLAUDE.md). Parte de 01 «Dirección visual» y 02 §2.
- **Tokens.** Semánticos, en `packages/ui`. Solo tema claro, preparado para el oscuro. Inter con `tabular-nums` en cantidades y saldos. Neutros en escala pizarra con contraste AA.
- **Componentes.** shadcn como código propio sobre Radix, TanStack Table para tablas, Sonner para avisos, cmdk para la salida rápida.
- **Estructura (ReactiLab).** Barra lateral pegada al borde y de ancho completo, barra superior translúcida con borde (no flotan) y tarjetas de borde fino con sombra mínima que, si son enlace, se elevan al pasar el puntero. Indicadores con icono (de estado cuando hay estado, del acento si no) y actividad como línea de tiempo.
- **Voz única.** Solo el acento invita a actuar. Excepción: la cantidad con signo de la actividad va en rojo suave (salida) o verde suave (ingreso), siempre con signo y tipo escritos.
- **Acción rápida.** El Resumen de Reactivos abre con una tarjeta degradada del acento («Registrar movimiento») que sustituye a las acciones de la cabecera en esa sección. Su pastilla, resplandor y matraz de marca de agua son decoración pedida por el usuario y no se repiten en otras tarjetas.
- **Descartado.** Imágenes 3D, vidrio, gráficos sin dato y métricas inventadas.
- **Color por módulo.** Cada módulo tiene un acento que, dentro de su app, reemplaza al azul en el botón principal, los enlaces, el menú activo, el foco, los gráficos y el icono, y tiñe el brillo del lienzo.
  - Inicio y plataforma siguen en azul PlatLab; cada tarjeta del Inicio lleva el color de su módulo; la marca PlatLab nunca cambia.
  - Reactivos es índigo, como ReactiLab: `#4F46E5` (6,3:1 con blanco), con degradado hacia violeta.
  - Cada color se valida para WCAG AA. Verde, ámbar y rojo son de estado: ningún módulo ni tipo de ítem los usa como color propio.
  - Un juego de tokens por módulo (`[data-module]`) redefine los de acción; los componentes no cambian.
- **Tarjetas de catálogo.** Un patrón común a todos los módulos (reactivos hoy; materiales y equipos después), con el componente compartido `IconChip`. Su icono sale de un dato que ya existe (el estado físico: sólido, líquido o gas) y nunca decora; un reactivo sin existencias pasa a chip neutro y píldora ámbar con texto e icono. Solo cambia la presentación.
- **Ventanas de movimiento.** Nuevo reactivo, ingreso, salida y ajuste son una ventana centrada (como el modal de ReactiLab), no una hoja lateral.
- **Densidad.** Dentro de un módulo el tamaño base baja de 16 a 15 px (`:root[data-module]`, en porcentaje para respetar la letra del navegador) y todo lo que está en `rem` se reduce por igual; el título de página baja un paso. Inicio y acceso no cambian.
- **Ficha.** Sin «← Inventario»: el menú ya lleva al Inventario. Queda abierto darle una función propia (por ejemplo, una miga de pan en la barra superior).
- **Movimiento.**
  - Pulsación de 100–150 ms con CSS; superposiciones de 150–200 ms que nacen de su origen.
  - Spring sin rebote para hojas y fichas.
  - Se respeta `prefers-reduced-motion`.
  - Nunca se animan filas, escritura ni bucles.
- **Dominio por encima del estilo.** Sin UI optimista sobre existencias ni «deshacer» en un movimiento confirmado: se corrige con otro movimiento. Estados con texto y una acción primaria por pantalla.
- **Verificación.** Playwright con axe (WCAG 2.2 AA) en CI. Antes de cerrar una entrega con UI: `impeccable audit`, `harden` y `polish`, y `review-animations`.
- **Orden.** Tokens y estructura base → acceso, selector de espacio e Inicio → tablero de Reactivos y «Registrar salida».

Motivo: una app que se usa todo el día necesita jerarquía clara, estados honestos y movimiento que explique, no que decore.

Cambios: 02-10, 04-10, 05-10-2026 (historial en git).

<a id="adr-0011"></a>
## ADR 0011 — Inicio como tablero y cada módulo como app

- **Inicio.** Tablero con una tarjeta por módulo habilitado y visible para el rol, con dos o tres cifras y un gráfico pequeño solo si hay datos reales (sin ellos, un texto). Toda la tarjeta abre el módulo, así que sus cifras no son enlaces aparte (no se anidan enlaces). Nombra el espacio en su subtítulo.
- **Entrada directa.** Sin pantalla para elegir espacio: se abre el último usado en ese navegador (la primera vez, el primero de la lista). Todos los roles entran igual; cambia lo que cada uno puede hacer (Administración solo la ve el propietario).
- **Módulo como app.** El menú lateral muestra solo sus secciones (Resumen, Inventario, Movimientos y las demás cuando su entrega exista); desde ahí se vuelve al Inicio o se salta a otro módulo.
  - El Resumen reúne cifras, gráfico y actividad reciente; cada cifra abre la lista que explica.
  - Las acciones de registro van en la cabecera de la app.
  - La barra superior dice dónde se está (módulo › sección), no el espacio ni la persona.
- **Una sola aplicación:** misma sesión, admisión y sistema de diseño. Cada módulo se descarga al abrirlo ([02 §8](02_arquitectura.md#8-frontend)). El manifiesto declara las secciones con su permiso ([02 §4](02_arquitectura.md#4-contrato-de-módulo)) y `/me` envía solo las permitidas.
- **El espacio es quien contrata, no un laboratorio:** una facultad o un instituto ([01 §2](01_producto.md#2-clientes-espacios-y-aislamiento)). Química, Física y los demás laboratorios viven dentro: hoy como ubicaciones y, desde F3, como espacios físicos con agenda en M4 Laboratorios. La demo los nombra así.
- **La tarjeta de la persona es el selector de espacio** y muestra quién eres, en qué espacio y con qué rol (depende del espacio). Con varios espacios, toda la tarjeta abre el menú, que lleva al Inicio del elegido. En el móvil, un botón con las iniciales abre el mismo menú con «Salir».
- **Rol real en lugar de «Miembro».** `/me` envía los nombres de los roles vigentes solo para mostrarlos; no autorizan nada.
- **Institución.** Se muestra en el menú solo si los espacios de la persona son de instituciones distintas. El nombre va en `core.workspaces.institution_name`, que fija el Equipo PlatLab. El runtime no lee `platform.customer_accounts` y el nombre jurídico no se muestra.
- **Lo transversal queda fuera de los módulos:** pendientes y bandeja de aprobaciones, en el Inicio; búsqueda y avisos, en la barra; miembros, suscripción y ubicaciones, en Administración. Los flujos entre módulos son enlaces; cada operación la ejecuta el módulo dueño del recurso ([ADR 0009](#adr-0009)).
- **Gráficos.** Cuentan sucesos, nunca suman cantidades de unidades distintas; usan la zona horaria del espacio y el ámbito del miembro; llevan resumen en texto.

Motivo: los módulos se contratan por separado y cada uno se entiende como una herramienta propia; el Inicio da la vista de conjunto sin mezclar las operaciones. Reemplaza el menú común y las pestañas del tablero de 01 §7, y la regla de «no hay gráficos»; sigue la prohibición de gráficos sin datos reales (ADR 0010).

Cambios: 02-10, 05-10-2026 (historial en git).

<a id="adr-0012"></a>
## ADR 0012 — Reactivos por frasco y salidas con aprobación

Toma ReactiLab como referencia de UX. Los patrones visuales están en `DESIGN.md`.

- **Por frasco.** Cada ingreso registra uno o más frascos (envases) de un mismo lote, cada uno con código propio (lote y número), cantidad inicial y QR.
  - La posición es frasco más ubicación; salidas, ajustes y traslados operan sobre un frasco.
  - El ingreso puede crear el lote en la misma ventana ([01 §6.1](01_producto.md#61-inventario-de-reactivos-m2)).
  - Resuelve la pregunta «Envases». La apertura y la caducidad tras abrir llegan si el laboratorio las pide.
- **Lote sin estado.** Solo es un dato: código, proveedor, lote del proveedor y caducidad. No hay cuarentena, bloqueo ni descarte de lote.
  - Un frasco vencido, contaminado o roto se desecha con «Ajustar» a cero y un motivo de la lista («Vencido», «Contaminado»); queda como ajuste, con su responsable. No existe un movimiento «baja».
  - La disposición por posición (cuarentena de un retorno) sigue en el diseño para custodia y retornos ([03 §4](03_datos.md#4-inventario-y-reactivos)).
- **Dos niveles.** El inventario lista reactivos con su total y avisos; la ficha muestra encabezado, frascos e historial.
  - Frasco: proveedor, ubicación, caducidad, código, saldo con la barra de lo que queda, lote, lote del proveedor, ingreso y, con solicitudes pendientes, lo apartado y lo disponible (`/positions` añade `lot.supplierName`, `lot.supplierLot` y `container.receivedAt`).
  - Acciones por frasco: Salida, Trasladar y Ajustar; la etiqueta se imprime desde la ficha. No hay «borrar».
  - Encabezado: identidad en una línea (código, CAS, estado físico) y tres datos: Existencia, Mínimo (con «Fijar» o «Cambiar» para quien administra el catálogo) y Caducidad. «Sin vencidos ni por vencer» solo afirma lo que cuenta: la caducidad sin confirmar se avisa en cada frasco.
  - Lo que PlatLab no modela (tara, peso neto, densidad, categoría, «controlado») no se muestra; «controlado» llega con fiscalizados.
- **Salidas del Operador con aprobación.**
  - La solicitud aparta la cantidad del frasco con una reserva `held`: nadie más dispone de ella.
  - El Administrador o el Propietario la aprueba (la salida se confirma y la reserva pasa a `fulfilled`) o la rechaza con motivo (`released`).
  - Las salidas del Administrador y del Propietario son directas, y nadie aprueba su propia solicitud. Los ingresos son directos.
- **Vencidos.** Se permite sacar de un frasco vencido, con advertencia visible; el movimiento guarda la caducidad que tenía.
- **Sugerencia FEFO.** La salida propone el frasco utilizable que vence antes, nunca el de menor cantidad.
- **Salida rápida.** Atajos de cantidad (25 %, 50 % y todo el frasco) y la vista de lo que quedará.
- **Motivos y destinos.** Listas del espacio que administra el Administrador. La operación guarda el texto elegido, así que cambiar la lista no altera la historia. Se archivan, nunca se borran.
- **Vencido y por vencer.** Vencido: la caducidad del lote es anterior a hoy, en la zona del espacio. Por vencer: caduca entre hoy y los próximos 30 días ([02 §12](02_arquitectura.md#12-parámetros-iniciales)). Solo cuentan frascos con saldo, en las ubicaciones que el miembro puede consultar. El inventario los dice con texto y filtra por ellos.
- **Mínimo.** Uno por reactivo, para todo el espacio, en su unidad base y opcional; lo fija el Administrador al crear el reactivo o desde su ficha (`reagents.catalog.manage`). Bajo mínimo: la existencia física (todos los frascos con saldo, con vencidos y lo apartado) es menor que el mínimo; sin existencias y con mínimo, también. El inventario lo marca con texto y filtra por él (`?minimo=bajo`).
- **Resumen.** Cuatro indicadores por urgencia: Por aprobar (o Mis solicitudes), Vencidos, Por vencer y Bajo mínimo (con el total de reactivos y frascos en texto pequeño). Cada uno abre la lista que lo explica: Solicitudes, o el Inventario filtrado.
  - No hay «Ubicaciones» (contaba frascos) ni «Salidas» (el gráfico ya lleva su total). En el Inicio, el dato se dice «frascos».
  - La acción rápida va en banda compacta bajo los indicadores; debajo, el gráfico y la actividad reciente. Cabe en una ventana de escritorio desde 1280 × 720 (`DESIGN.md`).
- **Movimientos como libro por días.** Extiende la línea de tiempo del Resumen a pantalla completa.
  - Filtros en píldoras: tipo (todos, ingresos, salidas, ajustes) y periodo (7, 30, 90 días o todo), en `?tipo=` y `?dias=`; la cifra del Resumen abre exactamente su lista.
  - Asientos agrupados por día en la zona del espacio, con cantidad con signo y saldo. Cada fila abre la ficha (la lista añade `product.id`).
  - Sin totales por día ni del periodo: la lista llega por páginas y un total en el navegador saldría incompleto sin avisarlo; si hacen falta, los calcula el servidor.
  - Sin editar, borrar ni «deshacer»: un error se corrige con un ajuste.
  - `@tanstack/react-table` sale de las dependencias de la web (no hay tablas); vuelve (ADR 0010) cuando una pantalla necesite una de verdad. `Table` de `packages/ui` se conserva.
- **Traslado en un paso.** Mueve un frasco entero, con todo su saldo, a otra ubicación: una operación `transfer` con dos asientos (sale del origen, entra en el destino), visible en Movimientos como «Traslado». Sin borrador, aprobación ni tránsito. Lo registran el Operador y el Administrador (`reagents.transfer.create`). Un frasco vacío o con salidas pendientes no se traslada: primero se resuelven.
- **Conteo por ubicación.** El Administrador elige una ubicación, anota lo que hay en cada frasco y confirma: un ajuste con motivo «Conteo» y un asiento por cada frasco que no cuadra. Si un saldo cambió mientras se contaba, se pide volver a cargar; si lo contado queda por debajo de lo apartado, primero se resuelven las solicitudes.
- **Etiqueta con QR por frasco.** Lleva código, reactivo, lote y caducidad; se imprime a 3 × 8 por hoja A4 desde la ficha, eligiendo los frascos.
  - Cada QR es único: identifica el espacio y el frasco y no sirve en otro espacio. Es un enlace corto (`/q/`) que la cámara del móvil abre, tras iniciar sesión, sin escáner propio.
  - Escanear abre la descarga de ese frasco: la hoja de salida con el frasco elegido (para el Operador, «Solicitar salida», con la aprobación de siempre). Si no se puede descargar (vacío, todo apartado o sin permiso), la ficha resalta el frasco y dice por qué.
  - El escaneo dentro de la app sigue pendiente (P-03).
- **Orden.** R-01A (todo lo anterior, sin dependencias externas) va antes de T-07. R-01B (SDS privada, avisos por correo y exportación) va después ([roadmap](04_roadmap.md)).

Motivo: el laboratorio ya trabaja por frasco con ReactiLab; el QR, el % restante y el control de las salidas son parte de su práctica. Se construye en la capacidad inventario para que Materiales lo herede.

No se copia de ReactiLab: frasco, lote y código fusionados; ajustes sin signo; el borrado como baja; el saldo recortado a cero en silencio; la sugerencia por menor cantidad.

Cambios: 05-10, 06-10-2026 (historial en git).

<a id="adr-0013"></a>
## ADR 0013 — Delegación por riesgo y puertas del harness

- **Orquestador:** la sesión principal (Opus 5.5 en `xhigh`). Diseña datos, flujos e invariantes, define en el brief los casos de prueba (permisos, concurrencia, saldos), revisa lo delicado, confirma y sube. Lo trivial lo hace en línea.
- **Reparto por riesgo, no por capa.** Todo cambio que pueda alterar saldos, permisos, datos, concurrencia o el contrato de la API va a `platlab-implementer` (Opus 5.5 en `high`), esté en SQL, en el servidor o en la web, y ese agente escribe también sus pruebas. Lo demás va a Sonnet 5.5 en `high`: `platlab-ui-implementer` (presentación, movimiento, avisos y e2e de UI) y `platlab-assistant` (docs, cambios mecánicos, pruebas sin lógica nueva y ejecución de la verificación).
- **Escalada.** Un subagente no lanza otros. Un agente Sonnet se detiene y reporta «Bloqueo» si el cambio toca lo delicado, si la misma comprobación falla dos veces o si falta una decisión; el orquestador lo reasigna. Las correcciones siguen con el mismo agente (`SendMessage`).
- **Puertas automáticas** (`.claude/settings.json`):
  - Al terminar un implementador con cambios de código corren `typecheck`, `lint`, `deps` y `knip`. Si fallan, el agente vuelve a trabajar una vez; si siguen fallando, termina y se avisa.
  - Quedan bloqueadas las escrituras remotas de Supabase y Cloudflare por MCP, `supabase link` y `db push`, y `git push --force`.
- **Revisor de UI.** `impeccable-finish-reviewer` recibe el paquete de PlatLab (`CLAUDE.md`, «Frontend»), porque PlatLab refina un sistema existente sin diseños de referencia ni semilla.
- **Evidencia.** Una fila por entrega, cuando el CI del mismo commit terminó.

Motivo: el riesgo depende de lo que un cambio puede romper, no de la capa; las pruebas de invariantes son la especificación; una regla que depende del prompt se vuelve una puerta automática; y el contexto del orquestador se reserva para decidir. Reemplaza el reparto anterior de `CLAUDE.md` (Opus solo para código delicado y Sonnet por tipo de tarea).

## Pendientes

| Tema | Pregunta | Se resuelve en |
|---|---|---|
| Fiscalizados | Sustancias, concentraciones, cupos, sitios, custodia, formato vigente del reporte y si las salidas reguladas requieren aprobación | REG-01 (F0) |
| Espacios del piloto | ¿Una o varias unidades operan el inventario? ¿La calificación abarca varias? ¿Necesita el titular una vista consolidada de sus espacios (informes o traslados entre ellos)? Hoy los espacios no comparten nada, aunque sean del mismo titular; abrirlo exige una decisión nueva | F0, con REG-01 |
| Soluciones preparadas | El diseño ya está decidido (03 §4). Falta saber si el laboratorio almacena soluciones y si siguen siendo fiscalizadas | REG-01 |
| Materiales en prácticas | ¿La práctica representativa usa material que se entrega y se devuelve? Si es así, se adelanta un Materiales mínimo a F3 | P-04 |
| Registro paralelo | ¿El laboratorio conserva su registro actual durante el piloto? | F0 |
| Reglas de Prácticas | Anticipación, cancelaciones, salas exclusivas, devoluciones químicas y quién declara el consumo al cerrar | P-04, antes de F3 |
| Préstamos | Prestatarios externos, plazos, pérdidas y retrasos | Antes de F4 |
| Mantenimiento y analítica | Carácter obligatorio o recomendado, quién libera el equipo, destinatarios de alertas y fórmulas | Antes de F5 |
| Ámbito por ubicación | Los roles valen para todo el espacio (ADR 0008). Retirar `location_id` de las asignaciones y simplificar las consultas que filtran por ámbito | Entrega aparte, antes de T-07 |
| Escaneo con cámara | La etiqueta QR abre el frasco con la cámara del móvil (ADR 0012). ¿Hace falta además un escáner dentro de la app para registrar salidas en serie? | P-03 |
| Retención y respaldos | Duración por repositorio y mecanismo de supresión anticipada | DP-01, antes de G1 |
| Conexión a PostgreSQL | ¿Conexión directa con el complemento IPv4 o Supavisor en modo sesión? | S-01 |
| Credencial local del rol de runtime | `supabase/seed.sql` fija una contraseña de desarrollo. Antes de usar ramas de Supabase o staging, pasarla a una variable de entorno local o desactivar el seed fuera de local y CI | S-01 |
| Conectividad | Cortes reales y procedimiento de continuidad | F0 |
| Modelo comercial | Recomendado: licencia anual por espacio y paquete + incorporación única + desarrollos a medida aparte ([01 §4](01_producto.md#4-paquetes)). Pendiente de confirmar por el usuario | Antes de cotizar |
| Precio | Tarifa por espacio con costos medidos, soporte y margen | Antes de cotizar; S-01 aporta los costos |
| Código de ReactiLab | Titularidad y licencia: el README dice MIT y los términos dicen software propietario | Antes de copiar componentes |
