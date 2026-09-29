# Ciclo del cliente y protección de datos

Fecha: 25 de septiembre de 2026; decisiones de producto actualizadas el 26 de septiembre.
Estado: propuesta de diseño y revisión normativa; no acredita cumplimiento ni sustituye la validación jurídica del contrato y de la operación real.
Este documento es la referencia del plan para cierre contractual, conservación, derechos y eliminación.
Se complementa con [Dominio y datos](03_dominio_y_datos.md), [Infraestructura](04_infraestructura.md) y [Decisiones de la revisión](07_decisiones_revision.md).

## 1. Evaluación de la observación

La ausencia de un procedimiento de salida y eliminación es un hueco real del plan.
La historia operativa necesita integridad, pero eso no autoriza conservar indefinidamente datos personales.
Tampoco corresponde interpretar que cualquier baja comercial exige borrar inmediatamente toda la base institucional, sin instrucciones ni revisión de obligaciones aplicables.
Hay que distinguir baja de un usuario, solicitud individual de eliminación, desactivación de un módulo y terminación del encargo.
Cada una tiene alcance, autorizaciones y efectos diferentes; ninguna borra tablas compartidas por otras instituciones.

No se fija una gracia general de 30 o 90 días después de terminar el encargo.
El plazo de devolución/eliminación debe respetar la norma aplicable, y la exportación se prepara antes del cierre cuando sea posible.
Una copia cifrada, un archivo oculto o un usuario desactivado siguen pudiendo contener datos personales.

## 2. Base normativa revisada

