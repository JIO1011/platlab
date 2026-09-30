# 03 — Modelo de datos

Revisión: 30 de septiembre de 2026. Es el modelo objetivo por fases: cada migración crea solo lo que usa su entrega. Las migraciones SQL son la autoridad del esquema; no se mantiene un segundo esquema generado por un ORM.

## 1. Convenciones

- **Identificadores y fechas:** UUID; `created_at` y `updated_at` como `timestamptz`.
- **Aislamiento:** toda tabla de espacio lleva `workspace_id NOT NULL`, `PRIMARY KEY (id)`, `UNIQUE (workspace_id, id)` y FKs compuestas que incluyen `workspace_id`. Cada tabla pertenece a una de las clases de §1.1.
- **Estados:** texto con `CHECK` y transiciones por comando; nunca estados libres en JSON.
- **Concurrencia:** `version` entera para control optimista en registros editables.
- **Nada se borra:** los catálogos se archivan con `archived_at` y las membresías se desactivan con `status`. El rol operativo no borra nada histórico.
- **Cantidades:** `numeric` y cadenas decimales. Se guardan la cantidad y la unidad capturadas y la cantidad normalizada.
- **Conversiones:** solo dentro de la misma dimensión (kg↔g, L↔mL). Pasar de masa a volumen exige un dato documentado.
- **Autoría:** actor, creador o ejecutor referencian `(workspace_id, principal_id)`.
- **Relaciones entre módulos:** FKs tipadas; nada de pares genéricos `resource_type/resource_id` en operaciones críticas.
- **Índices:** empiezan por `workspace_id` y solo se crean cuando una consulta los justifica.
- **Claves:** los códigos son únicos dentro del espacio. Nombres, CAS y lotes del proveedor no son claves.

### 1.1 Clases de tablas

| Clase | Tablas | `workspace_id` | Acceso | Eliminación |
|---|---|---|---|---|
| Catálogo global | `core.module_definitions`, `module_dependencies`, `permissions`, `roles`, `role_permissions` y unidades de medida | No | Solo lectura en el runtime; cambia por migración | No contiene datos de clientes |
| Global de plataforma | `core.identities`, `platform.customer_accounts`, `staff_accounts`, `package_definitions`, `package_versions` | No | Consola del Equipo PlatLab con permiso, o la propia identidad; políticas propias | Procedimiento global: cerrar un espacio no borra una identidad que usa otros espacios |
| Plataforma por espacio | `platform.contracts`, `contract_revisions`, `workspace_limits`, `usage_reservations`, `workspace_readiness`, `idempotency_records`, `outbox_events`, `jobs`, `job_runs`, `schedules`, `import_*`, `data_disposition_*` y `staff_audit_events` | Sí; en `staff_audit_events` el espacio afectado es opcional | Comandos del Equipo PlatLab o del runtime con contexto | Entra en la disposición del espacio, salvo excepción justificada |
| Dominio del espacio | El resto de `core` y los esquemas de módulos y capacidades | Sí, con RLS | API con membresía | Solo mediante el procedimiento de disposición |

## 2. Esquemas

| Esquema | Propietario técnico | Contenido | Fase |
|---|---|---|---|
| `core` | Core | Espacios, identidades, membresías, principales, invitaciones, roles y asignaciones, ubicaciones, derechos de módulos, documentos, marca y auditoría | F1a |
| `platform` | Plataforma | Titulares, paquetes, contratos, staff, límites, cuotas, admisión de datos, idempotencia, outbox, trabajos, importaciones y disposición | F1a–F1b |
| `inventory` | Capacidad inventario | Items, lotes, posiciones, operaciones y asientos, motivos, preparaciones, custodias, retornos, reservas y transferencias | R-00; F2–F4 |
| `reagents` | Módulo Reactivos | Datos químicos y perfil fiscalizado | R-00; F2 + REG-02 |
| `equipment` | Módulo Equipos | Tipos de equipo, activos, condición, ubicación y custodias | F2 |
| `incidents` | Capacidad incidencias | Casos y acciones | F2 |
| `laboratories` | Módulo Laboratorios | Capacidad, horarios y excepciones | F3 |
| `scheduling` | Capacidad agenda | Reservas de laboratorios, equipos y materiales | F3 |
| `practices` | Módulo Prácticas | Plantillas, actividades, revisiones, decisiones y vínculos | F3 |
| `materials` | Módulo Materiales | Consumibles, reutilizables y préstamos | F4, o un mínimo en F3 si P-04 lo exige |
| `maintenance` | Módulo Mantenimiento | Planes y órdenes | F5 |
| `analytics` | Módulo Analítica | Indicadores y alertas avanzadas | F5 |

