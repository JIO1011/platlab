# 05 — Decisiones y pendientes

Revisión: 30 de septiembre de 2026. Registro resumido de decisiones de arquitectura (ADR). Una decisión aceptada solo se reemplaza con otra que indique qué cambia. El texto completo anterior de los ADR 0001–0007 está en el commit `bc26fa8`.

| ADR | Tema | Estado |
|---|---|---|
| [0001](#adr-0001) | Espacios de trabajo y autorización | Aceptado el 28-09-2026 |
| [0002](#adr-0002) | Contratos, derechos y límites | Aceptado el 28-09-2026 |
| [0003](#adr-0003) | Refresco y protección de tráfico | Aceptado el 28-09-2026 |
| [0004](#adr-0004) | Identidad y consola del Equipo PlatLab | Aceptado el 28-09-2026; nombres actualizados el 30-09-2026 |
| [0005](#adr-0005) | Datos reales, respaldos y acceso privilegiado | Aceptado como criterio el 29-09-2026; las capacidades se validan antes de G1 |
| [0006](#adr-0006) | SQL tipado y pruebas | Aceptado el 28-09-2026 |
| [0007](#adr-0007) | Asignación y aprobación condicionada | Aceptado el 29-09-2026; actor actualizado el 30-09-2026 |
| [0008](#adr-0008) | Roles y actores | Aceptado el 30-09-2026; la matriz detallada se valida en P-03 |
| [0009](#adr-0009) | Etapas de módulo y admisión de operaciones | Aceptado el 30-09-2026 |

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
- El comando también valida que la etapa de cada módulo corresponda al tipo de contrato ([ADR 0009](#adr-0009)).
- El runtime solo lee derechos y límites efectivos. La expiración bloquea operaciones nuevas en cada petición; resolver pendientes y consultar siguen la admisión por dos ejes ([ADR 0009](#adr-0009)).
- El estado operativo del módulo es independiente del derecho. Reducir una cuota bloquea el consumo nuevo, pero no borra datos.
- Sin motor de cobros ni suscripciones solapadas en el MVP.

Motivo: una sola autoridad evita contradicciones entre contrato, paquete y permisos.

Cambio del 30-09-2026: se aclara el efecto de la expiración, que la versión compacta había dejado ambiguo.

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

Cambio del 30-09-2026: el «operador del SaaS» pasa a llamarse «Equipo PlatLab» (`staff`), porque «Operador» es un rol del laboratorio.

<a id="adr-0005"></a>
## ADR 0005 — Datos reales, respaldos y acceso privilegiado

- La demo es sintética. Un trial o piloto usa datos reales solo tras G1: primero la carga controlada y después la operación.
- El encargo lo acepta un representante autorizado; no se presume que el propietario lo sea.
- La retención de las copias se fija por repositorio antes de G1; ni 7 ni 30 días se dan por cumplimiento. La eliminación comunicada y el fin del encargo tienen términos propios (3 y 5 días), que se validan con asesoría.
- Un registro minimizado de supresiones se vuelve a aplicar antes de abrir una restauración.
- Recuperación: el usuario acepta el 30-09-2026 un RPO de 24 h durante las pruebas y el piloto. Se recomienda que el laboratorio conserve su registro actual durante el piloto para poder reconstruir. Operar con PlatLab como único registro exige PITR ([02 §12](02_arquitectura.md#12-parámetros-iniciales)).
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
- El Administrador, o quien tenga el permiso de revisión en ese ámbito, asigna sala y recursos del mismo espacio y confirma. Si respeta lo solicitado, no hace falta otra aceptación.
- Cambiar fecha o franja, cantidades, sustitutos o condiciones exige una revisión preaprobada con vencimiento. Si el solicitante la acepta, el servidor revalida y confirma en una transacción.
- Si al aceptar hay un conflicto, la actividad queda en `accepted_pending_review` sin reservas parciales (savepoint). Un error técnico revierte todo.
- La reubicación equivalente (misma fecha o franja, recursos y condiciones) se hace con un comando auditado y notificado, sin nueva aceptación.
- El sistema nunca aprueba por su cuenta. La confirmación en lote ejecuta cada solicitud en su propia transacción e informa el resultado de cada una; un conflicto no bloquea a las demás.
- Los equipos se solicitan por tipo y características, y el Administrador asigna el activo concreto. Pedir un activo específico exige una justificación.

Cambio del 30-09-2026: quien revisa pasa de «técnico» a Administrador; preparar y entregar corresponde al Operador.

<a id="adr-0008"></a>
## ADR 0008 — Roles y actores

- **Dos planos.** En el de PlatLab está el Equipo PlatLab, que usa la consola. En el del espacio están el Propietario, el Administrador, el Operador, el Docente, el Estudiante (tesista) y el rol especial Responsable de fiscalizados.
- **Roles.** Son paquetes de permisos del catálogo fijo, combinables y asignados con un ámbito.
- **Administrador y Operador.** El Administrador incluye todo lo del Operador, decide las solicitudes, configura los catálogos y aplica ajustes. El Operador ejecuta y consulta toda la información operativa.
- **Propietario.** Gobierna suscripción, miembros y propiedad. Al crear el espacio recibe el rol Administrador, que puede retirarse.
- **Límites.** Nadie borra registros de negocio y, por defecto, nadie aprueba su propia solicitud.
- **Alumnos de clase.** No tienen cuenta en el alcance inicial.

Motivo:

- Es el vocabulario del usuario y de ReactiLab.
- Separa decidir de ejecutar sin obligar a tener dos personas en un laboratorio pequeño.

La matriz está en [01 §5](01_producto.md#5-actores-y-roles).

<a id="adr-0009"></a>
## ADR 0009 — Etapas de módulo y admisión de operaciones

- **Etapas.** Cada módulo declara en su manifiesto una etapa: `development → pilot → general`.
  - `development`: solo en ambientes con datos sintéticos.
  - `pilot`: además en espacios con contrato de piloto; se alcanza tras el G0 del módulo.
  - `general`: en cualquier paquete publicado; se alcanza tras el G2 del módulo.
- **Contratos.** `apply_contract_revision` rechaza un módulo cuya etapa no corresponde al tipo de contrato, y el runtime lo vuelve a comprobar. La admisión de datos reales del espacio (G1) sigue siendo un control aparte.
- **Admisión.** Cada comando declara su clase de acción: operación nueva, resolución de pendientes, o consulta y exportación. Una sola función evalúa dos ejes independientes, espacio y módulo, y admite solo lo que ambos permiten. Cualquier estado no listado se deniega. Se prueban todas las combinaciones ([02 §6](02_arquitectura.md#6-autorización-etapas-y-admisión)).
- **Módulo del recurso.** La admisión y el permiso se evalúan contra el módulo dueño del recurso, no contra la capacidad compartida. Las operaciones se exponen con rutas y permisos de ese módulo.
- **Bloqueo.** La admisión lee espacio, derecho y membresía con bloqueo compartido en la misma consulta con la que decide. Los cambios de estado modifican esas filas y esperan a las operaciones en curso. El orden de bloqueo es fijo: espacio → derecho → membresía → datos.
- **Plazos.** El contrato fija la duración del periodo de cierre y el alcance de la suspensión comercial; no se inventan plazos.

Motivo:

- La demo y el piloto necesitan usar módulos antes de venderlos, sin abrirlos a todos los clientes.
- Las obligaciones abiertas (devoluciones, custodias) deben poder resolverse aunque venza el contrato.
- Una decisión de autorización no puede quedar obsoleta por un cambio de estado concurrente.

Cambio del 30-09-2026: la tabla única pasa a dos ejes con denegación por defecto, con rutas por módulo y admisión bajo bloqueo.

## Pendientes

| Tema | Pregunta | Se resuelve en |
|---|---|---|
| Fiscalizados | Sustancias, concentraciones, cupos, sitios, custodia, formato vigente del reporte y si las salidas reguladas requieren aprobación | REG-01 (F0) |
| Espacios del piloto | ¿Una o varias unidades operan el inventario? ¿La calificación abarca varias? | F0, con REG-01 |
| Envases | ¿Trazabilidad por envase y apertura, o por lote? | Antes de migrar reactivos |
| Soluciones preparadas | El diseño ya está decidido (03 §4). Falta saber si el laboratorio almacena soluciones y si siguen siendo fiscalizadas | REG-01 |
| Materiales en prácticas | ¿La práctica representativa usa material que se entrega y se devuelve? Si es así, se adelanta un Materiales mínimo a F3 | P-04 |
| Registro paralelo | ¿El laboratorio conserva su registro actual durante el piloto? | F0 |
| Reglas de Prácticas | Anticipación, cancelaciones, salas exclusivas, devoluciones químicas y quién declara el consumo al cerrar | P-04, antes de F3 |
| Préstamos | Prestatarios externos, plazos, pérdidas y retrasos | Antes de F4 |
| Mantenimiento y analítica | Carácter obligatorio o recomendado, quién libera el equipo, destinatarios de alertas y fórmulas | Antes de F5 |
| Etiquetas y QR | ¿Etiquetas con QR y escaneo con cámara, como en ReactiLab? | P-03 |
| Retención y respaldos | Duración por repositorio y mecanismo de supresión anticipada | DP-01, antes de G1 |
| Conexión a PostgreSQL | ¿Conexión directa con el complemento IPv4 o Supavisor en modo sesión? | S-01 |
| Credencial local del rol de runtime | `supabase/seed.sql` fija una contraseña de desarrollo. Antes de usar ramas de Supabase o staging, pasarla a una variable de entorno local o desactivar el seed fuera de local y CI | S-01 |
| Conectividad | Cortes reales y procedimiento de continuidad | F0 |
| Modelo comercial | Recomendado: licencia anual por espacio y paquete + incorporación única + desarrollos a medida aparte ([01 §4](01_producto.md#4-paquetes)). Pendiente de confirmar por el usuario | Antes de cotizar |
| Precio | Tarifa por espacio con costos medidos, soporte y margen | Antes de cotizar; S-01 aporta los costos |
| Código de ReactiLab | Titularidad y licencia: el README dice MIT y los términos dicen software propietario | Antes de copiar componentes |