| Fuente oficial | Consecuencia relevante |
|---|---|
| [LOPDP, arts. 10.i, 15 y 18](https://www.telecomunicaciones.gob.ec/wp-content/uploads/2023/11/LOPDP-LEXIS.pdf) | Conservación limitada a la finalidad; eliminación con supuestos y excepciones, entre ellas obligaciones legales y reclamaciones. El art. 15 establece quince días para la solicitud al responsable. |
| [LOPDP, art. 34](https://www.telecomunicaciones.gob.ec/wp-content/uploads/2023/11/LOPDP-LEXIS.pdf) | El encargo necesita contrato e instrucciones; al concluir la prestación corresponde devolución o destrucción. |
| [Reglamento General, arts. 8–11 y 41–46](https://www.gob.ec/sites/default/files/regulations/2025-01/02%20Reglamento%20General%20a%20la%20Ley%20Org%C3%A1nica%20de%20Protecci%C3%B3n%20de%20Datos%20Personales_0.pdf) | Revisar retención; documentar encargo y subcontratación; asistir en derechos; contemplar todas las copias al terminar, salvo obligación legal de conservar. |
| [Resolución SPDP-SPD-2025-0030-R, arts. 23–24](https://spdp.gob.ec/wp-content/uploads/2025/08/0030-R.pdf) | El encargado ejecuta la eliminación comunicada en el término de tres días; al terminar la relación, devuelve o elimina en el término de cinco días y entrega constancia. |
| [Resolución SPDP-SPD-2026-0004-R, art. 23](https://spdp.gob.ec/wp-content/uploads/2026/01/04.01.01-SPSP-SPD-2026-0004-R-Norma-general-de-transferencias-signed.pdf), y [consultas oficiales SPDP de 2026](https://spdp.gob.ec/consultas2026/) | Un encargo no es una transferencia por el solo hecho de usar un proveedor extranjero. Importa la relación jurídica y el tratamiento realizado. |

La resolución de 2025 condiciona la conservación ulterior por el encargado a una base legitimadora y excluye el interés legítimo en ese supuesto. [Resolución SPDP-SPD-2025-0030-R, art. 24](https://spdp.gob.ec/wp-content/uploads/2025/08/0030-R.pdf).
Mantener la distinción normativa entre «plazo» y «término»; validar el cómputo aplicable, el hecho que lo inicia y las excepciones concretas.
No convertir los plazos anteriores en una demora permitida para atender todas las solicitudes: cada procedimiento tiene su propio supuesto.
Las fuentes se enlazan junto a cada criterio y se recopilan al final para revisar su aplicación antes del piloto.

## 3. Entidad contratante, espacio y responsable

Decisión confirmada: cada contratación institucional o departamental independiente dispone de un espacio aislado, con propietario y miembros propios. Una misma entidad jurídica puede agrupar varios espacios; renovar el contrato de un espacio no crea otro tenant.
La arquitectura distingue estos conceptos sin exigir consolas distintas ni un sistema de facturación completo:

| Concepto | Significado |
|---|---|
| Entidad jurídica | Parte capaz de contratar y asumir obligaciones; puede ser la universidad, no necesariamente su departamento. |
| Organización o tenant | Espacio con aislamiento de datos, administración, miembros y configuración propios. |
| Contrato o suscripción | Alcance contratado, módulos, vigencia y condiciones económicas de un espacio. |
| Propietario del espacio | Membresía única y transferible que gobierna el acceso y delega administración; no es titular de los datos personales ni representante jurídico por ese solo rol. |
| Responsable del tratamiento | Quien determina fines y medios para un tratamiento concreto; debe identificarse contractualmente. |

Una entidad puede tener varios espacios aislados y contratos asociados, sin inventario, reservas ni informes compartidos por defecto.
Dos contratos departamentales no implican por sí solos dos responsables distintos ni acceso mutuo a sus datos.
Los módulos se contratan por espacio, sin licencias por unidad interna en la primera versión. Compartir universidad o identidad de usuario no autoriza compartir datos entre espacios.
Antes del primer alta real, registrar entidad contratante, espacio, contacto autorizado e instrucciones de tratamiento.
T-02 implementa esta separación; cualquier futura consolidación de espacios exige migración y conciliación explícitas.

Para los datos operativos del cliente, PlatLab se propone como encargado que actúa siguiendo instrucciones.
Para finalidades propias del proveedor —por ejemplo, facturación o administración de su relación comercial— podría actuar como responsable.
Esa clasificación se valida por tratamiento, no se asigna universalmente a una empresa ni a una tabla.
Los datos de una persona que pertenece a varios espacios requieren analizar cada relación por separado. [LOPDP, art. 34](https://www.telecomunicaciones.gob.ec/wp-content/uploads/2023/11/LOPDP-LEXIS.pdf).

## 4. Contrato de encargo y proveedores

Preparar el contrato antes de introducir datos reales. Este plan define requisitos, no aporta un modelo legal definitivo.
Debe concretar objeto, duración, finalidades, categorías de datos y titulares, instrucciones, responsabilidades y medidas de seguridad.
Incluir asistencia en derechos, tratamiento de incidentes, acceso de soporte, subencargados, revisión de medidas y procedimiento de salida.
Identificar quién puede ordenar una exportación o eliminación en representación de la institución.
El propietario y los administradores funcionales no se presumen representantes jurídicos ni autorizados para terminar el contrato u ordenar una purga total; esa facultad debe verificarse por separado. [LOPDP, art. 34](https://www.telecomunicaciones.gob.ec/wp-content/uploads/2023/11/LOPDP-LEXIS.pdf).

Inventariar Supabase, Render, Cloudflare, correo, observabilidad y cualquier servicio que reciba datos personales.
Para cada uno, registrar servicio, finalidades, datos recibidos, ubicaciones, rol jurídico, subcontratación y condiciones de devolución/eliminación.
No basta con indicar la región de PostgreSQL: archivos, correo, logs y copias pueden seguir rutas diferentes.
Un proveedor extranjero puede ser subencargado para un servicio y responsable para finalidades propias; revisar sus términos efectivos.
La clasificación como encargo no elimina las obligaciones de seguridad, transparencia, contrato ni control de subcontratación. [Reglamento General, arts. 41–46](https://www.gob.ec/sites/default/files/regulations/2025-01/02%20Reglamento%20General%20a%20la%20Ley%20Org%C3%A1nica%20de%20Protecci%C3%B3n%20de%20Datos%20Personales_0.pdf) y [Resolución SPDP-SPD-2026-0004-R, art. 23](https://spdp.gob.ec/wp-content/uploads/2026/01/04.01.01-SPSP-SPD-2026-0004-R-Norma-general-de-transferencias-signed.pdf).

No aceptar contratos ni prometer retenciones/eliminaciones incompatibles con las capacidades comprobadas de los proveedores.
Si existe incompatibilidad, ajustar condiciones lícitas, proveedor o infraestructura antes del uso productivo; no declararla resuelta con una cláusula genérica.

## 5. Estados comerciales y acceso

`core.organizations.status` representa el ciclo operativo del espacio, separado de los estados de módulos.

| Estado | Acceso propuesto |
|---|---|
| `provisioning` | Alta incompleta: metadatos de contratación e invitación del propietario inicial; sin acceso al dominio ni carga de datos operativos. |
| `trial` | Operación limitada por el paquete y las cuotas de prueba; usar datos sintéticos hasta completar las condiciones de tratamiento real. |
| `active` | Operación según membresía, permisos, ámbito, cuotas y módulos vigentes. |
| `suspended` | Restricción reversible con motivo registrado; su alcance depende de si es comercial, contractual o de seguridad. |
| `closing` | Sin compromisos nuevos; conciliación, consultas y exportación autorizadas durante una transición documentada. |
| `terminated` | Sin acceso operativo al dominio; solo procedimiento de disposición y actuaciones expresamente justificadas. |

Transiciones habituales: `provisioning → trial/active`, `trial → active`, `trial/active → suspended`, `suspended → trial/active`, `trial/active/suspended → closing → terminated`. Reanudar recupera el estado previo permitido por el contrato y vigencia; retirar una suspensión no convierte una prueba en contratación activa.
Pasar desde `provisioning` exige que el propietario invitado haya aceptado y tenga membresía activa del mismo espacio. El canje y la asignación se confirman atómicamente; reintentar el alta no crea espacios o propietarios duplicados. Correo y autenticación externa se coordinan con reintentos, sin suponer una transacción compartida con esos servicios.
Un alta abandonada puede pasar de `provisioning` a `terminated`; revocar su invitación y disponer los datos personales de preparación según la política aplicable.
Una terminación excepcional puede omitir `closing`; no debe depender de que el cliente vuelva a conectarse.
Reactivar antes de la eliminación exige revisar contrato y módulos. Una purga completada no se revierte activando el espacio.
Las pruebas expiradas también necesitan disposición de sus datos; el estado `trial` no exime obligaciones.

Cada cambio registra motivo, actor autorizado, fecha efectiva y referencia contractual o de seguridad.
Guardar por separado la fecha de vencimiento comercial, la fecha programada de cierre y el fin efectivo del encargo.
No alterar esas fechas para aparentar cumplimiento ni prolongar artificialmente una relación finalizada.
Una suspensión de seguridad puede impedir también exportaciones; establecer un canal seguro para el representante autorizado.
La suspensión por impago no constituye una orden de eliminación y no elimina el deber de atender derechos.

La API comprueba el estado institucional en cada petición y el worker antes de nuevos efectos relevantes.
Un JWT válido no restaura permisos: se verifica membresía vigente y estado del espacio dentro del contexto autorizado.
Revocar invitaciones, concesiones y trabajos pendientes según su finalidad; una notificación sobre un hecho confirmado puede requerir tratamiento distinto de una nueva exportación.
Usar enlaces de descarga breves: suspender una membresía no necesariamente revoca un enlace firmado que ya fue emitido.

## 6. Salida, exportación y disposición

La disposición se modela como un trabajo independiente del estado comercial.
Estados propuestos: `pending`, `exporting`, `deletion_pending`, `deleting`, `retained_exception`, `completed`.
`completed` significa que se verificaron las actuaciones exigidas; no equivale automáticamente a «todos los datos fueron borrados».
Registrar el resultado por repositorio y categoría: devuelto, eliminado, anonimizado o conservado con excepción identificada.
Si se muestra la etiqueta `deleted`, reservarla para el alcance cuya eliminación efectiva quedó comprobada.

El expediente incluye espacio, solicitante autorizado, instrucciones, alcance, fundamento, fechas límite, responsables y evidencias mínimas.
Una excepción de conservación identifica datos concretos, base aplicable, acceso permitido, revisión y finalización; no retiene todo el tenant por comodidad.
Una reclamación o mandato puede impedir parte de una purga; registrar la limitación y continuar con el resto cuando corresponda.

Secuencia propuesta para una salida programada:

1. Registrar el cierre, las instrucciones del responsable y el procedimiento de devolución/eliminación aplicable.
2. Bloquear nuevos compromisos y resolver reservas, entregas y custodias durante la transición autorizada.
3. Preparar y entregar la exportación final antes del fin del encargo cuando sea posible.
4. Al terminar, revocar acceso operativo y ejecutar disposición dentro del término aplicable, con seguimiento de cada repositorio.
5. Verificar el resultado, entregar constancia y mantener solo las evidencias mínimas que cuenten con fundamento de conservación.

La transición no debe condicionar indefinidamente la salida a que desaparezca todo pendiente operativo.
Si quedan pendientes, acordar entrega de su estado y documentar su tratamiento; no inventar movimientos de cierre.

Exportación propuesta: CSV/JSON legibles, diccionario de campos, relaciones mediante IDs y archivos originales pertinentes.
Acompañar manifiesto de rutas, tamaños y hashes; probar que la institución puede abrir y reconstruir la información entregada.
Excluir credenciales, sesiones, tokens, secretos y datos de otros espacios.
Autorizar al destinatario, proteger la entrega y registrar su ejecución. La copia exportada también entra en el procedimiento de disposición.
Una URL vencida no prueba destrucción del archivo; la confirmación de descarga tampoco autoriza retener otras copias indefinidamente.
No equiparar la exportación contractual completa con el derecho individual a la portabilidad: alcance y legitimación difieren.

## 7. Derechos individuales y autoría histórica

Una baja de membresía retira acceso; una solicitud de eliminación inicia un expediente y una evaluación de su alcance.
Verificar identidad o representación, localizar datos y comunicar la solicitud al responsable que corresponda.
El encargado asiste y ejecuta instrucciones lícitas; no elimina la historia de toda una institución porque una persona abandone su puesto.
Cuando PlatLab sea responsable para una finalidad propia, debe atender esa parte con su procedimiento correspondiente.

Mantener autoría histórica no obliga a duplicar nombres, emails o identificaciones en movimientos y snapshots.
Preferir referencias a un principal institucional; minimizar campos personales en auditoría y textos libres desde el diseño.
Cuando proceda eliminar o anonimizar, revisar vínculos, documentos, texto libre, instantáneas y combinaciones que permitan reidentificación.
Sustituir un nombre por un UUID enlazable es seudonimización, no garantiza anonimización.
La evaluación de eliminación y anonimización sigue los supuestos, excepciones y requisitos aplicables. [LOPDP, arts. 15 y 18](https://www.telecomunicaciones.gob.ec/wp-content/uploads/2023/11/LOPDP-LEXIS.pdf) y [Resolución SPDP-SPD-2025-0030-R](https://spdp.gob.ec/wp-content/uploads/2025/08/0030-R.pdf).

No borrar automáticamente la identidad global ni Supabase Auth por cerrar un tenant: puede seguir siendo necesaria para otros espacios.
Separar la revocación de la membresía local, la eliminación de sus datos y la eventual supresión de la cuenta global.
Resolver las FKs históricas mediante el procedimiento aprobado, preservando integridad y sin atribuir acciones a otra persona.
Una obligación válida de conservación necesita alcance, fundamento y fecha de revisión; «para auditoría» no es una justificación suficiente por sí sola.

Si quien solicita la baja es el propietario, tramitar transferencia aceptada, recuperación institucional verificada o cierre del espacio. La restricción operativa contra dejar un espacio activo sin propietario no puede bloquear indefinidamente la atención de derechos ni justificar conservar todos sus datos. Separar continuidad del servicio, verificación de representación y disposición de datos; suspender acceso cuando corresponda mientras se resuelve la continuidad. Registrar la decisión y atender el procedimiento dentro del plazo o término aplicable, sin exigir que la persona encuentre por sí sola un sucesor. [LOPDP, arts. 15 y 18](https://www.telecomunicaciones.gob.ec/wp-content/uploads/2023/11/LOPDP-LEXIS.pdf).

## 8. Inmutabilidad, privilegios y evidencia

La aplicación ordinaria no edita ni borra asientos confirmados; las correcciones operativas se hacen con nuevos registros.
La eliminación por protección de datos usa un procedimiento privilegiado distinto, con alcance explícito, verificación y evidencia.
Esto también aplica a auditoría: inmutabilidad ante usuarios operativos no significa inmunidad a las obligaciones de eliminación.
No añadir a una constancia los mismos datos personales que se pretende eliminar.

El operador de licencias no obtiene acceso automático al contenido institucional.
Separar permiso de administrar paquetes, permiso de ejecutar una exportación autorizada y permiso de disposición.
Las ejecuciones destructivas verifican espacio, instrucciones, alcance, excepciones y credencial operadora reforzada antes de comenzar.
Un trabajo de purga debe ser idempotente, reanudable y mostrar fallos parciales; no marcar éxito por el simple inicio de una cola.
Conservar evidencia mínima del procedimiento con su propia política de acceso y retención.

## 9. Copias, restauraciones y límite de los proveedores

El plan original propone copias externas por 30 días. Es una hipótesis operativa, no una excepción legal a la eliminación.
Las copias de PostgreSQL compartido, Storage, Auth y los servicios externos requieren verificación expresa antes del piloto.
No afirmar que siete días de snapshots del proveedor o treinta días de R2 son automáticamente compatibles con cualquier solicitud o terminación.
No se identificó en las fuentes revisadas una excepción general para conservar toda copia solo por llamarla respaldo.

R2 puede servir como destino externo; cifrar objetos o impedir su borrado a la aplicación no demuestra que ya no sean recuperables.
Mantener credenciales de backup separadas y privilegios mínimos. Evaluar cualquier bloqueo irrevocable de retención frente a las obligaciones de disposición.
Comprobar si el proveedor permite eliminación selectiva, qué conserva tras borrar un objeto/proyecto y qué constancia puede entregar.
No prometer borrado criptográfico por tenant sin demostrar que las claves y todas las copias relevantes quedan efectivamente inutilizables.

Diseñar un registro mínimo y protegido de eliminaciones que no dependa únicamente del snapshot restaurado.
Antes de abrir una restauración a usuarios o integraciones, reaplicar disposiciones posteriores al backup y validar el resultado.
Así se evita reintroducir datos eliminados; este mecanismo no justifica por sí solo conservar la copia antigua.
El registro también necesita minimización, acceso restringido y retención fundamentada; sus IDs podrían seguir siendo datos personales.
Recuperar un solo cliente mediante una restauración aislada; nunca restaurar toda producción para deshacer una eliminación individual.

El spike debe concluir con una matriz de capacidades, plazos y obligaciones por proveedor.
Una incompatibilidad no resuelta bloquea introducir datos reales bajo esas condiciones, aunque la aplicación funcione técnicamente.
Las alternativas son cambiar capacidades o proveedor, segmentar cuando esté justificado o ajustar lícitamente el servicio acordado; no declarar cumplimiento sin evidencia.

## 10. Entrega mínima y comprobación

Antes del piloto: contrato validado, inventario de proveedores, estados institucionales, canal de derechos y exportación por tenant.
Incluir procedimiento operable de disposición y evidencias, aunque su ejecución inicial use herramientas internas sin una consola completa.
Revisar retención por categorías: identidad/membresía, operación, documento, auditoría, logs, outbox, exportación, backup y facturación propia.
Definir para cada categoría finalidad, responsable, plazo o criterio, excepción y acción final; no imponer un único plazo universal.

Ensayar al menos con datos sintéticos:

- Cierre de un espacio sin afectar a otro ni a una identidad compartida.
- Alta que no habilita operación hasta aceptar la propiedad; reintento y abandono de la invitación inicial.
- Baja o solicitud de eliminación del propietario, con continuidad o cierre verificados y atención de derechos sin espera indefinida.
- Solicitud individual con datos en tablas, archivos, cola y auditoría; comprobar resultado y excepciones justificadas.
- Reintento tras un fallo parcial de purga, sin duplicar efectos ni perder la evidencia.
- Restauración de un backup anterior a una eliminación, reaplicándola antes de habilitar acceso.
- Exportación y eliminación con comprobaciones de bytes y referencias, incluyendo copias externas aplicables.

## 11. Fuentes oficiales consultadas

- [LOPDP — copia publicada por el Ministerio de Telecomunicaciones](https://www.telecomunicaciones.gob.ec/wp-content/uploads/2023/11/LOPDP-LEXIS.pdf): arts. 10, 15, 18 y 34.
- [Reglamento General — portal gubernamental](https://www.gob.ec/sites/default/files/regulations/2025-01/02%20Reglamento%20General%20a%20la%20Ley%20Org%C3%A1nica%20de%20Protecci%C3%B3n%20de%20Datos%20Personales_0.pdf): arts. 8–11 y 41–46.
- [Resolución SPDP-SPD-2025-0030-R](https://spdp.gob.ec/wp-content/uploads/2025/08/0030-R.pdf): arts. 3, 5, 8 y 19–24; anonimización, eliminación y finalización del encargo.
- [Resolución SPDP-SPD-2026-0004-R](https://spdp.gob.ec/wp-content/uploads/2026/01/04.01.01-SPSP-SPD-2026-0004-R-Norma-general-de-transferencias-signed.pdf): art. 23, encargo y transferencias.
- [Consultas oficiales SPDP 2026](https://spdp.gob.ec/consultas2026/): criterio relativo al oficio SPDP-IRD-2026-0300-O sobre encargados ubicados en el extranjero.

Los estados, tablas y procedimientos son propuestas técnicas. La institución y su asesoría deben validar finalidades, bases, representación, conservación y contrato antes de operar datos reales.
