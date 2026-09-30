# Roadmap y plan de acción

Revisión: 29 de septiembre de 2026. Estado: plan de implementación; todavía no existe software implementado ni desplegado. El orden se define por dependencias y evidencia, sin estimaciones de fechas u horas.

Este documento es la autoridad de fases, puertas y dependencias. Las decisiones técnicas están en [ADRs](../adr/README.md), la oferta en [producto y paquetes](09_producto_y_paquetes.md) y el primer trabajo concreto en [primer incremento](../desarrollo/primer_incremento.md).

Confirmado por el usuario: existe un laboratorio interesado en los ocho módulos, acepta probar por entregas y necesita sustancias fiscalizadas desde el piloto. Cuenta con calificación, responsable y reportes actuales. Mantener el producto completo como destino; el incremento de inventario es el primer recorrido, no todo lo ofrecido. REG-01 verifica el proceso y evidencia concretos con ese responsable.

## 1. Dos líneas de trabajo y tres puertas

La primera demostración debe permitir registrar y consultar movimientos de un reactivo. No necesita esperar a completar toda la operación comercial del SaaS. El aislamiento, autorización y atomicidad sí forman parte de ese primer recorrido.

| Fase | Resultado verificable | Dependencia |
|---|---|---|
| F0 | Casos, muestras y límites del alcance; riesgos que condicionan al primer cliente | Decisiones de espacios y producto ya registradas; ampliar validación mientras avanza la demo |
| F1a + R-00 | Core mínimo y recorrido vertical de Reactivos: catálogo, lote, entrada y salida | Convenciones del modelo y un ejemplo sintético completo |
| F1b | Operación SaaS: incorporación real, consola, cuotas, recuperación y salida | Core de F1a; avanza en paralelo con F2 |
| F2 | Reactivos y Equipos utilizables por separado y combinados | Cada entrega usa la parte de F1a/F1b que necesita; no espera a terminar toda F1b para desarrollarse |
| F3 | Laboratorios y Prácticas; docentes, tesistas y actividades de investigación | Core y agenda; integrar inventarios publicados y repetir la puerta de piloto para este alcance |
| F4 | Materiales, préstamos y transferencias ampliadas | Core; Prácticas solo para su integración |
| F5 | Mantenimiento, indicadores y alertas avanzadas | Equipos para M7; fuentes operativas suficientes para M8 |

R-00 es el primer tramo de Reactivos dentro de F1a, no un noveno módulo ni un paquete vendible. Laboratorios permanece en F3. Materiales puede operar sin Prácticas y Mantenimiento sin Laboratorios: el orden de desarrollo no añade dependencias comerciales.

| Puerta | Qué permite | Evidencia mínima |
|---|---|---|
| G0 — Demo sintética | Mostrar el flujo, recibir comentarios y corregir el producto | F1a + R-00; dos espacios aislados, roles y módulos efectivos, cantidades exactas, auditoría, idempotencia y concurrencia probadas |
| G1 — Piloto con datos reales | Incorporar clientes seleccionados con alcance y acompañamiento acordados; también aplica a una prueba gratuita con datos reales | Primero autorizar carga controlada con garantías de datos y funcionalidad comprobadas; después conciliar y aceptar el inventario para habilitar operación |
| G2 — Venta abierta | Ofrecer A: Reactivos, B: Equipos y ambos a varios clientes | G1, validación de las tres combinaciones, incorporación repetible, transferencia de propiedad disponible, documentación, soporte y capacidad/costos comprobados |

El cliente acepta un piloto por entregas. Para su primer alcance, Reactivos con trazabilidad de fiscalizados es obligatorio: REG-01 y REG-02 forman parte de G1; Agenda/Prácticas se incorporan después. G2 habilita venta de los paquetes disponibles, no equivale a entrega de los ocho módulos al cliente interesado. Cada módulo repite las verificaciones afectadas antes de usar datos reales.

## 2. F0 — Validar lo que afecta al siguiente incremento

