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
- **Reparto por riesgo, no por capa.** Todo cambio que pueda alterar saldos, permisos, datos, concurrencia o el contrato de la API va a `platlab-implementer` (Opus 5.5 en `high`), esté en SQL, en el servidor o en la web, y ese agente escribe también sus pruebas (revisado el 14-10-2026: ver «Quién implementa»). Lo demás va a Sonnet 5.5 en `high`: `platlab-ui-implementer` (presentación, movimiento, avisos y e2e de UI) y `platlab-assistant` (docs, cambios mecánicos y pruebas sin lógica nueva).
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
  - `platlab-implementer` queda para entregas delicadas grandes (más de ~25 turnos o mucha lectura de SQL), partidas desde el inicio en producción y pruebas, con `effort` `medium` en limpiezas y `high` en lógica nueva o concurrencia.
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
  - *Resumen.* Equipos por condición y fallas abiertas. Acciones rápidas: registrar equipo, reportar incidente y escanear. Indicadores: días fuera de servicio, fallas por equipo en 12 meses y tiempo promedio de reparación.
  - *Inventario*, por áreas. Primer nivel: una tarjeta por área con su encargado, el número de equipos y cuántos están fuera de servicio o con restricción. El área es el primer nivel de ubicación debajo de la sede o el edificio: un equipo en «Cuarto frío > Mesón 2» cuenta en «Cuarto frío». La tarjeta aparece con el primer equipo y se oculta si el área queda vacía, sin perder su encargado. La sede solo se nombra si el espacio tiene más de una. Segundo nivel: un membrete con el área, su encargado y cifras por estado que filtran; los equipos agrupados por tipo («Microscopio óptico ×50» con su línea de estado, que abre sus unidades) o todos, en cuadros o en lista, con su lugar dentro del área. La barra superior nombra el área y el equipo para volver. La ficha lleva todos sus datos en el membrete y las pestañas Incidentes e Historial.
  - *Informe.* La tabla con foto, código, nombre, tipo, marca, modelo, serie, alimentación, ubicación, condición, disponibilidad y responsable, con el panel de filtros de Movimientos; exporta lo filtrado a PDF (vista imprimible) y a Excel, como Reactivos. La ven Administrador y Operador. Filtra también por responsable (con «sin responsable»), estado físico, garantía (vigente, por vencer en 90 días, vencida o sin dato) y vida útil (cumplida, vigente o sin dato). Lleva cinco indicadores que se recalculan con los filtros: equipos, valor de reposición (suma exacta), sin responsable, garantía por vencer y vida útil cumplida; cada uno, salvo el valor, aplica su filtro. No registra equipos: eso es del Inventario (17-10-2026).
  - *Incidentes*, que son las fallas, en tres pasos con color: reportado (rojo) → en reparación (ámbar) → solucionado (verde); «Marcar como solucionado» exige qué se hizo, puede devolver el equipo a operativo y es definitivo. Quien reporta elige el tipo y dice si el equipo se puede seguir usando; si no, pasa a fuera de servicio, ligado a la falla. Cada incidente guarda quién lo reportó, empezó la reparación y lo solucionó, y cuándo. Docente y Estudiante solo reportan y ven sus reportes: buscan el equipo por código o nombre sin ver el inventario completo.
- **Estado en cuatro dimensiones**, nunca en una sola lista:
  - Estado (en el código, condición), es decir, si se puede usar: operativo («funciona normalmente»), uso limitado («funciona, pero con una limitación»), fuera de servicio («no se puede usar») o dado de baja (03 §5); en pantalla, «Cambiar estado». Cambia con motivo; volver a operativo exige resultado y responsable.
  - Estado físico (en el código, conservación): bueno, regular o malo. Cambiarlo desde la ficha deja un hecho en el Historial, sin motivo (17-10-2026). Se anota en el alta, al editar la ficha o en un mantenimiento.
  - Tipo de falla: eléctrica, mecánica, requiere repuesto u otra. Vive en la falla, no en el equipo.
  - Disponibilidad: se calcula (disponible o no disponible; «prestado» con M6 y «en mantenimiento» con M7) y nadie la edita. «Reservado» llega con la agenda (F3).
