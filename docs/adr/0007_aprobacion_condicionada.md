# ADR 0007 — Asignación técnica y aprobación condicionada

Estado: aceptado por el usuario el 29 de septiembre de 2026. Sustituye la segunda aprobación técnica obligatoria tras aceptar cada propuesta. Implementación en F3, con validación de los casos del laboratorio.

## Responsabilidades

El docente propone la actividad desde una plantilla, indica fecha/franja y solicita equipos, materiales y reactivos. No asigna el laboratorio definitivo. El sistema puede sugerir salas/horarios compatibles y explicar conflictos; una sugerencia no aprueba ni aparta recursos.

El técnico autorizado asigna la sala, comprueba condiciones y confirma la actividad. Puede editar o reubicar dentro de su ámbito y del **mismo workspace**, preservando las restricciones del solicitante. «Espacio físico» significa laboratorio/sala; reubicar no cambia el espacio de trabajo ni comparte recursos entre universidades.

Si la asignación inicial respeta horario, recursos y condiciones de la solicitud, el técnico puede confirmar directamente; elegir la sala no obliga por sí solo a otra aceptación docente. No se convierte «mostrar excepciones» en aprobación autónoma del sistema.

## Cambios que requieren aceptación

Cambiar fecha/franja, cantidades, sustitutos, requisitos o condiciones de acceso/seguridad/accesibilidad exige una propuesta concreta. El técnico emite aprobación condicionada con revisión exacta, actor, ámbito, condiciones/política, vencimiento y revocación. No retiene recursos ni reemplaza la reserva vigente.

El docente acepta esa revisión. La API verifica su permiso de aceptación y elegibilidad, y la autoridad vigente del técnico que la preautorizó. Revalida revisión, licencias, condiciones, ámbito, horario y disponibilidad. No sustituye el JWT del docente por el del técnico ni le otorga permisos de inventario.

Si todo sigue válido, aceptación, decisión técnica preautorizada, reservas, auditoría y outbox se confirman en una transacción. Registrar quién inició la aceptación y quién autorizó técnicamente, con FKs del mismo espacio. Una aceptación duplicada devuelve el resultado idempotente.

## Reubicación de una actividad ya programada

Una sala equivalente puede asignarse mediante comando técnico auditado y notificación, sin otra aceptación, cuando mantiene fecha/franja, recursos y todas las condiciones previamente aceptadas, y ambas personas conservan el ámbito requerido. Comprobar capacidad, seguridad, accesibilidad y restricciones de lugar de la solicitud; «hay una sala libre» no demuestra equivalencia.

Si no cumple esas condiciones o la equivalencia es incierta, usar propuesta y aceptación. Reemplazar reservas de sala/activos conjuntamente; ante conflicto conservar las anteriores. El cambio no edita otra agenda independiente ni mueve físicamente existencias por cambiar un campo.

## Excepciones y persistencia

Propuesta vencida/retirada o revisión alterada no pueden aceptarse como si siguieran válidas. Si el solicitante perdió acceso, no aceptar en su nombre. Técnico revocado, política cambiada o recursos insuficientes impiden confirmar y muestran una excepción para revisión.

Si el solicitante aceptó válidamente la revisión pero falla su confirmación por un conflicto de negocio, conservar `accepted_pending_review` **sin reservas parciales**. Aislar el intento de reserva en un savepoint; ante un conflicto previsto, revertir sus cambios y confirmar aceptación/motivo en la transacción exterior. Errores técnicos inesperados revierten todo y se reintentan con idempotencia. Un rollback completo nunca guarda aceptación. [Savepoints de PostgreSQL](https://www.postgresql.org/docs/current/sql-savepoint.html).

Resolver la excepción sin cambiar las condiciones puede aprovechar esa aceptación exacta, con nueva autorización técnica y validación de recursos. Una revisión de horario/requisitos necesita otra aceptación. La UI distingue «Aceptada; requiere revisión» de «Reserva confirmada». Retirar/vencer una propuesta no cancela la actividad previamente programada.

## Comprobación antes del piloto de Prácticas

Probar asignación inicial, intento docente de imponer laboratorio, sugerencia sin reserva, reubicación equivalente y no equivalente, doble aceptación, revisión alterada, ambas autoridades revocadas, cambio de licencia, propuesta vencida, dos aceptaciones por el último recurso y reemplazo fallido con reserva anterior intacta.

La ruta de aceptación solo ejecuta el compromiso técnico acotado de esa revisión; no permite comandos arbitrarios con los privilegios de quien lo emitió. La evidencia operativa específica se revisa con el responsable del laboratorio.