- Confirmar un caso de universidad y otro de departamento/empresa con operación independiente. Titular jurídico, espacio y ubicación siguen siendo conceptos separados.
- Observar una entrada/salida de reactivo y una incidencia de equipo; recoger muestras anonimizadas, unidades, lotes, ubicaciones y evidencia requerida.
- Validar quién gestiona sustancias catalogadas sujetas a fiscalización, código y alcance de la calificación, sitios cubiertos, responsable, cupo y formato vigente del reporte. Pedir una muestra anonimizada y consultar la [calificación para manejo de sustancias del Ministerio del Interior](https://www.gob.ec/mdi/tramites/aprobacion-calificacion-manejo-sustancias-catalogadas-sujetas-fiscalizacion). Comprobar si varios espacios necesitan una consolidación institucional; compartir titular no autoriza lecturas cruzadas. No prometer un reporte oficial o cumplimiento automático porque otro sistema lo ofrezca.
- El perfil de fiscalizados es obligatorio para este piloto. REG-01 concreta trazabilidad por envase/apertura, custodia, consumo, retorno y reporte; REG-02 implementa y demuestra los requisitos resultantes. La demo usa ejemplos sintéticos y no certifica el perfil regulado. No retirar fiscalizados del piloto para evitar esas tareas.
- Validar los paquetes, límites de servicio y prototipo con tareas concretas. No definir precio definitivo solo a partir del hosting ni cobrar docentes como una forma indirecta de limitar adopción.
- Medir conectividad, tolerancia a interrupciones y aceptación de nube compartida. La región se elige con evidencia del spike.
- Concretar responsable y participación del laboratorio interesado; durante F2 trabajar con él u otro colaborador en el diseño de Prácticas.

Las decisiones consultadas están resueltas: piloto por entregas, perfil fiscalizado obligatorio y aprobación condicionada con asignación del laboratorio a cargo del técnico. Falta comprobar evidencia y reglas específicas del proceso, no decidir otra vez estas preferencias. Las validaciones tienen tareas propias y no bloquean G0.

F0 no exige decidir todas las políticas de F3–F5. Para empezar R-00 basta un caso sintético consistente, exclusiones explícitas y las invariantes ya fijadas.

## 3. F1a + R-00 — Una demostración funcional segura

Entregables:

1. Monorepo, TypeScript, API, interfaz mínima, migraciones SQL y CI. Verificar límites de dependencias con dependency-cruiser.
2. Espacios, identidades, membresías, propietario singular, ubicaciones y roles predefinidos con alcances. Usar Auth local y usuarios sintéticos para la demo. Un espacio operativo siempre tiene propietario activo; no se implementan unidades administrativas.
3. RLS, FKs compuestas y roles SQL de runtime sin propiedad ni BYPASSRLS. Verificación de JWT y contexto transaccional según [identidad](../adr/0004_identidad_y_operacion.md) y [SQL/pruebas](../adr/0006_sql_y_pruebas.md).
4. Derechos de módulo mínimos, generados por el comando de aplicación de contrato/revisión. Los fixtures usan ese mismo recorrido; no se crea una segunda forma de habilitar módulos editando tablas. El flujo comercial y su consola se completan en F1b.
5. Auditoría e idempotencia para el primer movimiento. Catálogo, lote, ubicación, entrada y salida manual autorizada, saldo e historial como recorrido completo.
6. Interfaz para seleccionar espacio, localizar el reactivo y registrar el movimiento. Mantener el diseño del producto sin construir todavía todos los menús futuros.

Criterios de G0:

- A y B contienen información distinta; alterar espacio, actor o recurso no cruza el aislamiento. Una identidad puede pertenecer a ambos con permisos diferentes.
- Propietario y administrador no obtienen automáticamente permiso para ajustar stock; delegación y ejecución se comprueban por separado. Membresía revocada y módulo no habilitado impiden operaciones nuevas.
- Catálogo/lote/movimiento usan cantidades exactas; no hay edición directa del saldo como sustituto del ledger.
- Dos salidas simultáneas de 60 g sobre 100 g dejan una sola salida confirmada y 40 g disponibles.
- Reintentar la misma operación devuelve su resultado sin duplicar saldo, asientos ni auditoría; reutilizar la clave con otro contenido se rechaza.
- El mismo cliente PostgreSQL mantiene contexto, validaciones, saldo, asientos, auditoría e idempotencia dentro de la transacción. El pool no conserva el contexto del usuario anterior.
- Migraciones, tipos PgTyped, pruebas pgTAP y pruebas API/concurrencia pasan sobre PostgreSQL real.

La demo puede ser local; si se publica, usa un ambiente restringido con datos sintéticos. SMTP real, consola completa, documentos, transferencia de propiedad en interfaz y restauración completa no bloquean G0. No se permite introducir datos reales para “probar un momento” sin la autorización de carga controlada de G1.

## 4. F1b — Operar el SaaS, en paralelo con F2

Entregables requeridos antes de G1:

- Spike y ambientes separados; secretos, conectividad/TLS, región y costos medidos. Desarrollo y previews no usan producción.
- Alta en provisioning, invitación y aceptación del propietario, correo real verificado, recuperación de acceso y revocación. Invitación y Auth no dejan espacios activos huérfanos ni duplican identidades/membresías.
- Consola de operador en aplicación y dominio separados, manteniendo la API del mismo monolito. Exigir autorización operadora y MFA en la API, no solo en la interfaz; [ADR de identidad y operación](../adr/0004_identidad_y_operacion.md).
- Paquetes versionados, contratos/revisiones y aplicación atómica de derechos y límites. Aplicar vigencia en cada operación; no depender de un cron para rechazar nuevos compromisos. [Autoridad contractual](../adr/0002_contratos_y_derechos.md).
- Límites HTTP en memoria con una API, separados por clases de operación; cuotas exactas de archivos, miembros y trabajos en PostgreSQL. No construir contadores HTTP en PostgreSQL. Preparar el cambio a almacén compartido antes de varias réplicas; valores y refresco viven en [ADR 0003](../adr/0003_refresco_y_limites.md).
- Documentos privados, outbox y worker cuando el alcance los use; autorización, reintentos, reservas de cuota y límites entre espacios.
- Observabilidad, alertas y diagnóstico de trabajos; soporte ordinario sin acceso implícito al dominio. Acceso privilegiado de infraestructura con identidad, MFA, motivo y registro conforme al procedimiento de operación.
- Acuerdo e instrucciones de tratamiento, proveedores y salida validados; exportación final, retenciones justificadas y supresión ensayadas para el módulo publicado. La prueba real tiene responsable y finalidad igual que el cliente de pago.
- Copias de base y bytes de archivos en destino independiente; restauración aislada comprobada y tratamiento de supresiones anteriores. La duración de las copias se valida con [ciclo de datos](08_ciclo_cliente_y_datos.md), no se deduce de una equivalencia informal entre días hábiles y naturales.
- Procedimiento de transferencia/recuperación de propiedad con verificación y aceptación del sucesor, validación transaccional y auditoría. Antes de G1 puede ser asistido y usar un comando administrativo controlado; nunca SQL improvisado ni credenciales compartidas.

Antes de G2 se añade la interfaz de transferencia de propiedad y su prueba concurrente con baja/revocación del sucesor. El procedimiento asistido no autoriza cambiar propietario por solicitud informal ni confunde administración de cuenta con representación legal para borrar datos.

No desarrollar pasarela de pago, portal público de compra, permisos arbitrarios ni soporte mediante impersonación en esta entrega. La transición automática a draining y support_grants siguen diferidas. La admisión de operaciones y las obligaciones abiertas se controlan desde el primer módulo publicado.

## 5. F2 — Paquetes utilizables y piloto controlado

**Reactivos (A):** ampliar R-00 con importación y conciliación, ajuste/conteo con motivo, cuarentena, caducidad, mínimos, SDS privada y traslados básicos. Operar por lote solo cuando el proceso lo admita; incorporar envases antes del cliente que los necesite. Una ubicación no se cambia para simular una entrega.

**Fiscalizados del piloto:** REG-01 valida el perfil con el responsable; REG-02 añade evidencia de autorización/sitios/cupos, datos de movimientos y reporte revisable del periodo, según [modelo regulatorio](03_dominio_y_datos.md#perfil-de-sustancias-fiscalizadas-del-piloto). Si el flujo entrega a docentes y recibe sobrantes, adelantar custodia, consumo y retornos químicos independientes de Prácticas; no registrar entrega como consumo. Estos controles pertenecen a Reactivos, sin exigir M8.

**Equipos (B):** catálogo de activos, ubicación, condición, custodio, importación, documentos e incidencias. La capacidad incidents tiene esquema propio; no es parte obligatoria del primer Core. La condición actual utilizable no equivale a disponibilidad futura por horario.

**Compartido:** inicio por paquete, búsqueda autorizada, marca institucional, exportación utilizable con archivos/manifiesto, desactivación con resolución de pendientes y procedimientos de incorporación/salida. Alinear la oferta publicada con lo disponible y obtener un colaborador para Prácticas, sin convertir su participación en requisito para vender inventarios.

G1 se comprueba sobre el módulo y alcance que usará el piloto. Tiene dos comprobaciones consecutivas dentro de la misma puerta; ninguna permite importar datos reales sin las garantías previas.

**Autorizar carga controlada:** antes de recibir datos reales, demostrar con casos sintéticos o anonimizados el recorrido funcional y regulatorio, además de seguridad, identidad, contrato, proveedores, cuotas, operador, propiedad, recuperación y disposición. Registrar evidencia, alcance y responsables; permitir únicamente carga inicial, conciliación, consulta y corrección autorizadas en el ambiente previsto. No habilitar movimientos de operación cotidiana todavía.

**Habilitar operación:** tras importar y conciliar, verificar la lista siguiente y obtener aceptación del responsable. Registrar ambos hitos separadamente; no exigir un inventario real ya cargado como condición para autorizar su primera carga.

- Cliente y responsables identificados; contrato/instrucciones, alcance, cupos y salida claros.
- Inventario inicial conciliado y flujo completo validado, incluida corrección por movimientos compensatorios.
- Accesos, archivos, exportaciones y trabajos respetan espacio, rol y ubicación.
- Restauración y salida verificadas con ese esquema y sus archivos; otros espacios permanecen intactos.
- Operador, alertas, correo, cuotas y procedimiento de propiedad disponibles.
- REG-01 y REG-02 aceptadas para el cliente confirmado: periodo conciliado, operaciones diferenciadas, reglas/formato vigentes verificados y responsable de revisión. Una exportación genérica no cierra esta condición.
- Caso de prueba regulatorio: 100 g iniciales + 20 g recibidos, 30 g entregados a custodia, 25 g consumidos y 5 g retornados dejan 95 g institucionales. El retorno se segrega hasta verificar aptitud; el reporte no suma entrega y consumo como si ambos fueran consumo.
- Si calificación/cupo/reporte cubren varios espacios u otros sistemas, comprobar consolidación y evitar doble conteo de traslados. No afirmar control global de un cupo que el sistema solo conoce parcialmente.

G2 añade:

1. A funciona solo con Reactivos; B solo con Equipos; C con ambos. Activar el segundo módulo reutiliza usuarios y ubicaciones.
2. Importaciones repetidas no duplican movimientos; la conciliación muestra errores sin inventar datos.
3. Dos espacios progresan con trabajos pesados simultáneos sin monopolizar ejecución ni exceder cuotas.
4. Alta, cambios de paquete, transferencia de propiedad y cierre son repetibles y auditables.
5. Usuarios completan tareas sin intervención constante del desarrollador; soporte, incorporación y exclusiones están documentados.
6. Capacidad y presupuesto se han medido con el perfil de uso acordado; no se anuncia un SLA no demostrado.

G2 es el MVP de venta abierta. La proforma histórica no obliga a adelantar Laboratorios.

## 6. F3 — Agenda, docentes y Prácticas

Entregables:

- Laboratorios, capacidad, horarios, preparación/limpieza, excepciones y agenda. Las reservas directas y las de Prácticas comparten el motor de conflictos.
- Actividades de docencia e investigación, plantillas/revisiones y responsables; docentes y tesistas solicitan dentro de su ámbito.
- El docente propone desde plantilla fecha/franja, equipos, materiales y reactivos. El sistema sugiere candidatos; el técnico asigna la sala y confirma. Reubicar significa otra sala del mismo workspace, sin mover automáticamente existencias ni cambiar de institución.
- Invitaciones CSV con vista previa, deduplicación, delegación controlada y envío limitado. Añadir Google/Microsoft OAuth conforme al ADR de identidad; no confundir autenticación con membresía ni confirmar correos sin evidencia verificada.
- Catálogo solicitante con campos mínimos; una solicitud propia no concede edición de inventario ni datos privados de otros profesores.
- Envío, cambios, propuesta técnica, aceptación, aprobación, preparación, ejecución, cierre y cancelación. La [aprobación condicionada](../adr/0007_aprobacion_condicionada.md) está aceptada: aceptar una revisión preautorizada confirma y reserva si siguen vigentes todos los requisitos; ante una excepción, pasa a revisión técnica sin reservas parciales. La asignación inicial que respeta la solicitud puede confirmarse por el técnico sin otra aceptación.
- Integración opcional con Reactivos/Equipos, reutilizando la custodia, consumo y devolución que el piloto regulado haya requerido en F2. Vincular esos hechos a actividades; no duplicar su ledger. Las partidas de retorno se introducen cuando se necesiten y no mezclan sobrantes manipulados con existencias aptas.
- Panel técnico con refresco definido en el ADR 0003; avisos por outbox. Imprimible HTML autorizado, CSS de impresión, logo y revisión identificada; guardar PDF desde el navegador inicialmente.

Criterios de aceptación:

- Dos aprobaciones incompatibles por horario, activo o cantidad no se confirman juntas; un docente nunca obtiene aprobación por cambiar su rol en la petición.
- Aceptación/rechazo corresponde a una revisión concreta. La propuesta no promete reserva; conservar reservas vigentes de una actividad mientras se negocia una sustitución y reemplazarlas conjuntamente al confirmar.
- Una reubicación equivalente respeta fecha/franja, recursos y condiciones, se audita y notifica. Si modifica condiciones aceptadas o es incierta su equivalencia, requiere propuesta y aceptación. El docente no puede imponer el laboratorio cambiando el payload.
- Cancelar antes de entregar libera reservas; cancelar después conserva las obligaciones de custodia/consumo/devolución. Vencer una propuesta no libera la reserva vigente.
- Entregar 20 g, consumir 17 g y devolver 3 g mantiene cantidades y procedencia; los 3 g no vuelven a disponible sin verificación.
- Revocar al solicitante, técnico preautorizante o responsable académico impide nuevos compromisos según su política y permite resolver pendientes mediante personal autorizado.
- Invitación repetida, cuenta existente y pertenencia a A/B no duplican acceso ni mezclan recursos. Se prueban correos y proveedores OAuth realmente usados.
- Se verifican Core + Laboratorios, esa combinación + Prácticas y las integraciones con cada inventario habilitado.

Antes del piloto de prácticas, repetir recuperación, concurrencia y salida del nuevo alcance; revisar el RPO/RTO, pues perder movimientos de un día puede ser inaceptable. Reservar laboratorio, reactivos, equipos y **materiales verificados** requiere también M6/F4; no se adelanta implícitamente ese módulo.

## 7. F4 y F5 — Ampliar sobre flujos probados

**F4 Materiales:** cantidades consumibles/reutilizables, préstamos independientes, devoluciones parciales, inspección, daños, pérdidas y transferencias entre responsables con tránsito/diferencias. Prácticas es una integración opcional. De diez unidades pueden volver ocho conservando las dos pendientes; una devolución dañada no aumenta disponible y desactivar el módulo permite resolver préstamos abiertos.

**F5 Mantenimiento:** planes y órdenes, evidencias, condición posterior y bloqueos de activos; funciona con Core + Equipos sin Laboratorios/Prácticas. Integrar bloqueos de agenda cuando exista el módulo correspondiente.

**F5 Analítica:** indicadores con periodo, fuente y fórmula; alertas avanzadas, resúmenes y escalamiento. No representar ausencia de datos como cero ni mostrar fuentes no contratadas. Avisos esenciales de stock/caducidad/averías ya pertenecen a sus módulos operativos.

No prometer reservas avanzadas de conjuntos de materiales, ERP o predicción antes de disponer de reglas y pruebas específicas.

## 8. Verificación transversal

| Área | Evidencia | Puerta / momento |
|---|---|---|
| SQL y tipos | Migraciones desde vacío, PgTyped regenerado y pgTAP bajo roles SQL reales | G0 y cada cambio de esquema |
| Aislamiento | IDs cruzados, principal/espacio ausente, membresía revocada, módulo apagado, pool reutilizado | G0; añadir archivos/jobs al publicarlos |
| Atomicidad | Saldo/asientos/auditoría/idempotencia juntos; rollback y concurrencia con conexiones reales | R-00 y cada comando crítico |
| Seguridad productiva | JWT, MFA del operador, correo, invitaciones, recuperación y origen API | G1 |
| Cuotas y carga | Admisión concurrente exacta y progreso entre espacios; lecturas no agotan presupuesto de comandos | G1; ampliar antes de G2/réplicas |
| Recuperación y salida | Base, Auth/configuración, archivos, exportación y supresión verificables | G1 de cada alcance y ensayos periódicos |
| Paquetes | A Reactivos, B Equipos, C ambos; continuidad al desactivar | G2; ampliar al publicar módulos |
| Experiencia | Tareas por rol, teclado, contraste, móvil y errores explicables | Cada flujo |

pgTAP no sustituye pruebas API ni carreras entre conexiones. No usar mocks como evidencia de RLS o bloqueos. ETag/304 no se contabiliza como ausencia de petición; medir el patrón real de pantallas.

Escenario inicial de carga a confirmar: tres espacios, 10.000 posiciones/activos por espacio y 100.000 movimientos. Probar además 100 usuarios de agenda cuando se incorpore F3, incluyendo técnicos/docentes y redes con IP compartida. Son escenarios de prueba, no capacidad ya certificada.

Objetivos iniciales: p95 menor de 1 s en consultas paginadas y 2 s en comandos ordinarios bajo el escenario acordado, excluyendo archivos/exportaciones. Registrar entorno, volumen, errores y consumo; corregir cuello de botella antes de ampliar infraestructura.

## 9. Backlog con dependencias

T-00 registra decisiones ya tomadas. Todas las tareas de implementación siguen pendientes.

| ID | Entrega | Evidencia | Depende de |
|---|---|---|---|
| T-00 | Espacios, propiedad y producto — decisión registrada | Convenciones y ADRs enlazados | — |
| P-01 | Validar paquetes y primer caso | Ejemplos, exclusiones y sustancias reguladas identificadas | T-00 |
| P-02 | Muestras y conectividad | Muestra anonimizada o caso sintético para G0; perfil real para G1 | P-01 |
| REG-01 | Perfil fiscalizado del piloto | Responsable valida sustancias, autorización/sitios/cupos, hechos, formato vigente y alcance de consolidación | P-01 |
| P-03 | Prototipo y tareas | Comentarios observados y cambios de UX | P-01 |
| T-01 | Monorepo y CI | Compilación, fronteras, migraciones y tipos reproducibles | T-00 |
| T-02 | Core y roles SQL | Dos espacios, propietario, ubicaciones y restricciones; unidad administrativa/ubicación diferenciadas conceptualmente, sin crear org_units | T-01 |
| T-03 | Identidad y acceso mínimo | Auth local, propietario válido, roles fijos, ámbito y revocación probados | T-02 |
| T-04 | Derechos mínimos | Comando de aplicación de revisión y denegación por módulo; fixtures usan el comando | T-03 |
| T-05 | Transacciones, auditoría e idempotencia | Misma conexión, rollback y reintentos; base reutilizable por R-00 | T-03 |
| R-00 | Primer recorrido de Reactivos | Catálogo/lote/entrada/salida, interfaz y pruebas de dos salidas sobre el mismo saldo | T-04, T-05 |
| V-00 | G0 | Demo sintética y evidencias del primer incremento | R-00 |
| S-01 | Spike de proveedores | Región/conectividad, SMTP, respaldo/observabilidad y costos verificados | T-01 |
| T-03B | Identidad productiva y propiedad asistida | Invitaciones, recuperación y relevo seguro ensayados; sin cuenta activa huérfana | T-03, S-01 |
| T-07 | Archivos, outbox y worker | Documentos privados, reintentos, concesiones y autorización de trabajos | T-05 |
| O-01 | Operación SaaS | Consola separada, MFA API, contrato/derechos/límites auditados y estados | T-04, T-05, T-03B |
| Q-01 | Cuotas y control de abuso | Reservas exactas en PostgreSQL, HTTP separado en memoria y reparto de trabajos | T-04, T-07 |
| DP-01 | Datos reales y salida | Acuerdos/proveedores/procedimientos revisados; instrucciones y excepciones explícitas | T-00 |
| R-01 | Reactivos para piloto | Ampliaciones de R-00 necesarias para el alcance pactado | R-00, P-02, T-07 |
| REG-02 | Trazabilidad y reporte fiscalizado | Perfil REG-01 implementado; custodia/retorno si aplica, periodo conciliado y exportación revisada; sin envío automático | REG-01, R-01, T-07 |
| E-01 | Equipos e incidencias | Activos/condición/historial; incidents separado de Core | T-04, T-05, T-07, P-02 |
| I-01 | Importación conciliada | Lotes reiniciables e idempotentes; validación de cada módulo publicado | Q-01 y R-01 o E-01, según importador |
| X-00 | Salida del primer módulo | Exportación, documentos, supresión y otros espacios intactos; incluye datos regulatorios del piloto | DP-01, T-07 y R-01 o E-01, según piloto; REG-02 para este cliente |
| T-06 | Recuperación del alcance piloto | Base/archivos/configuración recuperados; supresiones respetadas e información regulatoria incluida | S-01, T-07, DP-01 y R-01 o E-01, según piloto; REG-02 para este cliente |
| V-P01 | G1 del primer alcance | Garantías y perfil comprobados antes de autorizar carga real; inventario conciliado y aceptado antes de habilitar operación | T-03B, O-01, Q-01, X-00, T-06, P-03, REG-02; I-01 si se usa importación |
| P-04 | Colaborador de Prácticas | Flujos y decisiones revisados con responsable académico/técnico | P-01; durante F2, sin bloquear G2 |
| O-02 | Transferencia de propiedad en interfaz | Aceptación y concurrencia/revocación probadas; contrato/datos conservados | T-03B, O-01 |
| X-01 | Salida de toda la oferta | Reactivos/Equipos/combinado y archivos incluidos | X-00, R-01, E-01 |
| V-01 | G2 | A/B/combinado, importación, incorporación, soporte, costos/carga y salida completos | V-P01, R-01, E-01, I-01, X-01, O-02 |

Una dependencia “R-01 o E-01” expresa reutilización por módulo; para el cliente confirmado R-01 y REG-02 son obligatorias. I-01 se implementa y prueba por adaptador; V-01 exige ambos inventarios. La salida/recuperación cubre cada módulo agregado. P-01 concreta la primera entrega acordada sin confundirla con la finalización de los ocho módulos.

T-01 puede empezar mientras se recogen muestras. R-00 usa un caso sintético especificado y no depende de SMTP, de la consola ni de conseguir un cliente. Tras G0, F2 y F1b progresan en paralelo y se encuentran en G1.

## 10. Incorporación y medición

Acordar perímetro, responsables, tratamiento y campos; ensayar importación con una muestra anonimizada. Cumplir y registrar la autorización de carga controlada de G1 antes de recibir la muestra o el inventario real. En el ambiente autorizado, conciliar catálogo/lotes/activos, acordar el corte del sistema anterior y registrar saldo inicial con origen. Obtener aceptación del responsable para completar G1, habilitar operación y acompañar los primeros movimientos. Si la conciliación falla, conservar el acceso restringido a incorporación y corregir; no abrir operación automáticamente.

Una carga anterior al inicio operativo puede retirarse mediante un procedimiento controlado. Con movimientos reales, corregir mediante operaciones compensatorias; nunca restaurar toda la base compartida para repetir la carga de un cliente.

Medir calidad de migración, proporción de inventario ubicado y tiempo de salida/incidencia desde F2; añadir adopción/preparación de prácticas en F3 y devoluciones pendientes en F4. Excluir pruebas, identificar periodo/espacio y distinguir “sin datos” de cero. Fijar objetivos con la línea base del piloto, sin porcentajes inventados.

Offline obligatorio, instalación institucional, SSO previo a compra, módulos por unidad con recursos compartidos, sustancias con trazabilidad adicional o volúmenes muy superiores pueden cambiar el alcance afectado. App nativa, compras/ERP, pagos automáticos, hardware e IA quedan fuera hasta validación específica.
