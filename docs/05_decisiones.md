# 05 — Decisiones y pendientes

Revisión: 12 de octubre de 2026. Registro resumido de decisiones de arquitectura (ADR); cada ADR dice solo lo vigente. Una decisión aceptada solo se reemplaza con otra que indique qué cambia. El texto completo anterior de los ADR 0001–0007 está en el commit `bc26fa8`.

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
| [0014](#adr-0014) | Reactivos completo: cinco secciones, Movimientos como informe y avisos comunes | Aceptado el 12-10-2026 |
| [0015](#adr-0015) | Ingreso en un paso, control por peso y controlados | Aceptado el 12-10-2026 |
| [0016](#adr-0016) | Controlados al final y orden para completar Reactivos | Aceptado el 14-10-2026 |
| [0017](#adr-0017) | Ficha de seguridad pública, exportación por streaming y T-07 aplazado | Aceptado el 14-10-2026 |
| [0018](#adr-0018) | Reactivos concluido para el piloto; sigue Equipos | Aceptado el 15-10-2026 |
| [0019](#adr-0019) | Equipos con la forma de Reactivos: estado separado y Mantenimiento como módulo propio | Aceptado el 15-10-2026 |
| [0020](#adr-0020) | Mantenimiento intermedio sin inventario propio | Aceptado el 17-10-2026 |
| [0021](#adr-0021) | Rediseño de la UI por módulos, empezando por Mantenimiento | Aceptado el 19-10-2026 |

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
- **Roles.** Son paquetes de permisos del catálogo fijo, combinables y asignados en el espacio.
- **Escalera de permisos: Propietario ⊇ Administrador ⊇ Operador.**
  - El Operador ejecuta y consulta toda la información operativa y hace los registros del día a día.
  - El Administrador incluye todo lo del Operador, decide las solicitudes, configura los catálogos y aplica ajustes. No invita personas ni asigna roles sin la delegación del propietario.
  - El Propietario gobierna suscripción, miembros y propiedad. Tiene en todo el espacio los permisos del Administrador (y por tanto los del Operador) sin que nadie se los asigne ni pueda retirárselos mientras lo sea; al transferir la propiedad, pasan al nuevo propietario.
  - En SQL, los permisos efectivos son las asignaciones vigentes más los del rol Administrador para la membresía propietaria, en un solo lugar (`core.effective_role_assignments`).
- **Responsable de fiscalizados.** Es una designación aparte; el Propietario no la recibe salvo que se le asigne.
- **Los roles valen para todo el espacio, no por laboratorio.** El Operador accede a todo Reactivos, con todas sus ubicaciones. La ubicación es un dato del registro (dónde está cada frasco), no un límite de acceso. Los laboratorios se gestionan en M4 Laboratorios.
- **Sin ámbito técnico.** `core.role_assignments` ya no tiene `location_id`: la autorización comprueba solo el permiso en el espacio y las consultas no filtran por ubicaciones del miembro (paso 2 del [ADR 0016](#adr-0016), 14-10-2026).
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
- **Ventanas como ReactiLab (13-10-2026).** Material de vidrio esmerilado (translúcido con desenfoque y fondo sólido sin soporte), bandas separadas por líneas de borde a borde y botón principal alto con icono. En «Registrar salida»:
  - cabecera con el icono del módulo, el reactivo y el frasco;
  - barra de stock con color por nivel y su texto;
  - cantidad grande sin subrayado;
  - «Todo» como enlace;
  - etiquetas claras de ancho parejo.
  - La ficha (nivel 2) usa el mismo lenguaje sobre el fondo normal, sin degradado. El resumen (Existencia, Mínimo y Caducidad) va en un panel compacto de tres filas, en una columna derecha fija desde 1280 px; por debajo, en una franja compacta bajo la cabecera (13-10-2026). Cada frasco muestra código y estado, ubicación y marca en texto, saldo con barra por nivel, la caducidad exacta y los pesos, sin «Ingresó». La barra por nivel, las pastillas, las bandas y el cuadro de icono son piezas compartidas.
  - Etiquetas QR: «Etiquetas» gira todas las tarjetas hacia su etiqueta (unos 300 ms, escalonado; sin giro con movimiento reducido). Tocar una la elige, y una barra inferior imprime las elegidas con la hoja de etiquetas existente (13-10-2026).
- **Ficha.** Sin «← Inventario»: el menú ya lleva al Inventario. Queda abierto darle una función propia (por ejemplo, una miga de pan en la barra superior).
- **Movimiento.**
  - Pulsación de 100–150 ms con CSS; superposiciones de 150–200 ms que nacen de su origen.
  - Spring sin rebote para hojas y fichas.
  - Se respeta `prefers-reduced-motion`.
  - Nunca se animan filas, escritura ni bucles.
- **Dominio por encima del estilo.** Sin UI optimista sobre existencias ni «deshacer» en un movimiento confirmado: se corrige con otro movimiento. Estados con texto y una acción primaria por pantalla.
- **Verificación.** Playwright con axe (WCAG 2.2 AA) en CI. El cierre de UI, por entrega y por puerta, está en el [ADR 0013](#adr-0013).
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
  - Lo que PlatLab no modela (categoría) no se muestra. Tara, densidad y «Controlado» se modelan desde el [ADR 0015](#adr-0015).
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

Cambios: 05-10, 06-10, 12-10-2026 (historial en git).

<a id="adr-0013"></a>
## ADR 0013 — Delegación por riesgo y puertas del harness

- **Orquestador:** la sesión principal (Opus 5.5 en `xhigh`). Diseña datos, flujos e invariantes, define en el brief los casos de prueba (permisos, concurrencia, saldos), revisa lo delicado, confirma y sube. Lo trivial lo hace en línea.
- **Reparto por riesgo, no por capa.** Todo cambio que pueda alterar saldos, permisos, datos, concurrencia o el contrato de la API lo implementa la sesión principal en línea, esté en SQL, en el servidor o en la web, con sus pruebas (ver «Quién implementa»). Lo demás va a Sonnet 5.5 en `high`: `platlab-ui-implementer` (presentación, movimiento, avisos y e2e de UI) y `platlab-assistant` (docs, cambios mecánicos y pruebas sin lógica nueva).
- **Escalada.** Un subagente no lanza otros. Un agente Sonnet se detiene y reporta «Bloqueo» si el cambio toca lo delicado, si la misma comprobación falla dos veces o si falta una decisión; el orquestador lo reasigna. Las correcciones siguen con el mismo agente (`SendMessage`).
- **Puertas automáticas** (`.claude/settings.json` y `.claude/hooks/`):
  - Ningún implementador confirma, sube, abre PR ni edita `.claude/settings.json` o `.claude/hooks/`: `subagent-guard.sh` lo rechaza.
  - Los agentes Sonnet no escriben en `supabase/`, `apps/server/`, `packages/contracts/` ni `packages/modules/`. El mismo hook rechaza la edición, y `subagent-gate.sh` compara al terminar el contenido con el del inicio para detectar cambios hechos por otra vía (Bash, scripts, regeneraciones). Si los hay, el agente los reporta como «Bloqueo» y no los deshace. La lógica delicada de `apps/web` no tiene ruta propia: sigue dependiendo del brief.
  - Al terminar un implementador con cambios de código corre `typecheck`. En la etapa de cierre corren además `lint`, `deps` y `knip`, y si `platlab-ui-implementer` cambió `.tsx` o `.css` de la interfaz, debe dejar capturas nuevas de escritorio y móvil en `apps/web/.impeccable/review/`. Si algo falla, el agente vuelve a trabajar una vez; si sigue fallando, termina y se avisa.
  - En local se bloquean las escrituras remotas de Supabase y Cloudflare por MCP, `supabase link`, `db push` y `git push --force`. Son avisos tempranos: las reglas de Bash solo comparan prefijos. La barrera es una regla de GitHub que impide el force-push y el borrado de `main`.
- **Revisor de UI.** Un hook `SubagentStart` le da a `impeccable-finish-reviewer` el paquete de PlatLab: refina un sistema existente sin diseño de referencia, tarjeta QUALITY BAR ni semilla, y esas comprobaciones no aplican.
- **Cierre de UI.** Por entrega: capturas de escritorio y móvil, `review-animations` si cambió el movimiento e `impeccable-finish-reviewer`. Por puerta (G0, G1…): `impeccable audit`, `harden` y `polish` sobre todo el frontend, más `review-animations`. Las skills que el flujo exige deben poder invocarse: `review-animations` y `pick-ui-library` no llevan `disable-model-invocation`.
- **Evidencia.** Una fila por entrega, cuando el CI del mismo commit terminó.
- **Economía de tokens (13-10-2026).** Medido: arrancar un subagente costaba ~40k tokens antes del brief (MCP heredados, skills y `CLAUDE.md`), y R-01D sumó ~1,2M en subagentes.
  - La orquestación sale de `CLAUDE.md` a `.claude/orquestacion.md`, que solo recibe la sesión principal (hook `SessionStart`).
  - Cada agente declara sus herramientas (`tools`, sin MCP ajenos). Los que no tocan lo delicado no cargan `CLAUDE.md` (`omitClaudeMd`). `platlab-assistant` pasa a `medium`; los implementadores, a 40 turnos, y el asistente, a 25.
  - Las pruebas corren una sola vez, en la etapa de cierre: la sesión principal corre las dirigidas y `pnpm check`, y el CI del PR, las suites y el e2e. La verificación la hace la sesión principal con el log del CI, sin subagente.
  - Briefs de 40 líneas y entregas de 40 turnos como máximo; hasta ~20 líneas, en línea; una sola ronda de capturas.
- **Etapas de una entrega (14-10-2026).**
  - *Cambios* (por defecto): los agentes implementan y escriben o ajustan las pruebas sin correrlas, y el usuario revisa en el navegador. `subagent-guard.sh` rechaza que un agente corra pruebas, y la puerta solo vigila el carril y `typecheck`.
  - *Cierre*, cuando el usuario aprueba los cambios: la sesión principal marca la etapa en `.git/claude-fase` (local, sin versionar; los agentes no lo tocan) y corre las pruebas dirigidas, `pnpm check`, las capturas con el revisor y el CI. Con la siguiente entrega vuelve a *cambios*.
  - El brief designa la ubicación (codebase-memory; en SQL, rangos de `grep`, porque el índice lo cubre parcialmente), las skills y las herramientas. Los agentes no precargan skills ni exploran: si falta algo, una búsqueda puntual y, si no basta, «Bloqueo».

- **Quién implementa (14-10-2026).** Medido en el paso 2 del [ADR 0016](#adr-0016): la sesión principal arranca con ~58k tokens y un subagente con ~31k. Los dos agentes Opus releyeron 5,8 M en 75 turnos; la orquestación, 7,8 M en 66, y unos 12 de esos turnos fueron solo avisos de un monitor de tokens. Lo caro es el contexto, que crece con cada lectura y razonamiento y se relee en cada turno; el brief pesa ~2k.
  - Lo delicado lo implementa la sesión principal en línea, con sus pruebas, justo después de ubicarlo: sin brief ni relectura. De Opus a Opus delegar no abarata el token; solo aísla el contexto.
  - Sin agente Opus delegado (28-10-2026, pedido del usuario: se eliminan `platlab-implementer` y `delegate-guard.sh`). Una entrega delicada grande se parte en base y API, lógica web y pantallas, y cada parte la hace la sesión principal.
  - Sonnet sigue con la UI, los docs y lo mecánico: su menor precio por token compensa el arranque.
  - La sesión principal trabaja en `high` al implementar y en `xhigh` solo para diseñar o decidir.
  - Código: codebase-memory primero. `read-guard.sh` rechaza un `Read` sin rango de un `.ts` o `.tsx` de más de 300 líneas, también en la sesión principal. El brief nombra las funciones por su nombre calificado.
  - Sin monitores de tokens: cada aviso despierta a la sesión principal con todo su contexto. El uso de cada agente llega en su aviso de fin; el detalle sale una sola vez de `.claude/scripts/agent-tokens.sh`.
  - Pendiente del usuario: deshabilitar los MCP y las skills de la cuenta ajenos a PlatLab, que pesan en cada turno de cada sesión.

Motivo: el riesgo depende de lo que un cambio puede romper, no de la capa; las pruebas de invariantes son la especificación; una regla que depende del prompt se vuelve una puerta automática; y el contexto del orquestador se reserva para decidir. Las etapas evitan repetir pruebas y capturas sobre cambios que el usuario aún va a ajustar. Reemplaza el reparto anterior de `CLAUDE.md` (Opus solo para código delicado y Sonnet por tipo de tarea). La revisión del harness del 07-10-2026 añadió los rechazos, la comparación de contenido, las capturas, el paquete del revisor y el cierre de UI por puerta: el cierre de R-01A nunca se ejecutó (una de sus skills no se podía invocar) y `main` no tenía protección.

<a id="adr-0014"></a>

## ADR 0014 — Reactivos completo: cinco secciones, Movimientos como informe y avisos comunes

- **Cinco secciones:** Resumen, Inventario, Movimientos, Solicitudes y Fiscalizados. No hay Informes, Documentos ni Configuración:
  - Los informes son Movimientos e Inventario filtrados (abajo).
  - Cada documento vive donde se usa. La SDS va en la ficha del reactivo y en la hoja de salida, y el Inventario filtra «Sin SDS». El ingreso no registra factura ni guía (el usuario lo descartó el 14-10-2026), y las autorizaciones van en Fiscalizados. La carpeta de SDS para una inspección se obtiene exportando las de los reactivos filtrados.
  - Motivos y destinos: el Administrador los añade y los archiva desde la misma lista donde los elige ([ADR 0012](#adr-0012)). Cada etiqueta lleva una papelera que la archiva de un clic, con aviso «Deshacer» (13-10-2026). En Movimientos son filtros.
- **Movimientos como informe (R-01C).** Lo que se filtra es lo que se exporta. Los filtros van en la URL, así que un informe es un enlace.
  - «Imprimir» saca lo filtrado (hasta 1.000 filas, con aviso si hay más) en una página con el espacio, el período y los filtros. En la vista Totales imprime los totales.
  - El panel de filtros no se desplaza:
    - Período y Tipo van en pastillas; «Mes anterior» se quita.
    - Los demás grupos se pliegan, de uno en uno, con buscador, las 5 opciones más usadas y «Ver más».
    - Reactivo muestra solo el nombre.
  (14-10-2026)
  - **Panel de filtros a la derecha**, plegable. Filtra por periodo (todo, 7 y 30 días, este mes, mes anterior, desde–hasta), tipo, reactivo (con búsqueda), responsable, destino, motivo y ubicación.
    - **Responsable** es quien pidió la salida si hubo solicitud y, si no, quien la registró: responde «¿qué consumió Ana?».
    - Cada filtro admite varios valores.
    - Cada opción muestra cuántos movimientos tiene con los demás filtros aplicados, y solo aparecen las que tienen resultados. Lo calcula el servidor. Dentro de un grupo, el conteo no considera lo marcado en ese mismo grupo, para poder sumar opciones.
  - Los filtros activos se ven como fichas sobre la lista, con quitar y «Limpiar», aunque el panel esté plegado. Por debajo de 1280 px el panel se abre con un botón «Filtros (n)»; en el móvil, como hoja.
  - **Dos vistas:** Detalle (el libro por días) y Totales por reactivo, responsable, destino o mes. Los totales los calcula el servidor y, dentro de cada grupo, separan por reactivo y unidad: nunca suman unidades distintas. Los traslados se cuentan, pero no suman cantidad. Cada fila abre el Detalle con ese filtro.
  - **Quién ve qué:** Detalle y filtros, todos los que ven Movimientos. Totales y exportación son «reportes» ([01 §5](01_producto.md#5-actores-y-roles)): permiso `reagents.report.read`, del Administrador, que el Propietario hereda.
  - **«Exportar a Excel»** (`.xlsx`) llega con R-01B.
    - Exporta la vista filtrada, con los filtros, el espacio, la fecha y quién lo generó en el encabezado.
    - Se genera en el worker y queda en la auditoría.
    - Exportan el Administrador y el Propietario ([01 §5](01_producto.md#5-actores-y-roles)); el Operador consulta.
    - El Inventario exporta igual su vista filtrada.
- **Fiscalizados** (REG-02, tras REG-01). Sección solo para el Responsable de fiscalizados y el Administrador. Contiene:
  - el perfil de cada sustancia;
  - la autorización, con sitios y cupos, y un aviso al acercarse al cupo;
  - la custodia y el retorno;
  - el reporte del periodo: borrador, revisión y exportación, y se sube a SISALEM a mano.

  En la operación diaria solo se ven la etiqueta «Fiscalizado» y su filtro en Movimientos.
- **Avisos comunes en Core.** Un solo sistema para todos los módulos.
  - Cada módulo declara sus tipos de aviso en su manifiesto y los emite por outbox (T-07). El envío, la campana y las preferencias son comunes.
  - Preferencias por persona en «Mis avisos», desde la tarjeta de la persona: agrupadas por módulo, por correo o en la app, con valores por defecto según el rol. No hay configuración por módulo.
  - Cada correo trae un enlace para darse de baja.
- **Preparación de soluciones:** mejora posterior a completar Reactivos ([01 §8](01_producto.md#8-fuera-del-alcance-inicial)). Su diseño en [03 §4](03_datos.md#4-inventario-y-reactivos) se conserva.
- **Orden.** Reactivos se completa antes de abrir otro módulo: R-01C, la entrega de ámbito por ubicación (Pendientes), T-07, R-01B y REG-02 cuando REG-01 esté validado ([roadmap](04_roadmap.md)).

Motivo: menos secciones hacen la app más simple. El laboratorio piensa un informe como un filtro de Excel sobre el libro, y documentos y avisos son transversales: se resuelven donde ocurren o una sola vez para todos los módulos. El panel va a la derecha porque la izquierda ya tiene el menú del módulo: se lee menú, luego lista y luego refinar. Reemplaza las secciones Informes, Documentos y Configuración del boceto de [01 §7](01_producto.md#7-cómo-se-ve-la-plataforma).

<a id="adr-0015"></a>

## ADR 0015 — Ingreso en un paso, control por peso y controlados

- **Una ventana «Ingresar reactivo»** reemplaza «Nuevo reactivo» y «Registrar ingreso». Es un formulario por secciones, al estilo de ReactiLab:
  - **Datos de la etiqueta:**
    - Nombre: busca en el catálogo o crea, en el mismo campo.
    - CAS: obligatorio, salvo en mezclas.
    - Marca, código, cantidad con su unidad, número de frascos y caducidad.
  - **Control por peso** (opcional).
  - **Dónde se guarda:** área o departamento, y ubicación.
  - **Clasificación y seguridad.**

  Las tres últimas secciones aparecen al escribir el nombre. Las sugerencias salen solo al escribir, desde 2 letras. Con un reactivo existente, sus datos de catálogo se rellenan y no se editan ahí.
- **Reactivo (catálogo):**
  - estado físico: sólido, líquido, acuoso, mezcla o gas;
  - peligros: los 9 pictogramas SGA;
  - **controlado**: lo marca el Administrador, nunca el sistema por el CAS;
  - ficha de seguridad por reactivo: digital (con enlace; el PDF llega con T-07), solo en físico o no tiene;
  - densidad (g/mL), para los que se miden en volumen;
  - unidad g, kg, mL o L, que no cambia tras el primer movimiento;
  - código del reactivo, automático.

  El mínimo se fija en la ficha, no en el ingreso.
- **Frasco: código propio, único en el espacio.**
  - Se sugiere a partir del nombre (`ACE-001`) o sigue la serie del reactivo (`AC-BIO-001` → `AC-BIO-002`), y es editable.
  - Varios frascos se numeran en serie.
  - Los códigos existentes se conservan, y el QR no cambia.
- **Lote:** guarda la marca (antes «proveedor») y la caducidad. No se piden ni el lote del fabricante ni el código del lote: el lote interno es automático.
- **Área o departamento:** lista propia del espacio. Se amplía desde el mismo selector y se guarda en el ingreso.
- **Ubicación por niveles:** hasta 3 campos (laboratorio o bodega › estante › nivel).
  - Cada campo sugiere los hijos del anterior.
  - Con «+» o Enter se crea la ubicación y se abre el nivel siguiente. Solo crean ubicaciones el Administrador y el Propietario.
  - Se crean ubicaciones de Core desde la API.
- **Control por peso:**
  - **Tara** = peso bruto del frasco lleno − cantidad × densidad (en masa: − cantidad).
  - En la ficha, cada frasco muestra Tara · Peso neto · Bruto esperado; la salida, «En balanza».
  - «Ajustar» ofrece «Por peso»: un ajuste con motivo «Pesada», con el saldo redondeado a centésimas.
  - Cálculos exactos (`numeric`).
- **Controlado:**
  - candado en la tarjeta del inventario y «🔒 Controlado» en la ficha;
  - filtro «Controlados» y aviso en la salida;
  - en la interfaz reemplaza «Fiscalizado»: la sección de REG-02 se llamará «Controlados» ([ADR 0014](#adr-0014)).
- **Conteo** sale de la interfaz. Se conserva en el servidor para conciliar el inventario de G1.
- **Referencia visual:** el prototipo de la rama `proto/r-01d-ingreso`, que no se fusiona.

**Ajuste de la ventana (13-10-2026):**

- Se llama «Nuevo reactivo»; desde la ficha, «Ingresar frascos».
- Cada sección va en su propio marco, visible desde el inicio. «Clasificación y seguridad» va en una tarjeta aparte, a la derecha en escritorio y al final en el móvil.
- La unidad se elige en un desplegable unido a la cantidad.
- El error del CAS aparece en un globo junto al campo. «Control por peso» explica cada campo con globos de ayuda.
- Área o departamento es un desplegable.
- La ubicación muestra sus tres niveles con texto guía; cada nivel se habilita al elegir el anterior.
- «Control por peso» es una sección desplegable, plegada al abrir y bajo «Dónde se guarda»; se abre sola si tiene datos o un error.
- El número de frascos va en el pie, unido al botón: [− N +] «Ingresar N frascos». «Caducidad» ocupa su lugar, junto a Cantidad.
- Tarjeta del frasco (14-10-2026):
  - Los estados van sobre el borde: «★ Usar primero» (FEFO), «Vencido», «Apartado», «Cuarentena» y «Restringido».
  - Contenido: el código, la marca y el área, el saldo con su barra, la ubicación con su ruta completa, y las fichas 📅 (fecha corta) y ⚖.
  - Trasladar es un botón propio (⇄) y el menú «⋯» desaparece.
  - Tocar el código abre «Detalles del frasco»: lote interno, fecha de ingreso, cantidad inicial, densidad y quién lo ingresó.
  - Ajuste del mismo día:
    - La ubicación va en dos líneas, como una dirección: la sala arriba y, en gris, el estante y el nivel.
    - La ficha ⚖ dice «Debe pesar N g» y ofrece «Corregir con la balanza». La tara y el neto pasan a «Detalles del frasco».
    - «Ajustar» vuelve como botón y abre una sola ventana que elige el método. Con control por balanza, pregunta «¿Qué marca la balanza?» y ofrece escribir la cantidad. Sin control, pregunta la cantidad y ofrece «Pesar el frasco para activar la balanza» (antes «Fijar tara»).
  - La tarjeta queda con «Salida» y ⇄. «Etiquetas QR» pasa a la cabecera de la ficha y gira las tarjetas (14-10-2026).
  - «Ajustar» vive solo en la ficha ⚖ de cada frasco, que ve quien puede ajustar:
    - con tara, «Debe pesar N g», con «Corregir con la balanza» y «Escribir la cantidad»;
    - sin tara, «Sin pesar», con «Pesar ahora para activar la balanza» y «Escribir la cantidad»;
    - el Operador la ve solo con tara, como información.
  - El icono del estado va junto al código del frasco.
  - En la cabecera, «Editar» es un lápiz junto al nombre. «Actualizado hace N min» y ⟳ pasan a la barra superior, junto a la miga de pan.
- Resumen de la ficha: tres tarjetas pequeñas separadas en una columna angosta.
- Inventario (nivel 1): 4 tarjetas por fila desde 1280 px, con el contenido centrado y las insignias (frascos, vencidos y controlado) en una fila bajo el total.

**Implementación (12-10-2026):**

- **Editar la ficha** (Administrador y Propietario): nombre, CAS, estado, peligros, controlado, ficha de seguridad y densidad. La unidad, solo sin movimientos.
- **Fijar tara** en la ficha (quien ajusta): tara = peso en balanza − saldo × densidad. Reemplaza la anterior y queda en la auditoría.
- **Densidad por frasco.** La del reactivo se sugiere; cada frasco guarda la tara y la densidad con que se calculó. Corregir la ficha no cambia frascos ya pesados.
- **Cálculos en el servidor.** Tara, ajuste por peso y fijar tara se calculan en SQL; el navegador solo los anticipa. Un peso menor que la tara se rechaza.
- **Reactivo nuevo desde el ingreso:** exige el permiso de catálogo. El Operador elige del catálogo.
- **Códigos.**
  - Reactivo: automático a partir del nombre (`ACETONA`, `ACIDO-CLORHIDRICO-37`).
  - Lote: automático por reactivo (`L-001`).
  - Frasco: el servidor sugiere la serie libre, acepta la editada y rechaza un código repetido.
  - Los frascos existentes conservan «lote-NN».
- **Área:** lista del módulo, como los destinos; el ingreso guarda el texto en el lote.
- **Ubicaciones:** se crean por la ruta de Reactivos con su permiso de catálogo, porque Core no tiene permisos propios. Un nombre repetido bajo el mismo padre devuelve la existente.

Motivo: quien registra tiene el frasco en la mano y llena lo que lee, de arriba abajo; separar el catálogo y el ingreso en dos ventanas lo hacía lento. La tara permite comprobar con la balanza lo que dice el sistema. «Controlado» se entiende igual en universidades, empresas y uso individual. Cambia el [ADR 0012](#adr-0012) (tara, densidad, código de frasco y ventanas de registro) y el término del [ADR 0014](#adr-0014).

<a id="adr-0016"></a>

## ADR 0016 — Controlados al final y orden para completar Reactivos

- **Controlados (REG-02) va al final y se reduce a lo que confirme REG-01.**
  - En el piloto, el reporte de controlados sale de Movimientos e Inventario filtrados por «Controlado» y exportados a PDF o Excel.
  - Cupos, custodia y reporte en formato oficial se hacen solo si REG-01 los exige.
- **Orden para completar Reactivos:**
  1. Mejoras pequeñas:
     - «Ficha de seguridad» en la hoja de salida, adonde lleva el escaneo;
     - ruta de la ubicación en el historial;
     - código automático sin palabras vacías.

     Revisado el 14-10-2026: los indicadores del Resumen ya enlazaban a su lista, y «Factura o guía» se descarta, junto con la referencia de texto que aceptaba el ingreso y la web no usaba.
  2. Ámbito por ubicación: solo limpieza de permisos. Las ubicaciones y la vista por laboratorio no cambian; esa vista es del módulo Laboratorios (F3). Hecho el 14-10-2026 (ADR 0008, «Sin ámbito técnico»).
  3. T-07: aplazado ([ADR 0017](#adr-0017)).
  4. R-01B: ficha de seguridad en PDF por reactivo (también al escanear y en la salida), avisos y exportar a Excel y PDF.
  5. Preparación de soluciones: pasa al final, como submódulo ([ADR 0017](#adr-0017)).
  6. Antes de G1: catálogo de más de 100 reactivos, auditoría de UI, QR impreso y rendimiento.
  7. REG-01 y REG-02 reducido.

Motivo: el usuario prioriza un módulo completo y usable. El reporte exportable cubre la obligación periódica mientras REG-01 confirma con el laboratorio y la norma qué más hace falta. Cambia la barrera de `CLAUDE.md` y el orden del [ADR 0014](#adr-0014) (14-10-2026).

<a id="adr-0017"></a>

## ADR 0017 — Ficha de seguridad pública, exportación por streaming y T-07 aplazado

- **Ficha de seguridad: enlace o PDF.** El Administrador pega el enlace del fabricante o sube el PDF. La ficha es informativa, no sensible: el PDF queda en un bucket público de Supabase Storage con enlace permanente.
  - Solo la API sube, con el permiso de catálogo del espacio; el navegador nunca escribe en Storage.
  - Ruta `<workspace_id>/sds/<uuid>.pdf`: nadie lista, sobrescribe ni borra archivos de otro espacio. Quien recibe un enlace ve esa ficha, y se acepta por ser informativa.
  - Solo PDF, comprobado por su contenido (`%PDF`), de 6 MiB como máximo ([02 §12](02_arquitectura.md#12-parámetros-iniciales)).
  - Nunca se sobrescribe: una ficha nueva es un archivo nuevo y la anterior queda para trazabilidad.
  - Storage se enciende en el entorno local y en el CI.
- **Exportar por streaming.** El Excel de Movimientos e Inventario sale de la misma consulta aislada del espacio, por lotes con cursor, sin cargarlo entero en memoria ni guardarlo. El PDF sale de «Imprimir».
- **T-07 se aplaza** (archivos privados, outbox y worker) hasta el primer efecto externo: correo, integración o trabajo en segundo plano. Los avisos de R-01B van solo en la app y se calculan al consultar.
- **Orden de Reactivos revisado:** R-01B; lo previo a G1, que suma el rendimiento con la carga sintética del roadmap y una prueba de aislamiento en todas las rutas; REG-01 y REG-02 reducido; y al final la preparación de soluciones, como submódulo de Reactivos.

Motivo: el usuario prioriza lo necesario para el piloto y menos superficie fuera de la base, donde un cliente podría mezclarse con otro; la ficha de seguridad no es un dato sensible. Cambia el orden del [ADR 0016](#adr-0016) y, solo para las fichas, la regla «Storage es privado» de 02 (14-10-2026).

**Implementación de R-01B (15-10-2026).** Tres entregas, una rama cada una: ficha en PDF, Excel e «Imprimir», y avisos.

- **Ficha en PDF.**
  - Cada archivo es una fila de `reagents.safety_sheets`, que nunca se borra; el reactivo apunta a la vigente. Hay una sola ficha vigente: enlace o PDF.
  - La API sube con las claves S3 de Storage, que solo alcanzan archivos; nunca con la clave `service_role`, que abre la base.
  - Autoriza, sube fuera de la transacción y registra en otra que vuelve a autorizar: nada externo con la transacción abierta. Si el registro falla, queda un archivo sin referencia; se acepta por ser público, con nombre aleatorio y sin datos sensibles.
  - Bucket público `public-files` en `supabase/config.toml` para el entorno local y el CI; en Supabase alojado se crea en S-01.
- **Excel.**
  - Se escribe con `fflate` (sin dependencias): las cantidades pasan como texto decimal exacto, nunca por `number`. Tope en [02 §12](02_arquitectura.md#12-parámetros-iniciales).
  - El Inventario lleva dos hojas: reactivos, como en pantalla, y frascos con saldo (lote, ubicación, caducidad y saldo).
- **Avisos.** Core los compone desde el manifiesto de cada módulo, como las tarjetas del Inicio, y cada uno exige su permiso.
  - Reactivos: solicitudes por aprobar (`reagents.issue.approve`), bajo mínimo, vencidos y por vencer (`reagents.catalog.read`).
  - Son condiciones vigentes: sin «leído», desaparecen al resolverse. «Mis avisos» llega con el correo (T-07). Reemplaza la emisión por outbox del [ADR 0014](#adr-0014).

<a id="adr-0018"></a>

## ADR 0018 — Reactivos concluido para el piloto; sigue Equipos

- **Reactivos queda concluido** con la ficha de seguridad en PDF (R-01B, entrega 1). Sus pruebas están escritas y se corren más adelante.
- **Lo pendiente se programa solo si el cliente lo confirma** (F0):
  - «Exportar a Excel», con el Inventario en dos hojas, y los avisos en la app (resto de R-01B, [ADR 0017](#adr-0017)).
  - El QR impreso y la auditoría formal de la UI (R-01A).
  - Lo previo a G1: rendimiento con la carga sintética, aislamiento en todas las rutas y los pendientes de la tabla de abajo.
  - REG-01 y REG-02 reducido, y la preparación de soluciones.
- **Reorganización sin cambiar la lógica**, hecha el 15-10-2026; falta correr las pruebas, que la confirman. Los comandos de Reactivos van por caso de uso en `application/` (catálogo, ficha, movimientos, salidas y listas), su prueba de integración en siete archivos con apoyo común, los contratos por área en `contracts/src/reagents/`, y `MovementFilterPanel` e `IngressSheet` en hooks y secciones. Equipos nace con esa estructura.
- **Sigue E-01 Equipos**, con el mínimo que confirme el cliente.

Motivo: el usuario da por concluido el módulo y no quiere lógica que el cliente no necesite. Reemplaza el orden del [ADR 0016](#adr-0016) y del [ADR 0017](#adr-0017), y la regla «Reactivos se completa antes de abrir otro módulo» del [ADR 0014](#adr-0014) (15-10-2026).

<a id="adr-0019"></a>

## ADR 0019 — Equipos con la forma de Reactivos: estado separado y Mantenimiento como módulo propio

- **Cuatro secciones**, con la forma de Reactivos ([ADR 0011](#adr-0011), [ADR 0014](#adr-0014)):
  - *Resumen:* equipos por estado, incidentes y estado por área. Indicadores: reparación promedio y días fuera de servicio, en los 12 meses de calendario hasta el actual.
  - *Inventario* por áreas: el área es el primer nivel de ubicación bajo la sede («Cuarto frío > Mesón 2» cuenta en «Cuarto frío»), con su encargado y sus cifras por estado; dentro, los equipos agrupados por tipo o todos. Aquí se registran los equipos («Registrar equipo»).
  - *Informe:* la foto del estado actual, con filtros (responsable, estado físico, garantía, vida útil…) e indicadores que se recalculan con ellos. Lo ven Administrador y Operador; exportar (PDF de hasta 1.000 equipos y Excel por partes, con encabezado y auditoría) es del Administrador, con `equipment.report.read`.
  - *Incidentes* (las fallas), en tres pasos: reportado → en reparación → solucionado. «Marcar como solucionado» exige qué se hizo, puede devolver el equipo a operativo y es definitivo. Quien reporta elige el tipo de falla y dice si el equipo se puede seguir usando; si no, pasa a fuera de servicio, ligado a la falla. Cada paso guarda quién y cuándo. Docente y Estudiante solo reportan y ven lo suyo, buscando el equipo por código o nombre sin ver el inventario.
- **Estado en cuatro dimensiones**, nunca en una sola lista:
  - *Estado* (en el código, condición): operativo, uso limitado, fuera de servicio o dado de baja (03 §5). Cambia con motivo; volver a operativo exige resultado y responsable.
  - *Estado físico* (conservación): bueno, regular o malo; cambiarlo deja un hecho en el historial, sin motivo.
  - *Tipo de falla*: eléctrica, mecánica, requiere repuesto u otra; vive en la falla.
  - *Disponibilidad*: se calcula y nadie la edita («Reservado» con Laboratorios; «Prestado» con M6; «En mantenimiento» con M7).
- **Mantenimiento es un módulo propio (M7)**: se vende aparte, requiere Equipos y no escribe en `equipment` ([ADR 0020](#adr-0020)). Sin M7, Equipos resuelve la falla con su resultado; con M7, la ficha suma su pestaña y el Inventario el próximo mantenimiento con semáforo.
- **El préstamo va en Préstamos (M6)**, un solo mostrador para material y equipos; el uso en prácticas, en Laboratorios ([ADR 0023](#adr-0023)), con el vínculo del incidente a la práctica.
- **Foto del equipo:** una principal, reducida en el navegador (WebP de 1600 px como máximo). Pública con las reglas de la ficha de seguridad ([ADR 0017](#adr-0017)): solo la API sube, comprobada por su contenido, con el límite de [02 §12](02_arquitectura.md#12-parámetros-iniciales); una foto nueva es un archivo nuevo.
- **QR por equipo, E-01d** (17-10-2026): enlace corto `/q/e/…` que no cambia, en la hoja de etiquetas de Reactivos. Al abrirlo, Administrador y Operador llegan a la ficha; Docente y Estudiante, a «Reportar incidente» con el equipo elegido. Un solo escáner reconoce frascos y equipos. Un equipo dado de baja no se reporta.
- **Documentos, E-01e** (17-10-2026): proveedor, compra, garantía, vida útil y valor de reposición en la ficha, y la pestaña Documentos (Manual, Factura, Garantía, Informe técnico, Acta de entrega). PDF públicos de hasta el límite general de 02 §12, con las reglas de la ficha de seguridad; el usuario acepta que quien reciba un enlace los vea. Solo el Administrador sube y quita («Quitar» archiva y conserva el archivo). Un incidente con la garantía vigente avisa «Reclama al proveedor».
- **Hoja de vida, E-01f** (ISO/IEC 17025 6.4.13): vista imprimible A4 desde el alta, con identificación, incidentes, historial y documentos vigentes, y con M7 sus mantenimientos; hasta 1.000 hechos por tabla, con aviso.
- **Se reutiliza lo común:** las ubicaciones por niveles son las de Core, las mismas de Reactivos; un nombre no se repite en el mismo nivel, sin distinguir tildes ni mayúsculas. Cada área tiene un **encargado**, miembro del espacio, guardado en la ubicación de Core para que Reactivos use el mismo dato; lo asigna el Administrador, con auditoría, y se propone como responsable al registrar un equipo allí. Las fallas viven en la capacidad `incidents`, con rutas y permisos de Equipos.
- **Entregas:** E-01a (tipos, ficha con foto, estado, traslados e historial), E-01b (fallas), E-01c (Inventario por áreas con encargado, Informe con exportación e Incidentes), E-01d (QR), E-01e (documentos y garantía) y E-01f (Resumen y hoja de vida); después, M-01. E-01a dejó en común los comandos y consultas de módulo, las ubicaciones activas de Core, el cursor y la edición parcial (`platform/`), los contratos comunes y el arnés de pruebas HTTP.
- **Latencia:** pesan los viajes a la base. Los permisos se leen una vez por transacción; un alta valida tipo, ubicación y responsable en una consulta y resuelve código y nombre únicos con su índice (`ON CONFLICT`); el Inventario pagina por código y busca en `search_text`. Con 5.000 equipos, la página tarda 0,07 ms y la búsqueda 1,5 ms; `pg_trgm` solo si un espacio supera unos 50.000 equipos.

Motivo: el usuario quiere Equipos con la forma de Reactivos. Separar el estado conserva el porqué de cada falla y evita editar la disponibilidad a mano, como MaintainX y Snipe-IT; la ISO/IEC 17025 (6.4.13) pide la hoja de vida por equipo. Mantenimiento es propio porque la proforma lo vende aparte. Cambia M3 y M7 en 01 §3, 03 §5, E-01 y M-01 del roadmap y la excepción de Storage de 02.

Cambios: 15, 16 y 17-10-2026; compactado el 16-11-2026 (el detalle de pantallas, en git).

<a id="adr-0020"></a>

## ADR 0020 — Mantenimiento intermedio sin inventario propio

- **Sin inventario propio.** Equipos dice qué hay, dónde y cómo está; Mantenimiento, qué toca hacerle, qué se hizo y cuánto costó. Cada trabajo apunta al equipo y lee de Equipos su código, nombre y área por una vista, sin copiarlos; sus FKs compuestas apuntan a los equipos y sus tipos. El estado y el estado físico cambian solo por los comandos de Equipos, con admisión de los dos módulos; el esquema `maintenance` no escribe en `equipment` ([ADR 0019](#adr-0019)).
- **Nivel intermedio.**
  - Entra: planes por tiempo de preventivo, calibración, verificación intermedia (ISO/IEC 17025 6.4.10) y limpieza, con lista de verificación y criterio de aceptación; correctivo con la misma hoja, enlazado al incidente; costos exactos (`numeric`); proveedores; certificado en PDF con las reglas de los documentos de Equipos; «Evaluar reemplazo».
  - Queda fuera: técnicos con carga de trabajo, bloqueo de agenda y repuestos (F5); frecuencia por uso; MTBF y predictivo; correo (T-07). Sin órdenes ni pasos previos: programar con un proveedor espera a que el cliente lo pida.
- **Secciones:** Resumen (la portada, [ADR 0021](#adr-0021)), «Por hacer» (la lista de trabajo: atrasados y próximos 30 días, con «Registrar»), Historial y Planes.
  - *Planes:* qué, a qué equipos (un tipo o un equipo), cada cuánto y desde cuándo; lista y criterio opcionales. En un plan por tipo, cada equipo puede excluirse con motivo o tener su frecuencia.
- **En Equipos, sin duplicar** (por puntos de extensión; Equipos no importa Mantenimiento): la pestaña Mantenimiento de la ficha, el próximo mantenimiento con semáforo en el Inventario (rojo vencido o no conforme, ámbar en 30 días, verde después, «Sin plan» neutro) y la sección de la hoja de vida.
- **Flujos.**
  - *Planificado:* aparece en «Por hacer» 30 días antes y se registra con fecha, resultado (Conforme / Con observaciones / No conforme) y quién lo hizo («Interno» por defecto); la lista si el plan la tiene; costo, certificado, «válida hasta» y estado físico opcionales. La próxima fecha se recalcula.
  - *Sin plan:* «Registrar mantenimiento» por búsqueda o QR; si corresponde a un plan, lo da por cumplido.
  - *No conforme:* la hoja propone «Cambiar estado» de Equipos con el motivo lleno, y quien registra lo confirma.
  - *Correctivo* (M-01b): un tipo de trabajo sin plan, con «Qué se hizo» obligatorio. Cada incidente abierto del equipo es una opción; elegirlo lo liga al registro, y con Conforme u Observaciones la hoja ofrece solucionarlo y devolver el equipo a operativo, por los comandos y permisos de Equipos. Con No conforme, el incidente sigue abierto. Desde el incidente, «Registrar en Mantenimiento» abre la hoja con todo elegido; «Marcar como solucionado» sigue en Equipos para lo que no lleva costo, proveedor ni certificado.
- **Reglas de fechas** (M-01a, decididas por el usuario):
  - Sin registros, toca en la fecha de inicio del plan o, si el equipo se registró después, en su alta. Luego, en la «válida hasta» del último registro o, sin ella, en su fecha más la frecuencia. Un registro con fecha pasada carga la última vez.
  - *Plan propio:* puede reemplazar al del tipo (el equipo se excluye en el mismo paso; archivarlo lo devuelve). Excluir pide motivo y se archiva.
  - *No conforme:* cuenta como hecho y la fecha avanza, pero el semáforo queda en rojo y el trabajo sigue en «Por hacer» hasta un registro Conforme o Con observaciones.
  - *Estado físico:* si se cambia en la hoja, Equipos lo aplica con su historial y la fecha de hoy, aunque el trabajo sea pasado; el registro no guarda copia.
- **Trazabilidad e ISO/IEC 17025 6.4** (18-10-2026):
  - El registro guardado por la persona autenticada es la firma; sin firma dibujada ni revisión por una segunda persona (si el cliente la exige, va como opción del plan).
  - Inmutable: guarda la lista marcada y el criterio con que se evaluó. *Anular y corregir* (M-01b) es del Administrador (`maintenance.record.void`), con motivo: corregir anula el anterior y crea el nuevo en una transacción; los dos quedan visibles y el anulado deja de contar. Lo aplicado en Equipos no se revierte.
  - *Requisito* (M-01c): texto opcional del plan (hasta 120 caracteres, p. ej. «ISO/IEC 17025 6.4.10») para medir el cumplimiento por requisito.
  - Bloqueos: plan → incidente → equipo → proveedor → registro corregido (02 §6).
- **Indicadores (M-01c)**, en los 12 meses de calendario hasta el actual, sin anulados:
  - Cada registro con plan guarda la fecha que tocaba. *A tiempo* es hecho en esa fecha o antes; cada fecha que tocaba es un trabajo programado: a tiempo, tarde o atrasado (cuenta una vez).
  - Cumplimiento del plan (% a tiempo), atrasados, calibraciones vigentes, costo preventivo frente a correctivo (con cuántos registros no tienen costo), programado frente a realizado por mes y cumplimiento por requisito.
  - *Evaluar reemplazo:* avisa, diciendo cuál, si cumplió su vida útil, si lo reparado llega a la mitad del valor de reposición o si tuvo 3 o más incidentes (02 §12). El Administrador lo descarta por 6 meses con motivo (`maintenance.replacement.review`); dar de baja es de Equipos.
- **Historial para el auditor (M-01d):** filtros en la dirección (periodo, tipo, resultado, área y proveedor), los anulados a la vista con su marca, «Imprimir» hasta 1.000 registros y «Excel» por partes ([ADR 0017](#adr-0017)) con encabezado y auditoría, del Administrador (`maintenance.report.export`). La línea de tiempo de la ficha reúne los hechos de Equipos y los trabajos de Mantenimiento, que llegan como datos por un punto de extensión.
- **Estado de calibración (6.4.8, M-01d):** en la cabecera de la ficha, para Propietario, Administrador y Operador, solo en pantalla (la etiqueta no caduca). Con los planes de calibración del equipo: «Calibrada hasta…», «Calibración vencida: no usar», «Calibración no conforme: no usar» o «Sin calibración registrada: no usar»; con varios planes manda el peor. Es la regla de «Calibraciones vigentes» y no cambia el estado del equipo.
- **Roles y permisos:** `maintenance.work.read` y `maintenance.work.record` (Administrador y Operador, que también ve costos); `maintenance.plan.manage` (Administrador, que crea planes y proveedores). Docente y Estudiante no entran: reportan en Equipos.
- **Sin tareas en segundo plano** (T-07 aplazado): «Por hacer», el semáforo y los avisos se calculan al consultar; los avisos van en la app.
- **Entregas:** M-01a (planes, proveedores, «Por hacer» y registro, con la pestaña y el semáforo en Equipos), M-01b (correctivo y corrección por anulación), M-01c (indicadores, requisito, «Evaluar reemplazo» y tarjeta del Inicio), M-01d (Historial con exportación, línea de tiempo, hoja de vida y estado de calibración) y el G0 junto con el de Equipos.

Motivo: el usuario quiere un módulo intermedio con la estructura de los demás, sin repetir la información de Equipos. Se toma de Fracttal One lo que garantiza la trazabilidad, no su forma de trabajo con órdenes. Precisa M-01 del roadmap y el M7 del [ADR 0019](#adr-0019).

Cambios: 17, 18 y 19-10-2026; compactado el 16-11-2026 (el detalle de pantallas, en git).

<a id="adr-0021"></a>

## ADR 0021 — Rediseño de la UI por módulos, empezando por Mantenimiento

- **Qué es** (pedido del usuario, 19-10-2026): un rediseño de la interfaz sin funciones nuevas, por fases (Mantenimiento, Equipos y Reactivos, 19 y 20-10-2026), para dar consistencia, jerarquía, feedback y accesibilidad. Las piezas comunes van en `app/`. Las funciones, los datos y los permisos no cambian; DESIGN.md y el [ADR 0010](#adr-0010) se mantienen.
- **El Resumen es la portada de cada módulo:** cuatro cifras, «Gestión rápida» con sus acciones, sus gráficos, «Por atender» a la derecha y avisos al pie solo si los hay, que abren la lista ya filtrada. En Mantenimiento reemplaza «Por hacer» como portada y absorbe Indicadores ([ADR 0020](#adr-0020)); el enlace viejo `/indicadores` lleva al Resumen.
- **Patrones comunes:**
  - Las cifras se tiñen solo cuando piden atención y la cuenta es mayor que cero.
  - Un solo botón sólido por pantalla; las acciones de fila, en contorno o como enlace.
  - Estados y plazos en pastillas con texto (y un icono en lo crítico); códigos en etiqueta monoespaciada; cantidades de movimiento como texto con signo y color, sin recuadro (DESIGN.md, «Voz única»).
  - Filtros en una barra horizontal encima de la lista, con su cuenta y buscador; la cebra solo en tablas anchas y en lo impreso.
  - Las ventanas emergentes, iguales en todos los módulos: «Cancelar» y la acción con su verbo; el botón principal nunca se desactiva y al enviar marca lo que falta; rótulos en tipo oración.
  - Fondo neutro y plano en toda la app, tarjetas blancas con sombra suave y un degradado por módulo que solo cambia `action-deep`.
- **Informes con un mismo formato:** «Exportar» en la cabecera (imprimir o PDF, y Excel), la barra de filtros y filas de altura uniforme con encabezado de columnas. Los nombres se quedan: «Informe» (Equipos) es el estado actual; «Historial» (Mantenimiento) y «Movimientos» (Reactivos) son registros en el tiempo.
- **Excel de Movimientos** (20-10-2026; adelanta lo pendiente de R-01B, [ADR 0017](#adr-0017)): por partes, con el espacio, la fecha, el autor y los filtros en el encabezado, la columna «Controlado» ([ADR 0016](#adr-0016)) y auditoría; de quien tiene `reagents.report.read`. El Excel del Inventario sigue pendiente.

Motivo: Mantenimiento se apartaba del patrón de Resumen que ya compartían Equipos y Reactivos, y sus listas planas cansaban la vista. El usuario prefirió validar el rediseño en un módulo antes de extenderlo.

Cambios: 19 y 20-10-2026; compactado el 16-11-2026 (el detalle de cada pantalla, en git).

<a id="adr-0022"></a>

## ADR 0022 — Calidad de Equipos y Mantenimiento: piezas comunes sin duplicar

Estado: aceptada (20-10-2026, a pedido del usuario: «cero lógica muerta o duplicada»).

- **Revisión con codebase-memory.** Fronteras, tipado y código muerto ya los vigilan `deps`, `typecheck` y `knip` en verde. Lo que falla es la duplicación entre módulos: cada uno copió lo que el anterior ya tenía, porque `web-features-isolated` impide importar de otro módulo. Hay además dos hojas de cientos de líneas que mezclan la lógica del formulario con la pantalla.
- **Lo común sube a su capa** (`apps/server/src/platform/` y `apps/web/src/app/`), nunca a otro módulo:
  - Servidor:
    - el Excel de un informe: la respuesta en partes de la ruta, el encabezado (espacio, fecha, autor y filtros) y la marca de tiempo; hoy está tres veces;
    - el día civil en la zona del espacio.
  - Mantenimiento lee «hoy» de la base con un solo ayudante tipado, sin conversiones.
  - Web:
    - el menú «Exportar» y la cabecera de sección;
    - las fechas civiles («hoy», días entre fechas), el conteo con plural, la validación y el peso del PDF y la inversión de las abreviaturas de la URL;
    - la lectura de la etiqueta de un equipo y los mensajes de error comunes.
- **Las hojas grandes se parten como la del equipo** (`asset-form.ts`):
  - la del plan pasa su lógica a funciones puras con pruebas;
  - la del registro se divide en secciones.
  - Los dos gráficos de barras comparten la leyenda, el eje y el cursor de teclado.
- **Se acepta sin cambio:**
  - la consulta de tipos de equipo que Mantenimiento repite: el aislamiento de los módulos de la web vale más que una caché compartida;
  - que ninguno de los dos tenga capa `domain/`: sus reglas viven en SQL y en `application/` (ADR 0006);
  - el `!` tras un `INSERT … RETURNING`.
- **No cambian** las funciones, los datos ni los permisos. Hay dos excepciones:
  - la cabecera de Equipos gana el foco de respaldo que ya tiene Mantenimiento;
  - los avisos del escáner de equipos dicen lo mismo en los dos módulos.

<a id="adr-0023"></a>

## ADR 0023 — Laboratorios: solicitudes y cronograma en un solo módulo

Estado: aceptada (20-10-2026; idea del usuario combinada con la propuesta de producto) y cerrada para el piloto (16-11-2026). Reemplaza la división M4 Laboratorios + M5 Prácticas y Solicitudes de [01 §3](01_producto.md#3-módulos). Aquí van las reglas; la forma de cada pantalla vive en el código y sus pruebas, y sus ajustes en git (PR #38 a #48).

- **Un módulo, «Laboratorios»** (código `labs`, ruta `laboratorios`), del pedido del docente al laboratorio listo; sirve a universidades y a empresas. El mapa queda en siete módulos y M5 no se reutiliza. La agenda (franjas y choques) es una capacidad con dueño técnico en `labs`: Equipos («Reservado») y Mantenimiento (bloqueos, F5) la consultan por su interfaz, sin escribir en ella.
- **Todo entra por solicitud y el Administrador organiza.** Cada bloque del Cronograma nace de una solicitud; sin repetición semanal: cada práctica es una solicitud.
- **Secciones:** Cronograma, Solicitudes («Mis solicitudes» y Recibidas) y Formatos. Laboratorios no tiene sección de espacios (decisión del usuario, 21-10-2026): Áreas ([ADR 0024](#adr-0024)) muestra por un punto de extensión, solo si el espacio tiene Laboratorios, el panel «Laboratorio» de cada área (aforo, sigla, horario semanal y cierres) con la marca 🕒 «Habilitada para prácticas», y «Feriados» en su cabecera. La anticipación y los períodos se editan en Formatos.
- **Roles:** piden el Docente y el Estudiante (tesista), y cada uno ve solo las suyas; la lista blanca es invitar con uno de esos roles (invitaciones reales con T-03B; CSV, Google y Microsoft en F3). Propietario, Administrador y Operador revisan, no piden. El Administrador programa, mueve, pide cambios y rechaza; el Operador consulta las recibidas y lleva bloques; el Docente y el tesista ven la tabla completa, sin la bandeja «Por programar» y sin mover nada.
- **Entregas** ([04](04_roadmap.md), L-01): L-01a Espacios y Formatos; L-01b Solicitudes; L-01c Cronograma; L-01d reserva real; L-01e preparación y cierre. Lo dudoso se valida con el cliente antes de programarlo (Pendientes, «Reglas de Laboratorios»).
- **Reglas de L-01a** (21-10-2026): se agenda el área completa (las salas se crean como áreas); horario semanal y cierres por área y feriados comunes; anticipación de 7 días, de 0 a 90, para todo el espacio: lo que llega tarde no se bloquea, entra «fuera de plazo» y el Administrador decide; sin áreas exclusivas.
- **Formato estándar** (21-10-2026): una hoja A4 como la P69, punto de partida de todo formato, rápida de llenar y con métricas comparables. La misma hoja sirve para diseñar, llenar, revisar en Recibidas e imprimir; en el móvil, un dato por fila. La hoja es neutra: sin el color del módulo, igual en pantalla e impresa.
  - **Membrete** por formato: un logo subido para el espacio de trabajo (JPEG, PNG o WebP de hasta 512 KiB) y hasta tres líneas; sin líneas, el nombre del espacio. Cambia con cada revisión. La casilla «Código» lleva el código de práctica; la hoja no usa código del documento.
  - **Diseño por filas y varios formatos** (21-10-2026; sin lienzo libre, que rompería la impresión y el móvil). Todo se edita sobre la hoja: filas de 1 a 3 datos «etiqueta | valor» y títulos de sección opcionales. Cinco datos esenciales (docente, título, fecha, horario y participantes) se renombran y se mueven, pero no se quitan: el Cronograma y el aforo los usan. Los opcionales del sistema (asignatura, carrera, tipo y grupos) conservan su clave en todos los formatos, para que las métricas sigan siendo comparables. Reactivos, Equipos y Materiales se renombran u ocultan (al menos uno queda); observaciones opcionales; de 1 a 3 firmas, una puede ser la del solicitante. Varios formatos con nombre: cada guardado publica una revisión inmutable, se archivan y no se borran, y cada solicitud guarda el formato y la revisión con que se llenó.
  - Asignatura y carrera se eligen de listas de Laboratorios que crecen al usarlas, nunca como texto libre: de ellas salen las métricas. Los campos libres son solo para lo propio de cada cliente y no entran en las métricas.
  - **Cantidades:** equipos y materiales «por grupo / total», y se guarda el total (2 por grupo × 8 grupos = 16); los equipos se piden por tipo; los reactivos, en total, con unidad y cantidad exacta.
- **Reglas de L-01b** (21 y 23-10-2026):
  - El solicitante cancela hasta el día anterior a su primer bloque; después, solo el laboratorio y con motivo. Los bloques se liberan y conservan su historial.
  - Los materiales se piden como texto con cantidad, sin inventario hasta un Materiales mínimo; los casos especiales de equipos, en Observaciones.
  - El tesista llena su propio formato (por ejemplo «Docente» renombrado a «Tutor»); el solicitante sale siempre de la sesión.
- **Diseño de L-01b** (21-10-2026):
  - Estados de [01 §6.2](01_producto.md#62-solicitud-y-práctica): borrador → enviada, cambios solicitados, rechazada, cancelada; programada (L-01c) y finalizada (L-01e). Se edita en borrador y en cambios solicitados.
  - Los datos del sistema se guardan en columnas (para las métricas); los libres, en un `jsonb` que el servidor valida contra la revisión del formato.
  - Una o varias fechas sueltas con un mismo horario. Al enviar, toda fecha es futura y está dentro de un período; si la primera cae antes de la anticipación, entra «fuera de plazo».
  - Recursos en una tabla de líneas: reactivo del catálogo (en su unidad base) o sin catálogo, tipo de equipo o sin catálogo, y material como texto. La marca ✔ ⚠ ✖ de cada línea sale de «Disponibilidad y recursos» y no reserva.
  - Historial visible de la solicitud (enviada, cambios con motivo, reenviada, rechazada, cancelada), aparte de la auditoría.
  - Recibidas muestra lo excepcional primero (fuera de plazo y recursos por revisar, dichos por tipo) y luego la fecha más próxima.
- **Sin área ni código en la solicitud** (15-11-2026): quien pide no elige área; se asigna al colocar cada fecha en el Cronograma, y Recibidas lleva a «Programar en el Cronograma». La solicitud no tiene número: se reconoce por su título y su formato y, programada, por el código de práctica de sus bloques, que también nombra lo apartado.
- **Períodos y sigla** (21-10-2026):
  - Los períodos son de Laboratorios: un código corto («P1») y sus fechas, sin solaparse; fuera de todo período no se agenda; se archivan.
  - La sigla del área (2 a 5 letras, única en el espacio) se guarda en `labs.spaces` y se sugiere desde el nombre («Anatomía» → ANT); no toca el Núcleo.
  - Código de práctica `P1-S12-ANT03`: período, semana contada desde su inicio, sigla y el número siguiente del área en esa semana. Los números no se reutilizan; si el bloque cambia de área, toma el siguiente de la nueva y el anterior queda en su historial. Las partes se guardan en columnas; el código solo se muestra.
- **Reglas y diseño de L-01c, Cronograma** (23-10-2026):
  - Cada fecha es un bloque y programarla es aprobarla; la solicitud queda «programada» cuando todas tienen bloque.
  - El responsable es un Operador o el Administrador (por defecto, quien programa); nunca el docente.
  - Bloquean: el choque con otro bloque del área (exclusión GiST), el horario del área, cierres y feriados, el período y que la fecha no sea futura. Superar el aforo solo avisa. El bloque ocupa solo su franja, sin márgenes de preparación.
  - El mismo día, el Administrador cambia el área, la hora o el responsable; cambiar el día es pedir cambios al docente.
  - Las reglas se escriben una vez en el contrato (`scheduleCheck`): las usan la vista previa al arrastrar y el servidor, que decide.
  - Arrastrar ayuda sin restringir: cae en la hora en punto de la fila bajo el puntero (o en la pedida, si está en esa fila) y resalta el horario pedido. «Programar…» y «Mover…» aceptan cuartos de hora y sirven con teclado y en el móvil.
- **Reglas de L-01d, reserva real** (24-10-2026; ajusta «sin reservas parciales» del [ADR 0007](#adr-0007)):
  - Cada bloque aparta lo suyo al programarse, en la misma transacción: las cantidades son por fecha.
  - Los reactivos salen de los frascos usables que vencen antes y siguen vigentes el día de la práctica; los equipos, de los operativos libres en la franja.
  - Lo que no alcanza se programa igual: se aparta lo que hay y lo demás queda «Falta».
- **Flujo de la Propuesta** (26-10-2026, sobre `docs/antecedentes/Propuesta.pdf`; reemplaza las propuestas con vencimiento del [ADR 0007](#adr-0007)): «Solicitar ajuste» es «Pedir cambios» con motivo, sin contraofertas. Antes de enviar, el docente ve lo que no alcanza, cuánto hay y en qué áreas, y las horas libres de un equipo ese día; solo informa: no aparta ni impide enviar.
- **Disponibilidad y recursos** (15-11-2026): una sola regla de «cuánto hay», en el servidor, para el buscador de la planilla, la marca de cada línea, la revisión antes de enviar, el Inicio y Recibidas.
  - Reactivo: saldo − reservado de los lotes vigentes en la última fecha pendiente y en lugares activos, frente a la cantidad × las fechas pendientes (sin fechas, hoy y una vez). Lo apartado para una práctica pasada sin cerrar sigue contando hasta que se cierre.
  - Equipo: los libres en la franja del peor día pendiente; sin fecha u horario, los operativos.
  - Con todas sus fechas programadas, la marca sale de lo apartado. Sin catálogo o sin el módulo admitido, «Sin verificar».
  - El docente busca en la celda de la planilla, con lo libre para sus fechas; la marca no se imprime; los materiales se escriben.
  - Aplazado al cerrar el módulo (16-11-2026): «Para aprobar» arriba del detalle y «Lo apartado» partido en «Reserva» y «Práctica».
- **Cierre de Laboratorios** (05-11-2026; lo «por confirmar» va a P-04 y se ajusta sin rehacer el flujo):
  - **Formatos:** el Administrador los edita sin pedir soporte. En la incorporación, el Equipo PlatLab arma el primero con él, desde su cuenta y sin acceso privilegiado ([ADR 0004](#adr-0004)). Un formato útil a otros clientes se vuelve plantilla del producto; no hay formatos a medida.
  - **Cambiar los frascos apartados:** en un bloque programado o listo, el Administrador elige de qué frascos sale cada reactivo, hasta lo pedido; lo no cubierto queda «Falta». Libera y aparta en una transacción.
  - **Preparación y cierre (L-01e)**, por bloque: programada → lista → en curso → cerrada, por quien tenga `labs.schedule.lead`. La lista de chequeo son los recursos y no bloquea «Lista» (por confirmar). «Iniciar», desde el día de la práctica; mover y cancelar, solo programada o lista. «Cerrar» registra por reactivo lo utilizado, hasta lo apartado, como salida «Práctica P1-S12-ANT03» hacia el área, y libera el resto (por confirmar: quién declara el consumo y si vuelve el químico abierto). Con todos sus bloques cerrados, la solicitud queda «Finalizada».
  - «Reportar incidencia», desde un bloque en curso o cerrado: el incidente nace en Equipos, autorizado por Equipos, con el vínculo a la práctica que guarda Laboratorios. La hoja impresa desde un bloque lleva en «Código» los equipos apartados.
  - **«Reservado» en Equipos:** la ficha del equipo muestra sus próximas reservas por un punto de extensión de Laboratorios; Equipos no depende de Laboratorios.
  - **Inicio de quien pide** (15-11-2026): la tarjeta la ve todo el que consulta Laboratorios. Administrador y Operador ven el laboratorio entero (por programar, fuera de plazo y bloques de los próximos 7 días con «Falta»); el Docente y el tesista, lo suyo (por programar y cambios pedidos). Ambos, el gráfico de solicitudes enviadas por día.
  - Sin correo al solicitante hasta el outbox (T-07, [ADR 0017](#adr-0017)): sigue el estado y el historial en «Mis solicitudes».
  - **G0 de Laboratorios:** demo sintética con solicitudes en cada estado y lo apartado coherente; pgTAP, integración y concurrencia de reservar, cambiar frascos y cerrar; e2e del flujo con axe y auditoría de la interfaz. Superado, el módulo pasa a `pilot`.
- **Color de Laboratorios** (26-10-2026): amarillo `#FFCB56` de fondo con texto casi negro, y oro oscuro `#7A5600` para textos, enlaces y focos sobre blanco.
- **Métricas previstas** (Analítica, M8): horas de uso por área; solicitudes y participantes por carrera, asignatura y tipo; consumo de reactivos y uso de equipos por práctica; pedidos fuera de plazo, rechazos y tiempo de respuesta. Los datos ya se guardan en columnas.

Cambios: 21-10, 23-10, 24-10, 26-10, 28-10, 05-11, 14-11, 15-11 y 16-11-2026 (compactada; el detalle anterior, en git).

<a id="adr-0024"></a>

## ADR 0024 — Áreas y departamentos en una sección propia

Estado: aceptada (20-10-2026; idea del usuario: cuadros que la app dibuja como un croquis). Ajusta la lista «área o departamento» de Reactivos ([ADR 0015](#adr-0015)), sus destinos ([ADR 0012](#adr-0012)) y Espacios de Laboratorios ([ADR 0023](#adr-0023)).

- **Dos datos en todo recurso:**
  - **Área (dónde):** la ubicación física del Núcleo (`core.locations`, `core.location_areas`), ya común a los módulos.
  - **Departamento (de quién):** lista nueva del Núcleo, con dueños y carreras. Un mismo laboratorio guarda cosas de varios departamentos.
- **Sección «Áreas» en la barra lateral, bajo «Inicio».** No va en el Resumen de los módulos.
  - La ven el Propietario, el Administrador y el Operador; crean, renombran y archivan el Propietario y el Administrador.
  - Un selector «Áreas | Departamentos» cambia la vista.
  - La app dibuja un cuadro por área, agrupado por sede o edificio: nombre, encargado y una cifra por módulo (🧪 reactivos con existencias, 🔬 equipos activos). No es un lienzo ni una tabla: nadie dibuja ni mueve cuadros.
  - Cada cifra abre la lista de su módulo filtrada por esa área o ese departamento.
  - Al abrir un área se ven y se crean sus estantes, y se asigna su encargado (Equipos lo muestra y deja de editarlo).
  - La vista Departamentos usa los mismos cuadros, con las cifras de cada dueño.
  - Cada módulo declara su icono y su cifra, como su tarjeta de Inicio: la sección no conoce a los módulos.
- **Los formularios solo eligen:**
  - la ubicación (ingreso, traslado, alta de equipo), entre áreas y estantes existentes, sin «+ Crear». Si falta, el aviso pide al Administrador crearla en Áreas;
  - el **departamento**, opcional, al ingresar un reactivo (reemplaza «Área o departamento») y al dar de alta o editar un equipo;
  - el **destino** de una salida es un departamento, como una carrera. La lista de destinos de Reactivos desaparece;
  - los motivos no cambian.
- **Reglas:**
  - un área con reactivos o equipos, en ella o en sus estantes, no se archiva: primero se trasladan;
  - archivar un departamento solo lo deja de ofrecer;
  - la historia no cambia: salidas y solicitudes guardan el texto del destino, como hoy. El lote y el equipo guardan el departamento enlazado: renombrarlo cambia en todas partes.
- **Datos actuales:** las listas «área o departamento» y de destinos pasan a la de departamentos, sin repetir nombres, y cada lote se enlaza por nombre. No hay datos reales; la demo usa carreras como departamentos.
- **Laboratorios** (se confirma al empezar L-01a): el «Grupo» del bloque, la carrera, se elige de Departamentos. Espacios solo agrega horario, aforo y cierres a las áreas, que se crean aquí.
- **Entregas** ([04](04_roadmap.md), C-01), antes de L-01a:
  - **C-01a:** datos, API, cifras por área y por departamento y el paso de las listas actuales;
  - **C-01b:** la sección Áreas y los formularios que solo eligen.

## Pendientes

| Tema | Pregunta | Se resuelve en |
|---|---|---|
| Fiscalizados | Sustancias, concentraciones, cupos, sitios, custodia, formato vigente del reporte y si las salidas reguladas requieren aprobación | REG-01 (F0) |
| Espacios del piloto | ¿Una o varias unidades operan el inventario? ¿La calificación abarca varias? ¿Necesita el titular una vista consolidada de sus espacios (informes o traslados entre ellos)? Hoy los espacios no comparten nada, aunque sean del mismo titular; abrirlo exige una decisión nueva | F0, con REG-01 |
| Soluciones preparadas | Submódulo de Reactivos, al final ([ADR 0017](#adr-0017)); el diseño ya está decidido (03 §4). Falta saber si el laboratorio almacena soluciones y si siguen siendo fiscalizadas | REG-01 |
| Materiales en prácticas | ¿La práctica representativa usa material que se entrega y se devuelve? Si es así, se adelanta un Materiales mínimo a F3. En Laboratorios los materiales son texto libre: ¿el cliente necesita saber cuántos hay (vasos, pipetas) al pedir y al aprobar? (15-11-2026) | P-04 |
| Equipos | ¿Qué campos de la ficha y qué documentos considera necesarios el cliente? ¿Qué valores de alimentación usa? ¿Quiere un aviso al pesar en Reactivos con una balanza de calibración vencida? ([ADR 0019](#adr-0019)) | F0, antes de E-01 |
| Registro paralelo | ¿El laboratorio conserva su registro actual durante el piloto? | F0 |
| Reglas de Laboratorios ([ADR 0023](#adr-0023)) | L-01e se programó con reglas por defecto («Cierre de Laboratorios», 05-11-2026). Falta confirmar: ¿quién declara lo utilizado al cerrar (el responsable o el docente)? ¿El químico abierto que sobra vuelve al frasco o se desecha? ¿La lista de chequeo debe estar completa para marcar «Lista»? ¿La columna «Código» de equipos se llena con los asignados o a mano? ¿Se entrega material que se devuelve? (Solicitantes, cancelación y materiales, 21-10-2026; responsable, fechas y aforo, 23-10-2026) | P-04, con el cliente |
| Revisión de Laboratorios (16-11-2026) | Al mover un bloque a otra área cambia su código, pero los reactivos apartados conservan el motivo y el destino de antes («Práctica P1-S10-BIO03 · Bioquímica»): ¿se deja como registro de cuándo se apartó o se actualiza al mover? «Recibidas» muestra hasta 500 solicitudes sin páginas: añadir páginas o filtro por periodo | El motivo, con el usuario; las páginas, antes de G2 |
| Inicio | Propuesta del 20-10-2026 en espera: el usuario tiene otras ideas. «Por atender» de todos los módulos (rojo antes que ámbar, con su enlace filtrado), tres tarjetas por fila con gráfico solo si hay datos (Equipos hoy dice siempre «Sin cambios»), «Por atender» primero en el móvil y avisos declarados por cada módulo en su `module.tsx` | Al terminar los módulos, con las ideas del usuario |
| Préstamos | Prestatarios externos, plazos, pérdidas y retrasos | Antes de F4 |
| Mantenimiento y analítica | Carácter obligatorio o recomendado, quién libera el equipo, destinatarios de alertas y fórmulas | Antes de F5 |
| Datos de Mantenimiento | ¿Qué datos del proveedor necesita el cliente (acreditación, identificación tributaria)? ¿Las tareas de la lista necesitan «No aplica» o una explicación cuando no se hacen? ¿Se identifica al técnico interno que hizo el trabajo? ¿Su sistema de calidad exige que una segunda persona revise las calibraciones? M-01a guarda nombre y contacto del proveedor, casillas simples y quién registró, y el registro es inmutable ([ADR 0020](#adr-0020)) | F0, con el cliente |
| Escaneo con cámara | Resuelto el 14-10-2026: «Escanear» en Reactivos abre la cámara en la app y lleva al frasco listo para «Salida». Usa el lector nativo del navegador o, si no lo hay, una librería. ¿Hace falta registrar salidas en serie? | P-03 |
| Retención y respaldos | Duración por repositorio y mecanismo de supresión anticipada | DP-01, antes de G1 |
| Libro sin filtros | La lista sin filtros (también la actividad del Resumen) entra por frascos y ordena todo el libro del espacio: unos 250 ms con 40 000 operaciones (medido en R-01C). ¿Índice o consulta distinta? | Antes de G1, con el escenario de carga (04 §4) |
| Inventario de más de 100 reactivos | La web carga solo la primera página del catálogo (100). El Inventario y sus filtros no muestran el resto. ¿Paginación, búsqueda en el servidor o ambas? | Antes de G1 |
| Lecturas de Reactivos sobre inventario | `reagents/infrastructure/products.sql` lee directamente `inventory.positions`, `lots` e `items` (12 uniones): las fronteras de código no lo detectan y un cambio de esas tablas rompería Reactivos. ¿Vista de lectura propia de la capacidad o consultas movidas a su interfaz? | Antes de G1, con el rendimiento |
| Índice por frasco | La ficha busca quién ingresó cada frasco recorriendo sus posiciones; no hay índice en `inventory.positions (workspace_id, container_id)`. Añadirlo si crece el número de posiciones | Antes de G1, con el escenario de carga |
| Conexión a PostgreSQL | ¿Conexión directa con el complemento IPv4 o Supavisor en modo sesión? | S-01 |
| Credencial local del rol de runtime | `supabase/seed.sql` fija una contraseña de desarrollo. Antes de usar ramas de Supabase o staging, pasarla a una variable de entorno local o desactivar el seed fuera de local y CI | S-01 |
| Conectividad | Cortes reales y procedimiento de continuidad | F0 |
| Modelo comercial | Recomendado: licencia anual por espacio y paquete + incorporación única + desarrollos a medida aparte ([01 §4](01_producto.md#4-paquetes)). Pendiente de confirmar por el usuario | Antes de cotizar |
| Precio | Tarifa por espacio con costos medidos, soporte y margen | Antes de cotizar; S-01 aporta los costos |
| Código de ReactiLab | Titularidad y licencia: el README dice MIT y los términos dicen software propietario | Antes de copiar componentes |