- **Mantenimiento es un módulo propio (M7)**, como en la proforma: se vende aparte, requiere Equipos y se construye justo después de E-01 (M-01).
  - Lleva los planes preventivos y las calibraciones con su frecuencia y su próxima fecha automática; el registro de cada mantenimiento con quién lo hizo, resultado, costo, informe del proveedor (el certificado de calibración va dentro) y «válida hasta»; las órdenes correctivas a partir de una falla; y el aviso «Evaluar reemplazo» —un aviso, no una decisión— si la edad alcanza la vida útil, si los costos de 12 meses llegan al 50 % del valor de reposición o si hay tres fallas en 12 meses. Los importes son exactos (`numeric`). La curva de la bañera, el MTBF y Weibull quedan fuera: con las pocas fallas de un laboratorio no son confiables.
  - Sin M7, Equipos atiende y resuelve la falla con su resultado. Con los dos, la ficha suma la pestaña Mantenimiento, el Inventario la columna «Próximo mantenimiento» con su semáforo (al día, próximo, vencido), y cerrar una orden correctiva devuelve el equipo a operativo.
  - Su esquema `maintenance` apunta a los equipos sin escribir en `equipment`. Las órdenes asignadas a técnicos, el bloqueo de agenda y los repuestos siguen en F5.