- Solo el propietario técnico escribe en su esquema.
- Una capacidad no se contrata: su código existe para los módulos que la usan.
  - Inventario: Reactivos, Materiales y Prácticas.
  - Agenda: Equipos, Laboratorios, Prácticas, Materiales y Mantenimiento.
  - Incidencias: Equipos y los módulos que reportan.
- Compartir una capacidad no comparte derechos. Cada operación se autoriza contra el módulo dueño del recurso (`inventory.items.kind`), con rutas y permisos de ese módulo ([02 §4](02_arquitectura.md#4-contrato-de-módulo)). Tener Materiales no habilita Reactivos.

## 3. Core, acceso y plataforma

| Tabla | Esencial |
|---|---|
| `core.workspaces` | `customer_account_id`; `owner_membership_id` con FK compuesta a una membresía del mismo espacio; código, nombre, zona IANA y `status` |
| `core.identities` | Identidad de Auth con `(provider, provider_subject)` único |
| `core.memberships` | Identidad dentro de un espacio y `status`; única por `(workspace_id, identity_id)` |
| `core.principals` | Actor humano (por su membresía) o de servicio; un `CHECK` impide mezclar ambos |
| `core.invitations` | Email, hash del token, expiración, roles y ámbitos propuestos y estado; se canjea en una transacción |
| `core.permissions`, `roles`, `role_permissions` | Catálogo global fijo, sincronizado desde los manifiestos |
| `core.role_assignments` | Principal, rol, ámbito (todo el espacio o `location_id`) y vigencia |
| `core.locations` | Árbol por `parent_id`: sede, edificio, sala, almacén, custodia o tránsito |
| `core.module_definitions`, `module_dependencies` | Registro global de módulos |
| `core.workspace_entitlements` | Módulo, vigencia, estado operativo, contrato y revisión aplicada |
| `core.documents`, `core.branding` | Archivos versionados y marca validada |
| `core.audit_events` | Actor, acción, entidad, correlación, motivo y cambios relevantes |
| `platform.customer_accounts` | Titular jurídico y contacto |
| `platform.package_definitions`, `package_versions` | Paquetes y sus versiones inmutables |
| `platform.contracts`, `contract_revisions` | Contrato por espacio y revisiones con vigencia |
| `platform.workspace_limits` | Límites efectivos proyectados por `apply_contract_revision` |
| `platform.usage_reservations` | Cuotas de archivos y trabajos, reservadas y confirmadas de forma atómica |
| `platform.staff_accounts`, `staff_audit_events` | Equipo PlatLab y su auditoría |
| `platform.workspace_readiness` | Admisión de datos `synthetic`, `controlled_loading` u `operational`, con evidencia y responsables |
| `platform.idempotency_records` | Clave única por espacio, actor y operación, con hash del contenido y resultado |
| `platform.outbox_events`, `jobs`, `job_runs`, `schedules` | Efectos posteriores al commit, reintentos y deduplicación |
| `platform.import_batches`, `import_rows` | Importación con vista previa y errores por fila |
| `platform.data_disposition_cases`, `disposition_tasks` | Salida y eliminación con evidencia por repositorio |

Reglas:

- **Propietario.** Es `owner_membership_id`, no un rol. Transferirlo exige reautenticación, aceptación del sucesor y bloqueo del espacio.
- **Estados del espacio.** `provisioning` puede no tener propietario; `trial` y `active` exigen un propietario activo.
- **Delegación.** Una invitación no otorga permisos que el invitador no pueda delegar.
- **Autoaprobación.** Está deshabilitada por defecto, incluso para el propietario.
- **Ámbitos.** Se calculan con CTE recursiva sobre `parent_id`, sin ciclos ni padres de otro espacio. Mover el árbol se serializa y se audita.
- **Permisos entre laboratorios.** Consultar el inventario institucional no autoriza salidas de otro laboratorio. Transferir exige permiso en el origen y recibir, en el destino.
- **Trabajos.** `platform.claim_jobs(limit)` es la única función `SECURITY DEFINER` para reclamar trabajos. Es estrecha, no lee datos de dominio y solo la ejecuta el rol del dispatcher.

## 4. Inventario y Reactivos

| Tabla | Esencial |
|---|---|
| `inventory.items` | Código, nombre, `kind`, unidad base, modo de seguimiento y archivado |
| `reagents.products` | Extensión 1:1 del item: CAS opcional, concentración, pureza, estado físico, peligros y SDS |
| `inventory.lots` | Item (FK compuesta), proveedor y referencia, recepción, caducidad (puede ser desconocida) y condición |
| `inventory.containers` | Envase identificable: código, apertura y caducidad tras abrir; solo cuando el proceso lo exige |
| `inventory.positions` | Item, lote, envase y retorno opcionales, ubicación, disposición, saldo, reservado y versión |
| `inventory.operations` | Cabecera del movimiento: tipo, actor, motivo, fecha, correlación y referencia |
| `inventory.entries` | Asientos inmutables con signo por posición |
| `inventory.reasons`, `destinations` | Listas de motivos (salida, ajuste, baja) y destinos que administra el laboratorio; desde R-01 |
| `inventory.preparation_inputs` | Preparación: lote resultante y asientos de los insumos consumidos |
| `inventory.custodies`, `custody_lines` | Entrega a un responsable y su conciliación |
| `inventory.return_batches` | Retorno segregado hasta verificarlo o disponerlo |
| `inventory.allocations` | Reservas: `held → fulfilled / released` |
| `inventory.transfers`, `transfer_lines` | `draft → approved → in_transit → partially_received → received` |

Reglas:

- **Posición única:** `(workspace_id, item_id, lot_id, container_id, return_batch_id, location_id, disposition)`, con los nulos tratados como iguales.
- **Saldos:** saldo ≥ 0 y 0 ≤ reservado ≤ saldo. El saldo y los asientos se escriben en la misma transacción.
- **Cantidades:**
  - Existencia institucional: saldos físicos, incluidas custodia y tránsito.
  - Disponible: lo utilizable en lotes elegibles menos las reservas.
  - Consumo: solo un movimiento real confirmado.
- **Condición del lote:** habilitado, cuarentena, bloqueado o descartado.
- **Disposición de la posición:** utilizable, cuarentena o restringida. Siempre prevalece la restricción más fuerte.
- **Retornos:** van a cuarentena hasta verificarse. Un sobrante manipulado nunca se suma al lote original.
- **Conteos:** si el conteo queda por debajo de lo reservado, se registra la discrepancia y se resuelven los compromisos antes de ajustar.
- **Importación:** el saldo inicial es una operación de apertura.
- **Preparación de soluciones:**
  - Si la solución se almacena o se reutiliza, una sola operación consume los insumos y crea un lote del producto preparado (un reactivo del catálogo con su concentración), con trazabilidad del insumo al lote.
  - Si se usa de inmediato, solo se registra el consumo asociado a la actividad o a la custodia.
  - Si una solución sigue siendo fiscalizada lo decide el responsable según la norma y la concentración (REG-01), nunca el sistema por defecto.
- **Tipos:** un item no puede ser a la vez reactivo y material.

### Fiscalizados (REG-02, ajustado tras REG-01)

| Tabla | Esencial |
|---|---|
| `reagents.regulatory_profiles` | Sustancia, código oficial, lista y versión, concentración y evidencia |
| `reagents.authorizations`, `authorized_sites` | Calificación, titular, vigencia, actividades, responsable y sitios vinculados a ubicaciones |
| `reagents.authorized_quotas` | Cupo por sustancia, periodo y unidad |
| `reagents.regulated_operation_details` | FK al movimiento, tipo regulatorio, fecha del hecho y documentos; no es otro saldo |
| `reagents.regulatory_reports`, `report_lines` | Periodo, operaciones incluidas, saldos conciliados, versión del formato, revisor y hash |

- Cupo autorizado, existencia física y cuota del SaaS son cosas distintas.
- Entregar a custodia no es consumo ni compra. El reporte se deriva de hechos tipificados.
- No se clasifica por CAS o nombre sin comprobar la concentración y la norma. No se inventan equivalencias.
- El reporte pasa de borrador a revisión y a exportación. La presentación se registra solo con evidencia y no hay envío automático a SISALEM.
- Si la calificación cubre otros espacios o sistemas, el perímetro se marca como parcial.

## 5. Equipos, incidencias, materiales y mantenimiento

| Tabla | Esencial |
|---|---|
| `equipment.asset_types` | Tipo de equipo y características que se pueden solicitar |
| `equipment.assets` | Tipo, código, marca, modelo, serie, ubicación, responsable, condición y archivado |
| `equipment.condition_changes` | Condición anterior y nueva, actor, motivo e incidencia |
| `equipment.location_changes` | Traslado trazado entre ubicaciones |
| `equipment.custodies` | Entrega y devolución de un activo; solo una abierta por activo |
| `incidents.cases`, `actions` | Contexto heredado, gravedad, responsable, estado y acciones |
| `materials.products`, `assets` | Consumible o reutilizable; unidades identificables |
| `materials.loans`, `loan_lines`, `return_lines` | Préstamo, líneas y devoluciones parciales |
| `maintenance.plans`, `orders` | Frecuencia, fecha prevista, tareas, resultado y siguiente intervención |

Estados:

- **Equipo:** `operational`, `restricted`, `faulted` o `retired`. Reserva, uso y mantenimiento son dimensiones separadas.
- **Incidencia:** abierta → en atención → resuelta → cerrada. Resolverla exige un resultado.
- **Préstamo:** abierto → parcialmente devuelto → cerrado. Se puede cancelar antes de entregar.

Reglas:

- Una avería bloquea nuevas asignaciones y marca las reservas afectadas. Volver a operativo exige resultado y responsable.
- Los consumibles usan el ledger de inventario. Los reutilizables identificables se entregan y devuelven como activos.

## 6. Laboratorios, agenda y prácticas

| Tabla | Esencial |
|---|---|
| `laboratories.labs` | Ubicación única, código, capacidad, responsable y política de anticipación |
| `laboratories.opening_hours`, `calendar_exceptions` | Horarios, cierres y excepciones |
| `scheduling.lab_bookings`, `equipment_bookings`, `material_bookings` | Reservas `[inicio, fin)` con exclusión GiST por espacio y recurso |
| `practices.templates`, `template_versions` | Plantillas con versiones publicadas inmutables |
| `practices.participations` | Estudiante: docente responsable, ámbito y vigencia |
| `practices.activities` | Plantilla y versión, docencia o investigación, solicitante, horario solicitado y confirmado, sala asignada (nula hasta asignar), estado y versión |
| `practices.requirements` | Recurso tipado con FK real (reactivo, tipo de equipo, activo concreto con justificación o material) o línea no catalogada; cantidad, unidad y asignación |
| `practices.activity_revisions`, `conditional_approvals` | Propuesta exacta del Administrador y su preaprobación con vencimiento |
| `practices.decisions`, `state_changes` | Decisiones y transiciones con actor y motivo |
| `practices.booking_links`, `custody_links` | Vínculos a reservas y custodias; no duplican movimientos |

Estados:

- **Actividad:** `draft → submitted → scheduled → preparing → ready → running → closing → completed`. También `changes_requested`, `rejected` y `cancelled`.
- **Revisión:** `awaiting_requester_acceptance → approved`. También `accepted_pending_review`, `declined`, `expired` y `withdrawn`.

Reglas:

- **Aprobar** confirma agenda y recursos en la misma transacción; nunca queda una actividad «aprobada sin reserva».
- **Revisión pendiente:** no reemplaza la reserva vigente, y que una propuesta venza no libera nada.
- **Cronograma:** es una consulta de las reservas; no existe una segunda matriz editable.
- **Recurrencias:** se crean como ocurrencias individuales con conflictos explícitos.
- **Línea no catalogada:** siempre es una excepción para el Administrador, que la vincula a un recurso o la rechaza.
- **Equipos:** se solicitan por tipo y características; el Administrador asigna el activo concreto. Pedir un activo específico exige una justificación.
- **Confirmación en lote:** cada solicitud se confirma en su propia transacción, con su clave de idempotencia. El lote informa el resultado de cada solicitud, y un conflicto no bloquea a las demás.

## 7. Transacciones críticas

- **Ingreso, salida y ajuste (R-00).** Bloquear la posición, validar el saldo y escribir juntos operación, asientos, saldo, auditoría e idempotencia. Con dos salidas de 60 g sobre 100 g, solo una confirma.
- **Aprobar y reservar.**
  1. Bloquear la actividad y los recursos en orden estable.
  2. Revalidar versión, estado, permisos del Administrador en todos los ámbitos, elegibilidad del solicitante y disponibilidad.
  3. Reservar y cambiar el estado juntos.
- **Aceptar una propuesta.** Revalida todo. Si hay un conflicto de negocio, conserva `accepted_pending_review` sin reservas parciales mediante un savepoint.
- **Preparar y entregar.** Pasar de almacén a custodia y resolver la reserva; la existencia institucional no cambia.
- **Cerrar.** Cada entrega termina consumida, devuelta (a cuarentena si no se verifica), dispuesta o como pendiente explícito. Mientras tanto, la actividad sigue en `closing`.
- **Cancelar.** Antes de entregar libera las reservas; después exige conciliar las custodias.
- **Transferir.** Despachar de origen a tránsito y recibir de tránsito a destino, registrando diferencias.
- **Corregir.** Siempre con una operación compensatoria autorizada.

Caso regulatorio de G1: 100 g iniciales + 20 g recibidos; 30 g a custodia, 25 g consumidos y 5 g retornados → quedan 95 g institucionales.

- El retorno queda segregado.
- El reporte no suma la entrega y el consumo como si ambos fueran consumo.

## 8. Pruebas que protegen el modelo

Cuatro capas:

- pgTAP bajo los roles reales de API y worker.
- Integración API.
- Concurrencia con conexiones reales.
- Un flujo Playwright por incremento.

Casos:

- Fuga entre dos espacios que tienen el mismo módulo habilitado, FK cruzada, módulo apagado y membresía revocada.
- Todas las combinaciones de los dos ejes de admisión con sus tres clases de acción, y la denegación de estados desconocidos ([02 §6](02_arquitectura.md#6-autorización-etapas-y-admisión)).
- Un ítem de un módulo no se puede operar desde la ruta de otro módulo.
- Un movimiento y una desactivación, suspensión o revocación simultáneos: no queda ningún movimiento nuevo confirmado después del cambio de estado.
- Dos reservas o dos salidas simultáneas, cierre repetido y devolución parcial.
- Transferencia parcial, cancelación con custodia y equipo averiado con reservas.
- Worker repetido y fallo antes o después del commit.

Cada cierto tiempo se reconcilian los saldos contra los asientos y las reservas contra las asignaciones.
