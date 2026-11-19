# 05 — Decisiones y pendientes

Revisión: 16 de noviembre de 2026. Registro resumido de decisiones de arquitectura (ADR); cada ADR dice solo lo vigente. Una decisión aceptada solo se reemplaza con otra que indique qué cambia. El texto completo anterior de los ADR 0001–0007 está en el commit `bc26fa8`.

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
| [0013](#adr-0013) | La sesión principal implementa todo; puertas del harness | Aceptado el 07-10-2026; sin subagentes desde el 14-11-2026 |
| [0014](#adr-0014) | Reactivos completo: cinco secciones, Movimientos como informe y avisos comunes | Aceptado el 12-10-2026 |
| [0015](#adr-0015) | Ingreso en un paso, control por peso y controlados | Aceptado el 12-10-2026 |
| [0016](#adr-0016) | Controlados al final y orden para completar Reactivos | Aceptado el 14-10-2026 |
| [0017](#adr-0017) | Ficha de seguridad pública, exportación por streaming y T-07 aplazado | Aceptado el 14-10-2026 |
| [0018](#adr-0018) | Reactivos concluido para el piloto; sigue Equipos | Aceptado el 15-10-2026 |
| [0019](#adr-0019) | Equipos con la forma de Reactivos: estado separado y Mantenimiento como módulo propio | Aceptado el 15-10-2026 |
| [0020](#adr-0020) | Mantenimiento intermedio sin inventario propio | Aceptado el 17-10-2026 |
| [0021](#adr-0021) | Rediseño de la UI por módulos, empezando por Mantenimiento | Aceptado el 19-10-2026 |
| [0022](#adr-0022) | Calidad de Equipos y Mantenimiento: piezas comunes sin duplicar | Aceptado el 20-10-2026 |
| [0023](#adr-0023) | Laboratorios: solicitudes y cronograma en un solo módulo | Aceptado el 20-10-2026; cerrado para el piloto el 16-11-2026 |
| [0024](#adr-0024) | Áreas y departamentos en una sección propia | Aceptado el 20-10-2026 |
| [0025](#adr-0025) | Materiales y Préstamos: consumibles, reutilizables y vale de préstamo | Aceptado el 18-11-2026 |
| [0026](#adr-0026) | Inicio con Actividad, Calendario y Por atender | Aceptado el 19-11-2026 |

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

- **Dirección.** Precisión operativa con calma: las pautas de Apple (HIG) en una aplicación de trabajo, con el lenguaje visual de ReactiLab. Solo se toma su diseño; su código no se copia mientras la licencia esté por aclarar. Parte de 01 «Dirección visual» y de 02 §2.
- **Tokens** semánticos en `packages/ui`. Solo tema claro, preparado para el oscuro. Inter con `tabular-nums` en cantidades y saldos; neutros en escala pizarra con contraste AA.
- **Componentes:** shadcn como código propio sobre Radix, Sonner para avisos y cmdk para la salida rápida. TanStack Table vuelve cuando una pantalla necesite una tabla de verdad.
- **Estructura (ReactiLab).** Barra lateral y barra superior pegadas al borde, sin flotar; tarjetas de borde fino con sombra mínima; indicadores con icono y la actividad como línea de tiempo.
- **Voz única.** Solo el acento invita a actuar. Excepción: la cantidad con signo de un movimiento va en rojo suave (salida) o verde suave (ingreso), siempre con el signo y el tipo escritos.
- **Color por módulo.**
  - Cada módulo tiene un acento que, dentro de su app, reemplaza al azul en lo que invita a actuar, el foco, los gráficos y el icono.
  - Lo aplica un juego de tokens por módulo (`[data-module]`), y los componentes no cambian.
  - Inicio y plataforma siguen en azul PlatLab, y la marca nunca cambia. Reactivos es índigo (`#4F46E5`).
  - Cada color pasa WCAG AA. Verde, ámbar y rojo son de estado: ningún módulo los usa como propio.
- **Iconos con dato.** El icono de una tarjeta de catálogo sale de un dato que ya existe, como el estado físico, y nunca decora (`IconChip`, común a todos los módulos).
- **Ventanas como ReactiLab (13-10-2026).**
  - Ingreso, salida y ajuste son ventanas centradas, no hojas laterales.
  - Son de vidrio esmerilado (con fondo sólido donde no hay soporte), con bandas separadas por líneas y un botón principal alto con icono.
  - La barra de stock por nivel, las pastillas, las bandas y el cuadro de icono son piezas compartidas.
- **Densidad.** Dentro de un módulo, la base baja de 16 a 15 px (en porcentaje, para respetar la letra del navegador). Inicio y acceso no cambian.
- **Movimiento.**
  - Pulsación de 100 a 150 ms con CSS; superposiciones de 150 a 200 ms que nacen de su origen.
  - Spring sin rebote para hojas y fichas.
  - Se respeta `prefers-reduced-motion`.
  - Nunca se animan filas, escritura ni bucles.
- **Descartado:** imágenes 3D, gráficos sin dato y métricas inventadas.
- **Dominio por encima del estilo.** Sin UI optimista sobre existencias ni «deshacer» en un movimiento confirmado: se corrige con otro movimiento. Estados con texto y una acción primaria por pantalla.
- **Verificación:** Playwright con axe (WCAG 2.2 AA) en CI. El cierre de UI está en el [ADR 0013](#adr-0013).

Motivo: una app que se usa todo el día necesita jerarquía clara, estados honestos y movimiento que explique, no que decore.

Cambios: 02, 04, 05 y 13-10-2026; compactado el 16-11-2026 (historial en git).

<a id="adr-0011"></a>
## ADR 0011 — Inicio como tablero y cada módulo como app

- **Inicio.** Un tablero con una tarjeta por módulo habilitado y visible para el rol, con dos o tres cifras y un gráfico pequeño solo si hay datos reales (sin ellos, un texto). Toda la tarjeta abre el módulo, así que sus cifras no son enlaces aparte.
- **Entrada directa.** Sin pantalla para elegir espacio: se abre el último usado en ese navegador (la primera vez, el primero de la lista). Todos los roles entran igual; cambia lo que cada uno puede hacer.
- **Módulo como app.**
  - El menú lateral muestra solo sus secciones; el manifiesto las declara con su permiso ([02 §4](02_arquitectura.md#4-contrato-de-módulo)) y `/me` envía solo las permitidas.
  - El Resumen reúne cifras, gráfico y actividad reciente, y cada cifra abre la lista que explica.
  - La barra superior dice dónde se está (módulo › sección), no el espacio ni la persona.
  - Es una sola aplicación, con la misma sesión, admisión y diseño, y cada módulo se descarga al abrirlo ([02 §8](02_arquitectura.md#8-frontend)).
- **El espacio es quien contrata**, una facultad o un instituto, no un laboratorio ([01 §2](01_producto.md#2-clientes-espacios-y-aislamiento)). Los laboratorios viven dentro, como áreas y espacios de Laboratorios.
- **La tarjeta de la persona es el selector de espacio:** dice quién es, en qué espacio y con qué rol. En el móvil, un botón con las iniciales abre el mismo menú, con «Salir».
- **Rol real en lugar de «Miembro» (05-10-2026).** `/me` envía los nombres de los roles vigentes solo para mostrarlos; no autorizan nada.
- **Institución (05-10-2026).** Se muestra solo si los espacios de la persona son de instituciones distintas. Vive en `core.workspaces.institution_name`, que fija el Equipo PlatLab; el runtime no lee `platform.customer_accounts`, y el nombre jurídico no se muestra.
- **Lo transversal queda fuera de los módulos:**
  - los pendientes y las aprobaciones, en el Inicio;
  - la búsqueda y los avisos, en la barra;
  - los miembros y la suscripción, en Administración;
  - las áreas y las ubicaciones, en Áreas ([ADR 0024](#adr-0024)).

  Los flujos entre módulos son enlaces, y cada operación la ejecuta el módulo dueño del recurso ([ADR 0009](#adr-0009)).
- **Gráficos.** Cuentan sucesos y nunca suman cantidades de unidades distintas. Usan la zona horaria del espacio y el ámbito del miembro, y llevan un resumen en texto.

Motivo: los módulos se contratan por separado y cada uno se entiende como una herramienta propia; el Inicio da la vista de conjunto sin mezclar las operaciones. Reemplaza el menú común y las pestañas del tablero de 01 §7, y la regla de «no hay gráficos»; sigue la prohibición de gráficos sin datos reales ([ADR 0010](#adr-0010)).

Cambios: 02 y 05-10-2026; compactado el 16-11-2026 (historial en git).

<a id="adr-0012"></a>
## ADR 0012 — Reactivos por frasco y salidas con aprobación

ReactiLab es la referencia de UX; los patrones visuales están en `DESIGN.md`.

- **Por frasco.** Cada ingreso registra uno o más frascos de un mismo lote, cada uno con código propio, cantidad inicial y QR. La posición es frasco más ubicación, y salidas, ajustes y traslados operan sobre un frasco. La apertura y la caducidad tras abrir llegan si el laboratorio las pide.
- **Lote sin estado.** Es solo un dato (código, marca y caducidad, [ADR 0015](#adr-0015)), sin cuarentena, bloqueo ni descarte.
  - Un frasco vencido, contaminado o roto se desecha con «Ajustar» a cero y un motivo de la lista, y queda como ajuste con su responsable. No existe un movimiento «baja».
  - La disposición por posición sigue en el diseño para custodia y retornos ([03 §4](03_datos.md#4-inventario-y-reactivos)).
- **Dos niveles.** El inventario lista reactivos con su total y sus avisos; la ficha muestra el encabezado (Existencia, Mínimo y Caducidad), los frascos y el historial. Cada frasco tiene Salida, Trasladar y Ajustar; no hay «borrar». Lo que PlatLab no modela no se muestra.
- **Salidas del Operador con aprobación.**
  - La solicitud aparta la cantidad del frasco con una reserva `held`: nadie más dispone de ella.
  - El Administrador o el Propietario la aprueba (la salida se confirma y la reserva pasa a `fulfilled`) o la rechaza con motivo (`released`).
  - Sus propias salidas son directas, y nadie aprueba su propia solicitud. Los ingresos son directos.
- **Salida.** Propone el frasco utilizable que vence antes (FEFO), nunca el de menor cantidad, con atajos de 25 %, 50 % y todo el frasco y lo que quedará. De un frasco vencido se puede sacar con advertencia, y el movimiento guarda la caducidad que tenía.
- **Motivos y destinos.** Listas del espacio que administra el Administrador; se archivan, nunca se borran. La operación guarda el texto elegido, así que cambiar la lista no altera la historia. Desde el [ADR 0024](#adr-0024), el destino es un departamento.
- **Vencido y por vencer (05-10-2026).** Vencido: la caducidad del lote es anterior a hoy, en la zona del espacio. Por vencer: caduca en los próximos 30 días ([02 §12](02_arquitectura.md#12-parámetros-iniciales)). Solo cuentan los frascos con saldo en las ubicaciones que el miembro puede consultar.
- **Mínimo (05-10-2026).** Opcional, uno por reactivo para todo el espacio y en su unidad base; lo fija el Administrador (`reagents.catalog.manage`). Bajo mínimo: la existencia física (los frascos con saldo, con los vencidos y lo apartado) es menor que el mínimo; sin existencias y con mínimo, también.
- **Resumen.** Por aprobar (o Mis solicitudes), Vencidos, Por vencer y Bajo mínimo; cada cifra abre la lista que la explica.
- **Movimientos.** Un libro por días en la zona del espacio, con la cantidad con signo y el saldo. Sin totales calculados en el navegador, porque la lista llega por páginas, y sin editar, borrar ni «deshacer»: un error se corrige con un ajuste. El informe con filtros y totales del servidor está en el [ADR 0014](#adr-0014).
- **Traslado en un paso.** Mueve un frasco entero, con todo su saldo, a otra ubicación: una operación `transfer` con dos asientos, visible como «Traslado», sin borrador, aprobación ni tránsito. Lo registran el Operador y el Administrador (`reagents.transfer.create`). Un frasco vacío o con salidas pendientes no se traslada.
- **Conteo por ubicación.** El Administrador anota lo que hay en cada frasco y confirma: un ajuste con motivo «Conteo» y un asiento por cada frasco que no cuadra. Si un saldo cambió mientras se contaba, se vuelve a cargar; si lo contado queda por debajo de lo apartado, primero se resuelven las solicitudes.
- **Etiqueta con QR por frasco.** Lleva código, reactivo, lote y caducidad, y se imprime a 3 × 8 por hoja A4.
  - Cada QR es un enlace corto (`/q/`), único del espacio y del frasco, que no sirve en otro espacio.
  - Tras iniciar sesión, abre la salida con ese frasco elegido (para el Operador, «Solicitar salida»). Si no se puede descargar (vacío, todo apartado o sin permiso), la ficha resalta el frasco y dice por qué.
- **Entregas de R-01A**, antes de T-07:
  - entrega 1: dos niveles, ingreso por frascos y salida con FEFO, motivos y destinos;
  - entrega 2: salidas del Operador con aprobación;
  - entrega 3: mínimos;
  - entrega 4: traslado, conteo y QR.

  R-01B (ficha de seguridad, avisos y exportación) va después ([roadmap](04_roadmap.md)).

Motivo: el laboratorio ya trabaja por frasco con ReactiLab; el QR, el % restante y el control de las salidas son parte de su práctica. Se construye en la capacidad inventario para que Materiales lo herede.

No se copia de ReactiLab: frasco, lote y código fusionados; ajustes sin signo; el borrado como baja; el saldo recortado a cero en silencio; la sugerencia por menor cantidad.

Cambios: 05, 06 y 12-10-2026; compactado el 16-11-2026 (el detalle de pantallas, en git).

<a id="adr-0013"></a>
## ADR 0013 — La sesión principal implementa todo; puertas del harness

La regla de trabajo vigente está en `.claude/orquestacion.md`; aquí quedan la decisión y su porqué.

- **Sin subagentes** (14-11-2026, pedido del usuario; el 16-11-2026 se quitaron los agentes definidos, sus hooks y el script de tokens). La sesión principal analiza, decide con el usuario, implementa con sus pruebas, confirma y sube. Trabaja en `high`, y en `xhigh` solo para diseñar o decidir. Una entrega grande se parte en base y API, lógica web y pantallas.
- **Lo delicado se prueba siempre:** lo que pueda alterar saldos, permisos, datos, concurrencia o el contrato de la API, esté en SQL, en el servidor o en la web, va con sus pruebas y `platlab-db-review`.
- **Puertas automáticas** (`.claude/hooks/`): `read-guard.sh` rechaza leer sin rango un archivo de más de 300 líneas; en local se bloquean las escrituras remotas por MCP, `supabase link`, `db push` y `git push --force`. La barrera real es la regla de GitHub que protege `main`.
- **Etapas de una entrega (14-10-2026).**
  - *Cambios*, por defecto: se escriben o ajustan las pruebas sin correrlas, y el usuario revisa en el navegador.
  - *Cierre*, cuando el usuario aprueba (`.git/claude-fase`): pruebas dirigidas, `pnpm check`, capturas con la revisión de acabado y CI.
  - Base y API se cierran siempre con las pruebas de su módulo (21-10-2026).
- **Cierre de UI.**
  - Por entrega: capturas de escritorio y móvil, `review-animations` si cambió el movimiento y la revisión de acabado de impeccable, en línea.
  - Por puerta (G0, G1…): `impeccable audit`, `harden` y `polish` sobre todo el frontend, más `review-animations`.
- **Evidencia:** una fila por entrega, cuando terminó el CI del mismo commit.
- **Economía de tokens.** Lo caro es el contexto, que crece y se relee en cada turno. Por eso: codebase-memory primero, lectura por partes, salidas cortas y sin monitores de tokens. Pendiente del usuario: deshabilitar los MCP y las skills de la cuenta ajenos a PlatLab.

Motivo: el riesgo depende de lo que un cambio puede romper, no de la capa; las pruebas de invariantes son la especificación, y una regla que depende del prompt se vuelve una puerta automática. Las etapas evitan repetir pruebas y capturas sobre cambios que el usuario aún va a ajustar. Sin subagentes porque el usuario prefiere que todo lo haga la sesión principal y los agentes ya no se usaban: sus puertas protegían un reparto que dejó de existir.

Cambios: 07, 13, 14, 21 y 28-10-2026; 14 y 16-11-2026 (sin subagentes); compactado el 16-11-2026 (el reparto con agentes Sonnet y sus puertas, en git).

<a id="adr-0014"></a>

## ADR 0014 — Reactivos completo: cinco secciones, Movimientos como informe y avisos comunes

- **Cinco secciones:** Resumen, Inventario, Movimientos, Solicitudes y Fiscalizados (se llamará «Controlados», [ADR 0015](#adr-0015)). No hay Informes, Documentos ni Configuración:
  - los informes son Movimientos e Inventario filtrados;
  - cada documento vive donde se usa. La ficha de seguridad va en la ficha del reactivo y en la salida, y el Inventario filtra «Sin SDS». Las autorizaciones van en Fiscalizados, y el ingreso no registra factura ni guía (14-10-2026);
  - motivos y destinos se añaden y se archivan desde la misma lista donde se eligen ([ADR 0012](#adr-0012)).
- **Movimientos como informe (R-01C).** Lo que se filtra es lo que se exporta, y los filtros van en la URL: un informe es un enlace.
  - *Filtros:* periodo, tipo, reactivo, responsable, destino, motivo y ubicación, cada uno con varios valores. El responsable es quien pidió la salida si hubo solicitud y, si no, quien la registró: responde «¿qué consumió Ana?».
  - *Conteo por opción:* cada opción dice cuántos movimientos tiene con los demás filtros aplicados, y solo aparecen las que tienen resultados. Lo calcula el servidor, y dentro de un grupo no cuenta lo marcado en ese grupo.
  - *Dos vistas:* Detalle (el libro por días) y Totales por reactivo, responsable, destino o mes. Los totales los calcula el servidor separados por reactivo y unidad: nunca suman unidades distintas. Los traslados se cuentan, pero no suman cantidad.
  - *Imprimir y exportar:* «Imprimir» saca lo filtrado (hasta 1.000 filas, con aviso si hay más) con el espacio, el periodo y los filtros. El Excel llega con R-01B ([ADR 0017](#adr-0017)), con el mismo encabezado y en la auditoría. El Inventario exporta igual su vista filtrada.
  - *Quién ve qué:* el Detalle y los filtros, todos los que ven Movimientos. Totales y exportación son «reportes» ([01 §5](01_producto.md#5-actores-y-roles)): permiso `reagents.report.read`, del Administrador, que el Propietario hereda.
- **Fiscalizados** (REG-02, tras REG-01). Solo para el Responsable de fiscalizados y el Administrador: el perfil de cada sustancia, la autorización con sitios y cupos (con un aviso al acercarse al cupo), la custodia y el retorno, y el reporte del periodo (borrador, revisión y exportación; se sube a SISALEM a mano). Se reduce a lo que confirme REG-01 ([ADR 0016](#adr-0016)).
- **Avisos comunes en Core.** Un solo sistema para todos los módulos: cada uno declara sus tipos de aviso en su manifiesto, y la campana y las preferencias son comunes. Las preferencias son por persona, en «Mis avisos» (por módulo, por correo o en la app, con valores por defecto según el rol), y cada correo trae un enlace para darse de baja. Hasta T-07, los avisos van solo en la app ([ADR 0017](#adr-0017)).
- **Preparación de soluciones:** mejora posterior a completar Reactivos; su diseño en [03 §4](03_datos.md#4-inventario-y-reactivos) se conserva.
- **Orden:** «Reactivos se completa antes de abrir otro módulo»; lo reemplazó el [ADR 0018](#adr-0018).

Motivo: menos secciones hacen la app más simple. El laboratorio piensa un informe como un filtro de Excel sobre el libro, y documentos y avisos son transversales: se resuelven donde ocurren o una sola vez para todos los módulos. Reemplaza las secciones Informes, Documentos y Configuración del boceto de [01 §7](01_producto.md#7-cómo-se-ve-la-plataforma).

Cambios: 12, 13 y 14-10-2026; compactado el 16-11-2026 (la forma del panel de filtros, en git).

<a id="adr-0015"></a>

## ADR 0015 — Ingreso en un paso, control por peso y controlados

- **Una ventana «Ingresar reactivo»** reemplaza las dos de antes (catálogo e ingreso). Desde el ajuste del 13-10-2026 se llama «Nuevo reactivo» y, desde la ficha, «Ingresar frascos». Va en el orden en que se lee el frasco:
  - datos de la etiqueta: nombre (busca en el catálogo o crea, en el mismo campo), CAS (obligatorio salvo en mezclas), marca, código, cantidad con su unidad, número de frascos y caducidad;
  - «Dónde se guarda», «Control por peso» (opcional) y «Clasificación y seguridad».

  Con un reactivo existente, sus datos de catálogo se rellenan y no se editan ahí. Crear uno desde el ingreso exige el permiso de catálogo; el Operador elige del catálogo.
- **Reactivo (catálogo):**
  - estado físico (sólido, líquido, acuoso, mezcla o gas) y los 9 pictogramas SGA;
  - **controlado**, que marca el Administrador, nunca el sistema por el CAS;
  - ficha de seguridad (digital, solo en físico o no tiene) y densidad (g/mL);
  - unidad (g, kg, mL o L), que no cambia tras el primer movimiento;
  - código automático a partir del nombre (`ACETONA`, `ACIDO-CLORHIDRICO-37`).

  El mínimo se fija en la ficha, no en el ingreso. Editar la ficha es del Administrador y el Propietario.
- **Códigos:**
  - *Frasco:* propio y único en el espacio. El servidor sugiere la serie libre a partir del nombre (`ACE-001`) o de la del reactivo (`AC-BIO-001` → `AC-BIO-002`), acepta la editada y rechaza una repetida. Varios frascos se numeran en serie, y los existentes conservan su código («lote-NN») y su QR.
  - *Lote:* interno y automático por reactivo (`L-001`). Guarda la marca (antes «proveedor») y la caducidad, sin el lote del fabricante.
- **Dónde se guarda:** la ubicación por niveles (laboratorio o bodega › estante › nivel) y el departamento. Desde el [ADR 0024](#adr-0024), el formulario solo elige: las ubicaciones se crean en Áreas, y el departamento reemplaza a la lista «área o departamento».
- **Control por peso:**
  - *Tara* = peso bruto del frasco lleno − cantidad × densidad (en masa, − cantidad). *Fijar tara* (quien ajusta) = peso en balanza − saldo × densidad; reemplaza la anterior y queda en la auditoría.
  - Cada frasco guarda la tara y la densidad con que se calculó. La del reactivo solo se sugiere, y corregir la ficha no cambia los frascos ya pesados.
  - Tara, ajuste por peso y fijar tara se calculan en SQL (`numeric`); el navegador solo los anticipa. Un peso menor que la tara se rechaza. El ajuste por peso lleva el motivo «Pesada» y el saldo redondeado a centésimas.
  - **Ajuste del mismo día (14-10-2026):** «Ajustar» vive en la ficha ⚖ de cada frasco y abre una sola ventana; el frasco decide el método.
    - Con tara, «Debe pesar N g», con «Corregir con la balanza» y «Escribir la cantidad».
    - Sin tara, «Sin pesar», con «Pesar ahora para activar la balanza» y «Escribir la cantidad».
    - El Operador solo la ve con tara, como información.
- **Controlado:** candado en el inventario y «🔒 Controlado» en la ficha, el filtro «Controlados» y un aviso en la salida. Reemplaza «Fiscalizado» en la interfaz; la sección de REG-02 se llamará «Controlados» ([ADR 0014](#adr-0014)).
- **Conteo:** sale de la interfaz y se conserva en el servidor para conciliar el inventario de G1.

Motivo: quien registra tiene el frasco en la mano y llena lo que lee, de arriba abajo; separar el catálogo y el ingreso en dos ventanas lo hacía lento. La tara permite comprobar con la balanza lo que dice el sistema. «Controlado» se entiende igual en universidades, empresas y uso individual. Cambia el [ADR 0012](#adr-0012) (tara, densidad, código de frasco y ventanas de registro) y el término del [ADR 0014](#adr-0014).

Cambios: 12, 13 y 14-10-2026; compactado el 16-11-2026 (la disposición de la ventana y de la tarjeta del frasco, en git).

<a id="adr-0016"></a>

## ADR 0016 — Controlados al final y orden para completar Reactivos

- **Controlados (REG-02) va al final y se reduce a lo que confirme REG-01.** En el piloto, el reporte sale de Movimientos e Inventario filtrados por «Controlado» y exportados a PDF o Excel. Cupos, custodia y reporte en formato oficial se hacen solo si REG-01 los exige.
- **Orden para completar Reactivos** (14-10-2026; lo reemplazan el [ADR 0017](#adr-0017) y el [ADR 0018](#adr-0018)):
  - mejoras pequeñas: la ficha de seguridad en la hoja de salida, adonde lleva el escaneo; la ruta de la ubicación en el historial; y el código automático sin palabras vacías. «Factura o guía» se descarta;
  - ámbito por ubicación, solo como limpieza de permisos (ADR 0008, «Sin ámbito técnico»). La vista por laboratorio es del módulo Laboratorios;
  - después, T-07, R-01B, la preparación de soluciones, lo previo a G1 y REG-01 con REG-02 reducido.

Motivo: el usuario prioriza un módulo completo y usable. El reporte exportable cubre la obligación periódica mientras REG-01 confirma con el laboratorio y la norma qué más hace falta. Cambia la barrera de `CLAUDE.md` y el orden del [ADR 0014](#adr-0014).

Cambios: 14-10-2026; compactado el 16-11-2026.

<a id="adr-0017"></a>

## ADR 0017 — Ficha de seguridad pública, exportación por streaming y T-07 aplazado

- **Ficha de seguridad: enlace o PDF.** El Administrador pega el enlace del fabricante o sube el PDF. La ficha es informativa, no sensible, así que el PDF va a un bucket público con enlace permanente (`public-files`; en el entorno local y el CI, por `supabase/config.toml`; en Supabase alojado se crea en S-01).
  - Solo la API sube, con el permiso de catálogo y con las claves S3 de Storage, que solo alcanzan archivos; nunca con `service_role`. El navegador no escribe en Storage.
  - Ruta `<workspace_id>/sds/<uuid>.pdf`: nadie lista, sobrescribe ni borra archivos de otro espacio. Quien recibe un enlace ve esa ficha, y se acepta.
  - Solo PDF, comprobado por su contenido (`%PDF`), hasta el límite de [02 §12](02_arquitectura.md#12-parámetros-iniciales).
  - Nunca se sobrescribe: cada archivo es una fila de `reagents.safety_sheets`, que no se borra, y el reactivo apunta a la vigente (una sola, enlace o PDF).
  - La API autoriza, sube fuera de la transacción y registra en otra que vuelve a autorizar. Si el registro falla, queda un archivo sin referencia; se acepta por ser público, con nombre aleatorio y sin datos sensibles.
- **Exportar por streaming.** El Excel sale de la misma consulta aislada del espacio, por lotes con cursor, sin cargarlo entero en memoria ni guardarlo.
  - Se escribe con `fflate`, y las cantidades pasan como texto decimal exacto, nunca por `number`. El tope está en [02 §12](02_arquitectura.md#12-parámetros-iniciales).
  - El del Inventario lleva dos hojas: reactivos, como en pantalla, y frascos con saldo.
  - El PDF sale de «Imprimir».
- **T-07 se aplaza** (archivos privados, outbox y worker) hasta el primer efecto externo: correo, integración o trabajo en segundo plano.
- **Avisos solo en la app**, calculados al consultar. Reemplazan la emisión por outbox del [ADR 0014](#adr-0014).
  - Core los compone desde el manifiesto de cada módulo, como las tarjetas del Inicio, y cada aviso exige su permiso.
  - En Reactivos: solicitudes por aprobar (`reagents.issue.approve`), bajo mínimo, vencidos y por vencer (`reagents.catalog.read`).
  - Son condiciones vigentes: sin «leído», desaparecen al resolverse. «Mis avisos» llega con el correo (T-07).

Motivo: el usuario prioriza lo necesario para el piloto y menos superficie fuera de la base, donde un cliente podría mezclarse con otro; la ficha de seguridad no es un dato sensible. Cambia el orden del [ADR 0016](#adr-0016) y, solo para las fichas, la regla «Storage es privado» de 02.

Cambios: 14 y 15-10-2026 (R-01B en tres entregas: ficha en PDF, Excel e «Imprimir», y avisos); compactado el 16-11-2026.

<a id="adr-0018"></a>

## ADR 0018 — Reactivos concluido para el piloto; sigue Equipos

- **Reactivos queda concluido** con la ficha de seguridad en PDF (R-01B, entrega 1).
- **Lo pendiente se programa solo si el cliente lo confirma** (F0):
  - el resto de R-01B: el Excel del Inventario en dos hojas y los avisos en la app ([ADR 0017](#adr-0017)). El de Movimientos se adelantó ([ADR 0021](#adr-0021));
  - el QR impreso y la auditoría formal de la UI (R-01A);
  - lo previo a G1: rendimiento con la carga sintética, aislamiento en todas las rutas y lo que dice la tabla de Pendientes;
  - REG-01, REG-02 reducido y la preparación de soluciones.
- **Estructura de módulo** (15-10-2026, sin cambiar la lógica): comandos por caso de uso en `application/`, contratos por área en `contracts/src/<módulo>/` y las hojas grandes partidas en hooks y secciones. Los módulos nuevos nacen así.
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

- **El problema era la duplicación entre módulos.** Fronteras, tipos y código muerto ya los vigilan `deps`, `typecheck` y `knip`. Pero `web-features-isolated` impide importar de otro módulo, así que cada uno copiaba lo que el anterior ya tenía.
- **Lo común sube a su capa, nunca a otro módulo:**
  - En el servidor (`apps/server/src/platform/`): el Excel de un informe (respuesta en partes, encabezado con espacio, fecha, autor y filtros) y el día civil en la zona del espacio.
  - En la web (`apps/web/src/app/`): el menú «Exportar», la cabecera de sección, las fechas civiles, el conteo con plural, la validación del PDF, la lectura de la etiqueta de un equipo y los mensajes de error comunes.
- **Las hojas grandes se parten:** la lógica del formulario en funciones puras con pruebas y la pantalla en secciones, como `asset-form.ts`.
- **Se acepta sin cambio:**
  - que Mantenimiento repita la consulta de tipos de equipo: el aislamiento de los módulos de la web vale más que una caché compartida;
  - que ningún módulo tenga capa `domain/`: sus reglas viven en SQL y en `application/` ([ADR 0006](#adr-0006));
  - el `!` tras un `INSERT … RETURNING`.
- **No cambian** las funciones, los datos ni los permisos.

Cambios: 20-10-2026; compactado el 16-11-2026.

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
  - *Área (dónde):* la ubicación física del Núcleo (`core.locations`, `core.location_areas`), común a los módulos.
  - *Departamento (de quién):* una lista del Núcleo, con dueños y carreras. Un mismo laboratorio guarda cosas de varios departamentos.
- **Sección «Áreas» en la barra lateral, bajo «Inicio»**, no en el Resumen de los módulos.
  - La ven el Propietario, el Administrador y el Operador; crean, renombran y archivan el Propietario y el Administrador.
  - Un selector «Áreas | Departamentos» cambia la vista. Hay un cuadro por área, agrupado por sede o edificio, con su nombre, su encargado y una cifra por módulo. Nadie dibuja ni mueve cuadros.
  - Cada cifra abre la lista de su módulo filtrada por esa área o ese departamento.
  - Al abrir un área se ven y se crean sus estantes y se asigna su encargado; Equipos lo muestra y deja de editarlo.
  - Cada módulo declara su icono y su cifra, como su tarjeta del Inicio: la sección no conoce a los módulos.
- **Los formularios solo eligen:**
  - la ubicación (ingreso, traslado, alta de equipo), entre áreas y estantes existentes. Si falta, el aviso pide al Administrador crearla en Áreas;
  - el departamento, opcional, al ingresar un reactivo y al dar de alta o editar un equipo;
  - el destino de una salida, que es un departamento. La lista de destinos de Reactivos desaparece, y los motivos no cambian.
- **Reglas:**
  - un área con reactivos o equipos, en ella o en sus estantes, no se archiva: primero se trasladan;
  - archivar un departamento solo lo deja de ofrecer;
  - la historia no cambia: salidas y solicitudes guardan el texto del destino. El lote y el equipo guardan el departamento enlazado, así que renombrarlo cambia en todas partes.
- **Datos anteriores:** las listas «área o departamento» y de destinos pasaron a la de departamentos, sin repetir nombres. No había datos reales; la demo usa carreras como departamentos.
- **Laboratorios:** el «Grupo» del bloque, la carrera, se elige de Departamentos. Espacios solo agrega horario, aforo y cierres a las áreas, que se crean aquí.
- **Entregas** ([04](04_roadmap.md), C-01), antes de L-01a:
  - **C-01a:** datos, API, cifras por área y por departamento y el paso de las listas actuales;
  - **C-01b:** la sección Áreas y los formularios que solo eligen.

Cambios: 20-10-2026; compactado el 16-11-2026.

## Pendientes

| Tema | Pregunta | Se resuelve en |
|---|---|---|
| Fiscalizados | Sustancias, concentraciones, cupos, sitios, custodia, formato vigente del reporte y si las salidas reguladas requieren aprobación | REG-01 (F0) |
| Espacios del piloto | ¿Una o varias unidades operan el inventario? ¿La calificación abarca varias? ¿Necesita el titular una vista consolidada de sus espacios (informes o traslados entre ellos)? Hoy los espacios no comparten nada, aunque sean del mismo titular; abrirlo exige una decisión nueva | F0, con REG-01 |
| Soluciones preparadas | ¿El laboratorio almacena soluciones y siguen siendo fiscalizadas? El diseño está decidido (03 §4) y va al final de Reactivos ([ADR 0017](#adr-0017)) | REG-01 |
| Materiales en prácticas | ¿La práctica representativa usa material que se entrega y se devuelve? Si es así, se adelanta un Materiales mínimo a F3. En Laboratorios los materiales son texto libre: ¿el cliente necesita saber cuántos hay (vasos, pipetas) al pedir y al aprobar? (15-11-2026) | P-04 |
| Equipos | ¿Qué campos de la ficha y qué documentos considera necesarios el cliente? ¿Qué valores de alimentación usa? ¿Quiere un aviso al pesar en Reactivos con una balanza de calibración vencida? ([ADR 0019](#adr-0019)) | F0, antes de E-01 |
| Registro paralelo | ¿El laboratorio conserva su registro actual durante el piloto? | F0 |
| Reglas de Laboratorios ([ADR 0023](#adr-0023)) | L-01e se programó con reglas por defecto («Cierre de Laboratorios», 05-11-2026). Falta confirmar: ¿quién declara lo utilizado al cerrar (el responsable o el docente)? ¿El químico abierto que sobra vuelve al frasco o se desecha? ¿La lista de chequeo debe estar completa para marcar «Lista»? ¿La columna «Código» de equipos se llena con los asignados o a mano? ¿Se entrega material que se devuelve? | P-04, con el cliente |
| Revisión de Laboratorios (16-11-2026) | Al mover un bloque a otra área cambia su código, pero los reactivos apartados conservan el motivo y el destino de antes («Práctica P1-S10-BIO03 · Bioquímica»): ¿se deja como registro de cuándo se apartó o se actualiza al mover? «Recibidas» muestra hasta 500 solicitudes sin páginas: añadir páginas o filtro por periodo | El motivo, con el usuario; las páginas, antes de G2 |
| Inicio | La propuesta del 20-10-2026 espera, porque el usuario tiene otras ideas: «Por atender» de todos los módulos con su enlace filtrado, tres tarjetas por fila con gráfico solo si hay datos y avisos declarados por cada módulo. Hoy la tarjeta de Equipos dice siempre «Sin cambios» | Al terminar los módulos, con las ideas del usuario |
| Préstamos | Prestatarios externos, plazos, pérdidas y retrasos. Por defecto ([ADR 0025](#adr-0025)): solo miembros, baja y deuda sin bloqueo automático | P-04, antes de G1 |
| Insumos que vencen ([ADR 0025](#adr-0025), MA-01f) | ¿Se bloquea la salida de un lote vencido o basta el aviso? ¿«Caduca solo la esterilidad» necesita su propia fecha? ¿Las salidas de Clínica deben enlazarse al paciente o al tratamiento? | P-04, con el cliente |
| Mantenimiento y analítica | Carácter obligatorio o recomendado, quién libera el equipo, destinatarios de alertas y fórmulas | Antes de F5 |
| Datos de Mantenimiento | ¿Qué datos del proveedor necesita el cliente (acreditación, identificación tributaria)? ¿Las tareas de la lista necesitan «No aplica» o una explicación cuando no se hacen? ¿Se identifica al técnico interno que hizo el trabajo? ¿Su sistema de calidad exige que una segunda persona revise las calibraciones? Hoy se guardan el nombre y el contacto del proveedor, casillas simples y quién registró ([ADR 0020](#adr-0020)) | F0, con el cliente |
| Salidas en serie | ¿Hace falta registrar varias salidas seguidas con la cámara? Hoy «Escanear» abre un frasco listo para «Salida» (14-10-2026) | P-03 |
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

<a id="adr-0025"></a>

## ADR 0025 — Materiales y Préstamos: consumibles, reutilizables y vale de préstamo

Estado: aceptada (18-11-2026; idea del usuario). Concreta M6 de [01 §3](01_producto.md); adelanta Materiales a antes del G0 de Equipos. Desarrolla la pregunta «Préstamos» de Pendientes con valores por defecto que confirma el cliente (P-04).

- **Dos clases de material** (`materials.products.class`), modelo tomado de Snipe-IT (consumibles y accesorios; los activos son los de Equipos). En pantalla se llaman «Insumo» y «Material» (19-11-2026, a pedido del usuario: «Reutilizable» sonaba técnico):
  - *Consumible* (guantes, puntas): ingreso, salida, ajuste, mínimo y aviso. Sin lotes ni envases a la vista.
  - *Reutilizable por cantidad* (vasos, pipetas): se presta y se devuelve por cantidad, con devolución parcial y resultado bueno, dañado o perdido.
  - *Sin clase con código (19-11-2026):* la tercera clase, «reutilizable identificado» (una unidad con código y QR), se quitó antes de usarse. Un QR por pieza no sirve para 50 vasos ni 100 rollos, que se cuentan por cantidad; lo que se sigue uno por uno (un microscopio, un kit caro) es un activo de Equipos, que ya tiene código y QR y se presta en el mismo vale.
- **Reutiliza la capacidad inventario** con `kind = 'material'`; no hay libro de movimientos propio. Un consumible tiene un solo lote por material (`inventory.positions.lot_id` es obligatorio y el cliente no elige lote), sin envases. Los ítems de Materiales nunca son de Reactivos ([03 §4](03_datos.md)).
- **Esquema `materials`**, dueño técnico propio: `products` (extensión 1:1 del ítem, con su clase) y, en la entrega siguiente, `loans`, `loan_lines` y `return_lines`. No escribe en `inventory` ni en `equipment` sino por las interfaces de las capacidades.
- **Rutas y permisos de Materiales** (`/materials/*`, `materials.*`), nunca `/inventory/*`: `materials.catalog.manage` (Administrador), `materials.receipt.create` y `materials.issue.create` (Administrador y Operador), `materials.adjustment.create` (Administrador). Los de préstamo llegan con MA-01b.
- **Préstamo, por defecto hasta que P-04 lo confirme:**
  - *Solo a miembros del espacio* (Docente o Estudiante, que presta por su grupo); sin prestatarios externos.
  - *Vale* (`P-0001`, correlativo por espacio): prestatario, fecha, vencimiento y líneas. Prestar **aparta** lo prestado en `inventory.positions.reserved`: sigue en el saldo (existencia institucional) pero deja de estar disponible, y la base impide sacar de más; no se consume ni se mueve de ubicación. Devolver libera lo apartado y puede ser parcial; el vale se cierra cuando ninguna línea tiene algo por devolver. Prestar es operación nueva; devolver, resolver pendientes ([ADR 0009](#adr-0009)). Solo se presta un reutilizable por cantidad; la versión esperada evita que dos personas devuelvan a la vez.
  - *Daño o pérdida:* al devolver, la cantidad dañada o perdida da de baja con un ajuste del libro («Dañado en el préstamo P-0001») y queda como deuda registrada en la línea; no hay bloqueo automático de nuevos préstamos ni cobro ni registro de reposición hasta que P-04 lo confirme. Nadie borra un préstamo: se cierra, se cancela o se compensa.
  - *Un solo mostrador:* el mismo vale presta material y equipos (FK tipada al activo, [ADR 0019](#adr-0019)), con «Prestado» como disponibilidad calculada de Equipos.
- **Entregas:** MA-01a (base y API: catálogo, ingreso, salida, ajuste y mínimo de consumibles), MA-01b (vale, préstamo, devolución parcial, daño y pérdida; hecha), MA-01c (pantallas: Resumen, Inventario con ficha, ingreso, salida, ajuste y mínimo, y Préstamos con «Nuevo préstamo» y devolución; hecha, en revisión del usuario) y MA-01d (Movimientos: libro exportable; Excel de existencias), MA-01f (vencimiento por lote y salida con tipo; hecha, en revisión del usuario; va antes de MA-01d), MA-02 (Laboratorios: material del catálogo y consumo o devolución al cerrar, solo si P-04 lo exige) y MA-03 (disponibilidad «Prestado» en Equipos y G0). Etapa `development` hasta su G0.
- **Interfaz (19-11-2026, a partir de ejemplos del usuario):**
  - *Inventario* en lista de filas con imagen, barra de existencia en diez tramos y ubicaciones que se despliegan (un lote por ubicación), más tarjetas y «Por ubicación» por áreas; el filtro «Bajo mínimo» se aplica en la API.
  - *Nuevo préstamo* como mostrador: mosaicos que se tocan para sumar al vale.
  - *Resumen* como tablero de solo lectura (`GET /materials/dashboard`, periodo de 7, 30 o 90 días): cifras con tendencia, movimientos por semana, los más usados, lo que se acaba pronto (existencia entre consumo diario), material por clase, reutilizables en el estante y atención. «Quién presta más» solo lo ve quien administra (`materials.catalog.manage`). Los gráficos cuentan movimientos y vales, nunca suman cantidades de unidades distintas (g, mL, u).
  - *Foto opcional* del material (campo y Storage), con mosaico de color por defecto: pendiente, se registra al hacerla.
- **Vencimiento por lote y salida con tipo (18-11-2026, MA-01f; planilla «P68 - Inventario de insumos» del cliente).** En la planilla del cliente, la hoja que sí se usa es el semáforo: 1066 lotes con lote, vencimiento, proveedor y factura, pero sin cantidades. El 34 % no vence. Esto corrige «sin lotes» solo para los insumos que vencen:
  - *El insumo dice si vence* (`materials.products.tracks_expiry`, editable y solo para consumibles). Si vence, su ingreso pide la fecha y, opcionalmente, el lote del proveedor (`inventory.lots.supplier_lot`); el mismo lote y la misma fecha suman al mismo lote. Si no vence, sigue el lote único sin fecha. Reutiliza los lotes de la capacidad; no hay tabla nueva de lotes.
  - *Semáforo* (02 §12): vencido, ≤ 90 días, ≤ 180 días o vigente. Se muestra en la fila del Inventario, con el filtro «Por vencer» y en «Hay que atender». La salida propone primero el lote que vence antes y avisa si está vencido, pero no lo bloquea hasta que P-04 lo decida.
  - *Salida con tipo y solicitante*: Práctica, Clínica o General, quién la pidió (un miembro del espacio, opcional) y un detalle libre. Se guarda en `materials.issue_details`, 1:1 con la operación del libro. El periodo sale de la fecha, sin escribirlo. No guarda datos de pacientes ni la factura de la clínica.
  - *Sin cambios*: el ingreso no pide proveedor, marca ni precio (la referencia libre cubre la factura), y no hay importación del Excel.
  - *Unidades de conteo (18-11-2026):* un insumo se cuenta en la unidad con que se entrega: par, caja, bolsa, paquete, rollo, frasco, tubo, sobre, kit o metro, además de u, g, kg, mL y L. No hay conversión (el contenido va en el nombre: «Guantes M (caja ×100)»); si el cliente necesita ingresar en cajas y sacar en unidades, se decide en P-04. Un reutilizable sigue en piezas (u), porque el estante y los rankings suman sus piezas.
  - *Pantallas (18-11-2026, a partir de ejemplos del usuario):* el Inventario de escritorio alinea Disponible, En préstamo y Mínimo en columnas. Préstamos pasa de tarjetas a una lista con columnas: vale y prestatario con su rol, líneas y piezas por devolver, plazo y fecha del préstamo, y estado (Activo, Parcial, Atrasado, Cerrado o Con baja). Arriba lleva pestañas con número (Abiertos, Atrasados, Cerrados, Todos: se conserva «Atrasado» para no confundirlo con un lote vencido) y un buscador por vale, persona o material. **Movimientos** (MA-01d) es el libro completo de Materiales: ingreso, salida, préstamo, devolución, baja y ajuste. Iba a llamarse «Informes», con un resumen por clase arriba; el resumen repetía el Resumen y los filtros del Inventario, así que se quitó y la sección se llama como en Reactivos. Inventario y Movimientos siguen separados (uno es el estado de hoy, el otro la historia), pero conectados: la ficha abre «Movimientos de este material» y cada renglón del libro abre la ficha. El Inventario exporta lo filtrado: imprime la lista o, el Administrador, baja el Excel de existencias por ubicación y lote con vencimiento, como la planilla del cliente. El libro se filtra por fecha y por tipo de salida, se busca en él, se imprime y se exporta a Excel con el generador común (ADR 0022) en lugar de CSV: abre igual en la planilla y no duplica código. Ver e imprimir piden `materials.catalog.read`; el Excel, `materials.report.export`, del Administrador (01 §5). Préstamo y devolución salen de los vales, porque no son movimientos del libro. El QR pasa a MA-01e.
  - *Fuera, y por qué:* la cabecera repetida en cada hoja (código, versión, sede, responsable) va una sola vez en el Informe (MA-01d). El saldo por fórmulas que buscan por nombre, el «NA» como texto y las observaciones usadas como estado («está abierto», «asignado a…») los reemplazan el libro, los campos vacíos y la ubicación o el préstamo.

Motivo: el laboratorio gasta y presta material además de reactivos; sin catálogo, Laboratorios solo puede pedirlo como texto. Los reglamentos universitarios coinciden en el vale, la devolución con estado y la reposición ([UABC](https://fcqi.tij.uabc.mx/wp-content/uploads/2025/06/Procedimiento-prestamo-material-almacen-6E-ACTUAL.pdf), [UNAM](https://amyd.quimica.unam.mx/mod/resource/view.php?id=6773)); lo de bajo valor y alto volumen no pide lote.

Cambios: 18 y 19-11-2026; 18-11-2026, vencimiento por lote y salida con tipo, a partir de la planilla del cliente.

## ADR 0026 — Inicio con Actividad, Calendario y Por atender

Estado: aceptada (19-11-2026; idea del usuario a partir de un ejemplo visual). Amplía el Inicio del [ADR 0011](#adr-0011).

- **Dos vistas** (19-11-2026): arriba, el selector «Tareas | Módulos». «Tareas» lleva Por atender, Actividad y Calendario; «Módulos», las tarjetas de siempre. Abre en «Tareas» y recuerda en el navegador la última vista de cada persona.

- **Actividad, un cronograma corto:**
  - No muestra el Cronograma completo, solo lo finalizado hoy, lo que está en proceso y lo que está por iniciar.
  - Va en una franja con la línea de «ahora» que avanza sola con la hora del espacio. Si hoy ya no queda nada por iniciar, muestra lo próximo.
  - Cada actividad abre en su módulo.
  - Lo que no tiene hora (un mantenimiento que vence, una devolución prevista) va en una franja «Todo el día».
  - En el móvil, la misma información va en lista por estado.
- **Calendario:**
  - Es un mapa de calor del mes: cada día cuenta sus prácticas, mantenimientos y devoluciones, en tramos fijos (0, 1–2, 3–5, 6–9, 10 o más) para que un mes tranquilo no parezca cargado.
  - Al tocar un día, Actividad muestra ese día.
  - Cada día dice en texto lo que tiene.
  - Los vencimientos de reactivos e insumos no entran: van en «Por atender».
- **Por atender:**
  - Una fila por tipo de tarea (prácticas por revisar o por cerrar, mantenimientos vencidos, fallas de equipos sin atender, préstamos atrasados, reactivos e insumos vencidos, por vencer o bajo mínimo), con lo rojo antes que lo ámbar. «Equipos por revisar» son dos filas (19-11-2026): los mantenimientos vencidos o no conformes y las fallas que nadie atiende.
  - Cada fila abre la lista ya filtrada de su módulo; si no hay nada, dice «Todo al día».
  - En el móvil va primero.
- **Recordatorios:**
  - Son personales: solo los ve quien los crea. Llevan texto y una fecha opcional, y se marcan como hechos o se quitan.
  - No son registros de negocio. Viven en una tabla del Núcleo con RLS por miembro.
- **Composición:**
  - Cada módulo declara sus actividades con fecha y sus tareas, como hoy declara su tarjeta, y el Núcleo las compone sin conocer los módulos.
  - Cada aporte exige su permiso y el ámbito del miembro: el Docente ve sus prácticas.
  - El calendario pide su mes aparte.
  - Cada panel carga y falla por separado.
- **Fuera:** del ejemplo quedan fuera el vidrio translúcido (no alcanza el contraste AA), el banner decorativo y la tarjeta de notificaciones, porque los avisos viven en la barra. Siguen las reglas de los gráficos del ADR 0011.
- **Diseño de IN-01** (19-11-2026):
  - Tres consultas, una por panel: `GET …/home/agenda?date=`, `…/home/calendar?month=` y `…/home/tasks`; las tarjetas siguen en `…/home`.
  - El estado de una práctica es el de su bloque: cerrada es «Finalizada», en curso es «En proceso», programada o lista es «Por iniciar».
  - Lo de todo el día: un mantenimiento cuenta el día que vence y, hecho, el día del registro; una devolución, el día previsto.
  - Un día pasado solo muestra lo hecho (prácticas cerradas, mantenimientos registrados, devoluciones recibidas): lo que se pasó sin hacer va en «Por atender».
  - Lo próximo: si hoy no queda nada por iniciar, el primer día con algo de los próximos 60.
  - Cada fila de «Por atender» trae su módulo, su tipo, su cifra y su tono; la pantalla pone el texto y el enlace.
- **Entregas:** IN-01 (base y API de Actividad, Calendario y Por atender), IN-02 (la pantalla, con el selector de vistas) e IN-03 (Recordatorios).

Motivo: el Inicio de hoy solo lleva a los módulos. El usuario quiere ver en un vistazo lo que pasa hoy, lo que viene y lo que le toca, y llegar a cada cosa con un toque.