- **Foto del equipo.** Una foto principal: al registrar o editar el equipo se elige un archivo o se toma con la cámara, y el navegador la reduce (WebP de 1600 px como máximo) antes de subirla. Se ve en la cabecera de la ficha y en miniatura en el Inventario. Es pública con las reglas de la ficha de seguridad ([ADR 0017](#adr-0017)): solo la API sube, JPEG, PNG o WebP comprobado por su contenido, con el límite de [02 §12](02_arquitectura.md#12-parámetros-iniciales); una foto nueva es un archivo nuevo y la anterior queda en el historial.
- **Lo que sigue en Equipos:** el QR por equipo, que el «Escanear» de Reactivos abre en la ficha con «Reportar incidente», y la hoja de vida (ficha, fallas y, con M7, mantenimientos) desde «Imprimir», como el PDF de Reactivos. Una falla dentro de la garantía avisa que se reclame al proveedor.
- **El préstamo va en Préstamos (M6)**, como en la proforma: un solo mostrador para material y equipos. Equipos se centra en qué hay, si funciona o falla y desde cuándo; con M6, muestra «Prestado».
- **Documentos.** La ficha suma proveedor, fecha de compra, garantía, vida útil y valor de reposición, y una sección Documentos (manual, factura, garantía, informes) con lo que el cliente considere necesario. Los archivos son PDF públicos con las reglas de la ficha de seguridad ([ADR 0017](#adr-0017)) y el límite general de archivos de [02 §12](02_arquitectura.md#12-parámetros-iniciales); el usuario acepta que quien reciba un enlace vea el documento, aunque tenga costos.
- **El uso de equipos queda fuera de Equipos.** Se define con Laboratorios y Prácticas (F3); la disponibilidad «en uso» llega entonces.
- **Se reutiliza lo común.** Las ubicaciones por niveles son las de Core, las mismas de Reactivos; crear una desde Equipos usa un permiso de Equipos. Un nombre no se repite entre ubicaciones del mismo nivel, sin distinguir tildes ni mayúsculas («Cuarto frío» y «cuarto frio» son la misma); «Mesón 2» puede existir en dos áreas.
- **Encargado del área.** Uno por área, guardado en la ubicación de Core para que Reactivos use el mismo dato; es un miembro del espacio. Lo asigna el Administrador desde la tarjeta, con auditoría. Al registrar un equipo en un área con encargado, el responsable del equipo se propone con él y se puede cambiar. Las fallas viven en la capacidad `incidents`, con rutas y permisos de Equipos. La estructura por caso de uso es la del [ADR 0018](#adr-0018).

Motivo: el usuario quiere Equipos con la forma de Reactivos. Separar el estado conserva el porqué de cada falla y evita editar la disponibilidad a mano; así lo hacen herramientas como MaintainX y Snipe-IT, y la ISO/IEC 17025 (6.4.13) pide la hoja de vida por equipo. Mantenimiento queda como módulo propio porque la proforma lo vende aparte y el usuario lo confirma. Cambia M3 y M7 en 01 §3, 03 §5, E-01 y M-01 del roadmap y la excepción de Storage de 02.

Cambios: 15-10-2026 (Mantenimiento vuelve a M7, construido después de E-01; foto del equipo; el préstamo pasa a M6). 16-10-2026, pedido del usuario: el Inventario pasa a ser por áreas con encargado; la tabla se llama Informe y exporta; Reportes se llama Incidentes; nombres de ubicación únicos en el mismo nivel sin tildes ni mayúsculas. Ese mismo día, tras revisar las pantallas: «Con restricción» pasa a «Uso limitado», «Condición» a «Estado» y «Conservación» a «Estado físico»; los incidentes quedan en tres pasos, sin «Cerrar»; el área se ve agrupada por tipo; la ficha sin la pestaña Información; y el alta cabe sin desplazarse en escritorio, con «Compra y garantía» plegado.

**Implementación de E-01 (15-10-2026; reordenada el 16-10-2026).** Una rama por entrega: E-01a (tipos, ficha con foto, condición, traslados e historial), E-01b (fallas), E-01c (Inventario por áreas con encargado, Informe con exportación e Incidentes), E-01d (QR por equipo y escanear para reportar un incidente; adelantada el 17-10-2026), E-01e (documentos y aviso de garantía) y E-01f (Resumen completo y hoja de vida); después, M-01 Mantenimiento. El vínculo de un incidente con la actividad en que ocurrió (docente, estudiantes, horario) llega con Laboratorios y Prácticas (F3), como dice 01 §6.3; no se adelanta con texto libre. E-01a deja en común lo que ya compartían los módulos: comandos y consultas de módulo y ubicaciones activas en Core, cursor y edición parcial en `platform/`, contratos comunes en `contracts/src/common.ts` y el arnés HTTP de pruebas en `testing/api.ts`. Los datos de demo de Equipos entran con su primera pantalla.

**Pantallas de E-01a (15-10-2026, `impeccable shape` aprobado).** Inventario en tabla con el panel de filtros de Movimientos (Condición, Tipo y Ubicación; en el móvil, cada fila es una tarjeta); Resumen con cuatro cifras por condición, la banda «Registrar equipo» y la lista «Requieren atención»; ficha como la del reactivo, con Información e Historial; hojas «Registrar equipo», «Cambiar condición» (dar de baja aparte, con confirmación) y «Trasladar equipo». Color de Equipos: el azul de referencia del usuario, de `#1967D2` a `#2370E4`, oscurecido lo justo para AA con texto blanco. La demo habilita Equipos solo en A; C sigue sin módulos.

**Pantallas de E-01c (16-10-2026, `impeccable shape` aprobado).** Inventario: tarjetas de área en orden alfabético (nombre, sede, número de equipos, línea de estado con su color y texto, encargado con «Asignar» o editar solo para el Administrador) y un buscador de equipos en todas las áreas; dentro del área, migas, encargado, buscador, pastillas de condición y cuadros con foto por omisión o lista (la elección se recuerda); los dados de baja no cuentan y se ven solo con su pastilla; «Registrar equipo» desde un área la deja puesta. Informe: la tabla actual con «Exportar», solo del Administrador (permiso `equipment.report.read`, como `reagents.report.read`): «Imprimir» (hasta 1.000 equipos, con aviso) y Excel con todas las columnas de la ficha, encabezado con espacio, fecha, filtros y autor, y auditoría. El Excel lo escribe un escritor propio sobre `yazl`, por partes, que también usará Reactivos.

**QR por equipo, E-01d (17-10-2026, decidido con el usuario).** Cada equipo tiene un QR con su enlace corto (`/q/e/…`: espacio y equipo, como el del frasco, cuyo QR no cambia). La etiqueta usa la hoja de Reactivos (3 × 8, 63,5 × 33,9 mm) y lleva código, nombre, serie y «Escanea para reportar una falla». Se imprime una desde la ficha o varias desde el área con «Etiquetas QR», eligiendo los equipos. Al abrir el QR, el Administrador y el Operador llegan a la ficha; Docente y Estudiante, a «Reportar incidente» con el equipo elegido. Un solo escáner en la app reconoce frascos y equipos, y «Reportar incidente» suma «Escanear» junto al buscador. Un equipo dado de baja no se reporta: el QR lo dice.
  - Ajustes tras revisar las pantallas (17-10-2026, pedido del usuario):
    - «Etiquetas QR» del área gira las tarjetas visibles hacia su etiqueta, como Reactivos, respetando estado, búsqueda y tipo. Por tipo, la tarjeta del tipo gira y elige todas sus unidades. La barra inferior imprime las elegidas, y la página de etiquetas queda como vista de impresión.
    - Un botón circular (←), fuera del membrete y a su izquierda, vuelve un nivel en el área, el tipo y la ficha. El tipo abierto va en la URL. Va en el margen, sin quitarle ancho al membrete; donde el margen no alcanza, encima de él.
    - «Escanear» va en el Inventario y en el Resumen.
    - El Resumen pierde el aviso de pendientes y «Requieren atención»: un equipo puede tener uso limitado sin incidente, y las cifras ya llevan al Informe.
    - En el Informe, las pastillas de filtros se ven solo con el panel cerrado o en el móvil (también en Movimientos de Reactivos), y el valor de reposición dice cuántos equipos lo tienen.
    - Se adelanta a la entrega siguiente el Resumen con «Estado por área» e «Incidentes en 12 meses» (reportados y solucionados por mes, tiempo promedio de reparación y días fuera de servicio), junto con Incidentes en lista con pestañas por paso y su conteo. La hoja de vida sigue en E-01f.

**Resumen e Incidentes (17-10-2026, `impeccable shape` aprobado).**
- *Resumen* (Administrador y Operador): bajo las cuatro cifras, dos columnas como en Reactivos. A la izquierda, la banda de acción rápida y «Incidentes en 12 meses»; a la derecha, «Estado por área».
  - *Incidentes en 12 meses*: los 12 meses de calendario hasta el actual, en la zona del espacio. Reportados y solucionados por mes van en dos líneas con un punto por mes, leyenda y nombre al final de cada línea; no son barras, para no repetir el gráfico de Reactivos. Es la excepción a «Serie única» de `DESIGN.md`: la comparación de las dos series es el dato.
  - Arriba, «N reportados · M solucionados». Dos cifras: reparación promedio (de reportado a solucionado, de los solucionados en el período; en horas si no llega a un día) y días fuera de servicio, la suma de los días de todos los equipos con cuántos fueron («31 días · en 4 equipos»); cuenta el tramo en curso y el anterior a una baja.
  - *Estado por área*: cada área con su línea de estado en texto y color, primero las que tienen más fuera de servicio y luego más de uso limitado; hasta seis, con «Ver las N áreas» hacia el Inventario. Cada fila abre su área.
- *Incidentes*: pestañas Reportados, En reparación y Solucionados con su conteo; se abre en Reportados y la pestaña va en la URL. Docente y Estudiante ven las mismas pestañas con lo suyo. Las filas van en una tarjeta, sin la línea de tres pasos: foto, código y nombre, lugar, tipo, «No se puede usar» y la hora de su paso («Reportado hace 2 h», «En reparación desde hace 1 día», «Solucionado en 3 días»).

**Latencia (15-10-2026).** Lo que más pesa son los viajes a la base, no las consultas. Core lee los permisos una vez por transacción; un alta valida tipo, ubicación y responsable en una consulta y resuelve el código y el nombre únicos con su índice (`ON CONFLICT`); cambiar la condición o trasladar escribe historial y equipo en una sentencia. El inventario pagina primero por `assets_code` (también su cursor) y arma niveles y responsable solo para la página; busca en `search_text`, plegado al escribir; el Resumen cuenta desde `assets_condition`. Con 5.000 equipos, la página tarda 0,07 ms y la búsqueda 1,5 ms; un índice de trigramas (`pg_trgm`) se añade solo si un espacio supera unos 50.000 equipos.

## Pendientes

| Tema | Pregunta | Se resuelve en |
|---|---|---|
| Fiscalizados | Sustancias, concentraciones, cupos, sitios, custodia, formato vigente del reporte y si las salidas reguladas requieren aprobación | REG-01 (F0) |
| Espacios del piloto | ¿Una o varias unidades operan el inventario? ¿La calificación abarca varias? ¿Necesita el titular una vista consolidada de sus espacios (informes o traslados entre ellos)? Hoy los espacios no comparten nada, aunque sean del mismo titular; abrirlo exige una decisión nueva | F0, con REG-01 |
| Soluciones preparadas | Submódulo de Reactivos, al final ([ADR 0017](#adr-0017)); el diseño ya está decidido (03 §4). Falta saber si el laboratorio almacena soluciones y si siguen siendo fiscalizadas | REG-01 |
| Materiales en prácticas | ¿La práctica representativa usa material que se entrega y se devuelve? Si es así, se adelanta un Materiales mínimo a F3 | P-04 |
| Equipos | ¿Qué campos de la ficha y qué documentos considera necesarios el cliente? ¿Qué valores de alimentación usa? ¿Quiere un aviso al pesar en Reactivos con una balanza de calibración vencida? ([ADR 0019](#adr-0019)) | F0, antes de E-01 |
| Registro paralelo | ¿El laboratorio conserva su registro actual durante el piloto? | F0 |
| Reglas de Prácticas | Anticipación, cancelaciones, salas exclusivas, devoluciones químicas y quién declara el consumo al cerrar | P-04, antes de F3 |
| Préstamos | Prestatarios externos, plazos, pérdidas y retrasos | Antes de F4 |
| Mantenimiento y analítica | Carácter obligatorio o recomendado, quién libera el equipo, destinatarios de alertas y fórmulas | Antes de F5 |
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
