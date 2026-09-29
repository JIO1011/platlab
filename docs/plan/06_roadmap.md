# Roadmap y plan de acción

Revisión: 26 de septiembre de 2026. Prioridad confirmada: vender PlatLab a varias universidades mediante espacios independientes, cada uno con propietario y miembros con diferentes funciones. La proforma anterior era conceptual y puede cambiar. Por indicación del usuario, este plan se organiza por dependencias, entregables y criterios de salida; no fija plazos ni depende de una dedicación semanal supuesta.

## 1. Orden de implementación

Construir primero una plataforma capaz de operar dos combinaciones reales: **Core + Reactivos** y **Core + Equipos**. Luego añadir agenda y prácticas para conectar esos recursos. De ese modo se comprueba modularidad comercial, aislamiento y utilidad sin exigir a todos los clientes contratar la operación completa. Laboratorios queda en F3; no existe un compromiso previo que obligue a adelantarlo. Los paquetes vigentes de diseño están en [producto y paquetes](09_producto_y_paquetes.md).

| Fase | Resultado | Módulos | Depende de |
|---|---|---|---|
| 0 | Casos reales, datos y límites del producto validados | Definición | Decisiones de espacios y oferta, ya resueltas |
| 1 | Propietario/equipo, aislamiento, consola del proveedor y recuperación | Core | F0 y datos sintéticos para verificar políticas |
| 2 | Primera oferta comercial con dos paquetes independientes | Reactivos y Equipos | F1 aceptada |
| 3 | Agenda y ciclo completo de actividades de docencia/investigación | Laboratorios y Prácticas | F1; F2 para demostrar integración con recursos |
| 4 | Materiales, préstamos y transferencias ampliadas | Materiales | F1; F3 para integración con actividades |
| 5 | Mantenimiento, indicadores y alertas avanzadas | Mantenimiento y Analítica | Equipos para M7; fuentes operativas suficientes para M8 |

Las fases expresan orden de entrega, no dependencias comerciales adicionales: Materiales puede funcionar sin Prácticas y Mantenimiento sin Laboratorios. Se implementará solo lo que tenga reglas y criterios de aceptación definidos. Los rangos temporales de versiones anteriores quedan retirados de este plan.

Para reducir alcance inicial: operar reactivos por lote si el proceso lo permite, usar roles predefinidos con alcances, administrar contratos de forma sencilla y brindar soporte sin acceso implícito del proveedor al dominio. El seguimiento por envase se añade antes de atender a un cliente que lo necesite; no se oculta esa limitación.

### Orden interno de F1

1. Crear repositorio, contratos de API, CI y despliegue de prueba.
2. Implementar espacios, identidad, propietario, invitaciones, roles y aislamiento SQL.
3. Implementar consola del proveedor, módulos, contratos, cuotas y estados de acceso.
4. Añadir auditoría, comandos idempotentes, trabajos mínimos y documentos privados.
5. Verificar correo, recuperación, salida de datos y operación de dos espacios aislados.

Cada bloque se verifica antes de ampliar el siguiente. El spike de infraestructura produce evidencias reutilizables; no es una segunda implementación de toda la plataforma.

## 2. Fase 0 — Validar producto y riesgos

Entregables:

- Identificar dos espacios de trabajo o dos escenarios representativos de clientes con paquetes diferentes.
- Aplicar la decisión confirmada: espacios independientes con propietario, módulos por espacio y miembros con funciones distintas. Un mismo titular jurídico puede agrupar espacios, sin compartir su operación automáticamente.
- Validar ejemplos de universidad y departamento autónomo; conservar M4 en F3 y usar la nueva definición de paquetes, no los compromisos hipotéticos de la proforma v2.
- Observar una entrada/salida de reactivo y una incidencia de equipo; documentar quién decide y qué evidencia guarda.
- Recoger muestras anonimizadas de hojas actuales, unidades, lotes, ubicaciones y documentos.
- Definir paquete, usuarios, responsables, soporte, límites, exportación y condiciones de desactivación; validar responsabilidad sobre los datos, retención y salida conforme al [ciclo del cliente y protección de datos](08_ciclo_cliente_y_datos.md).
- Medir conectividad y tolerancia a pérdida/interrupción; confirmar si nube compartida es aceptable.
- Prototipo sencillo del inicio, tabla, importación, ficha y movimiento; usar [dirección visual](05_experiencia_y_diseno.md).
- Registrar decisiones pendientes con responsable; separar las necesarias para inventario de las de prácticas posteriores.

Criterio de salida: ambos paquetes tienen ejemplos y exclusiones, datos de muestra y responsable de validación; se ha comprobado que los espacios independientes cubren los escenarios y existe una política de continuidad inicial. Las decisiones del usuario están registradas en [revisión](07_decisiones_revision.md); las políticas específicas de cada laboratorio se validan al implementar su flujo.

Todavía no es necesario cerrar reglas de todos los módulos futuros. Sí definir límites que condicionan la base: tenant, titular legal, unidad administrativa, ubicación, lote, cantidad, custodia, identidad y pertenencia.

## 3. Fase 1 — Core y base operativa

Entregables:

- Monorepo, TypeScript, CI, frontend básico y API con módulo Core. Comprobar fronteras de importación y ciclos con dependency-cruiser; las escrituras SQL y la atomicidad requieren sus propias revisiones y pruebas.
- Migraciones reproducibles, roles SQL, RLS y FKs por organización.
- Auth, recuperación de acceso, invitaciones, propiedad singular transferible, membresías y roles con alcance por ubicación. Separar facultades de delegar y ejecutar. Validar proveedor SMTP, dominio remitente y entrega real antes de T-03, según [infraestructura](04_infraestructura.md).
- Organizaciones, ubicaciones, configuración y administración de paquetes.
- Registro de módulos publicados, dependencias, derechos de uso y estados operativos.
- Consola del proveedor en `/ops`, ubicada en `apps/web/src/operator`, y API `/v1/operator` en el mismo monolito. Crear espacios en `provisioning`, invitar al propietario inicial, aplicar paquetes y vigencias, consultar límites, trabajos y auditoría administrativa. El operador tiene identidad y autorización explícitas, MFA y acceso restringido a metadatos; administrar una licencia no habilita lectura de inventarios.
- Auditoría, idempotencia, documentos privados y base de importaciones/outbox.
- Límites iniciales por tenant y por actor para peticiones; límites de tamaño, concurrencia y uso de trabajos y archivos. Persistir las cuotas que deban cumplirse entre instancias. La implementación concreta se valida en el spike, sin introducir una consola de facturación.
- Estados del cliente y procedimiento de alta, suspensión y terminación. Documentar quién autoriza exportación, supresión y excepciones de retención, y cómo una restauración respeta supresiones anteriores; ejecutar el procedimiento con datos sintéticos antes del primer piloto.
- Desarrollo, staging y producción preparados; configuración versionada y secretos separados.
- Ejecutar el [spike de infraestructura](04_infraestructura.md): conectividad, roles, tareas, archivos y restauración.

El spike verifica conexiones y proveedores con un recorrido pequeño. Su prueba de reserva es sintética; las reservas operativas se implementan en F3. La restauración y salida se prueban sobre cada módulo publicado antes de aceptar datos reales. Elegir región por compatibilidad y medición desde Ecuador, no por la etiqueta informal «us-east».

Criterios de aceptación:

1. Una misma persona puede pertenecer a A y B sin compartir datos accidentalmente.
2. Una llamada manipulando `organization_id`, URL o ID de documento no atraviesa el aislamiento.
3. Usuario revocado pierde acceso a nuevas operaciones aunque conserve una sesión anterior.
4. Módulo no contratado se deniega por API; ocultar el menú no es la única barrera.
5. La cadena completa de migraciones reconstruye una base vacía en CI.
6. Se recuperan base y un archivo privado desde respaldo en un entorno aislado.
7. Un operador puede incorporar un tenant y cambiar su paquete con motivo registrado, pero no consultar sus datos operativos por ese solo privilegio.
8. Al vencer una licencia se rechazan operaciones nuevas aunque no se haya ejecutado una tarea de actualización de estado; un pendiente existente sigue la política de continuidad autorizada.
9. Una petición o trabajo que excede su límite se rechaza o pospone de forma explicable. Un tenant no puede consumir sin límite todas las posiciones de ejecución de importaciones.
10. Existe un procedimiento verificable de exportación y supresión, con retenciones justificadas, responsables y controles de restauración. La revisión de los acuerdos de tratamiento y proveedores se completa antes de usar datos reales.
11. Reintentar el alta o canjear dos veces la invitación no duplica membresías ni activa espacios sin propietario. Una transferencia concurrente con la baja del sucesor deja una propiedad válida o rechaza la operación completa.
12. El propietario puede nombrar a un técnico sin poder ajustar stock; un administrador no se asigna propiedad ni permisos del SaaS. Transferir propiedad conserva contrato, módulos e historial.

No desarrollar todavía un portal de ventas, pasarela de pago o constructor de permisos ilimitado. `support_grants` y el acceso de soporte al dominio quedan para una entrega posterior; el soporte inicial usa acompañamiento y evidencias autorizadas. No sustituir esa concesión por una cuenta compartida ni por un administrador global con acceso a todos los datos.

El paso automático a `draining` puede esperar: un operador realiza la transición auditada y la API aplica la vigencia en cada operación desde F1. No construir todavía reservas de producción, envases individuales ni partidas de retorno. Mantener tres ambientes separados, aislamiento, autorización de archivos, trazabilidad y recuperación; son condiciones de entrada a la operación, no mejoras posteriores.

## 4. Fase 2 — Primera oferta con varios paquetes

Paquete A: Core + Reactivos.

- Catálogo/especificación, lotes, posición y unidad base. La estimación inicial usa saldos agregados por lote: diferir envases identificables hasta F3 o una entrega posterior si el proceso lo permite. Si apertura, caducidad o custodia por envase son indispensables, incorporarlos a F2 con alcance y presupuesto revisados; nunca omitir un requisito real para conservar la fecha.
- Importación con vista previa, errores descargables y saldo inicial como movimiento.
- Recepción, salida manual autorizada, conteo/ajuste con motivo e historial atómico.
- Consulta por ubicación, caducidad conocida/desconocida, cuarentena, stock mínimo y SDS privada.
- Traslado mínimo entre ubicaciones bajo custodia del mismo responsable, con despacho/recepción registrados. Si requiere otra aprobación institucional, dejarlo pendiente o capturarlo explícitamente; no editar la ubicación para simular entrega.

Paquete B: Core + Equipos.

- Inventario de activos, código, serie opcional, ubicación, condición y custodio.
- Importación, documentos, incidencias y cambios de condición con historial. Implementar `incidents` como capacidad interna y esquema propio desde F2; no cargar su implementación sobre Core en F1.
- Avisos de averías y datos incompletos. No ofrecer disponibilidad futura por horario ni mantenimiento planificado completo todavía.

Compartido:

- Inicio adaptado al paquete, búsqueda autorizada, exportación y configuración de módulos. Configurar nombre y logo institucional mediante documentos autorizados.
- Flujo de desactivación: impedir nuevas operaciones, resolver pendientes y mantener consulta durante el acceso autorizado. La desactivación comercial no borra datos; la terminación y la supresión siguen un procedimiento diferente.
- Exportación final utilizable con datos, relaciones, documentos y manifiesto; procedimiento controlado de anonimización o supresión según autorización y retención. Una restauración no puede reabrir acceso a datos ya suprimidos.
- Manual breve de incorporación y operación; soporte y canal de reporte definidos.
- Revisión de tiempos de uso y calidad de datos antes de ampliar.

Criterios de aceptación:

1. Cliente A opera Reactivos sin tablas/formularios obligatorios de Laboratorios o Prácticas; cliente B opera Equipos sin Reactivos.
2. Una organización C de pruebas opera ambos. Activar el segundo módulo reutiliza usuarios y ubicaciones sin migración de cliente.
3. Dos salidas de 60 g sobre una existencia de 100 g no producen stock negativo ni dos salidas confirmadas.
4. Reintentar una recepción, salida o importación confirmada no duplica el efecto.
5. Un ajuste no puede confirmarse sin su movimiento y auditoría; datos faltantes no se completan con valores inventados.
6. Documentos y exportaciones respetan organización, rol y alcance; el historial sobrevive a desactivación de usuarios y módulos dentro de la conservación justificada, sin convertir esta regla en retención indefinida de datos personales.
7. Los clientes validan existencias/activos migrados y completan tareas sin intervención constante del desarrollador.
8. Dos importaciones de tenants distintos respetan límites y pueden progresar; exceder una cuota no genera una carga parcial presentada como completa.
9. Se ensaya la salida de un tenant sintético: exportación íntegra, retenciones documentadas, supresión autorizada y verificación de que otros clientes no cambian. Los pendientes de custodia o tratamiento reciben resolución explícita.
10. Antes de aceptar datos reales, están revisados los acuerdos, proveedores, transferencias internacionales y procedimiento de derechos descritos en [ciclo del cliente y protección de datos](08_ciclo_cliente_y_datos.md).

Este es el **MVP comercial**: dos paquetes independientes y su combinación. La proforma anterior era una idea sin compromiso confirmado; queda reemplazada como definición de oferta por [producto y paquetes](09_producto_y_paquetes.md). Laboratorios se incorpora en F3 con una agenda completa de espacios, sin anticipar una versión incompleta para satisfacer una etapa comercial obsoleta.

## 5. Fase 3 — Laboratorios y Prácticas

Entregables:

- Laboratorios, capacidad, horarios, excepciones, preparación/limpieza y agenda de espacios exclusivos.
- Reservas directas para clientes con Laboratorios; la misma agenda incorpora reservas de Prácticas.
- Plantillas versionadas e imprimibles, ejecuciones, requisitos y datos académicos mínimos. Generar inicialmente una vista HTML autorizada con CSS de impresión y opción del navegador para imprimir/guardar PDF. Incluir tenant, logo, código, revisión, estado y fecha; conservar una instantánea de la revisión y del encabezado de los documentos formalmente emitidos. No incorporar un renderizador PDF de servidor sin necesidad validada.
- Docentes y tesistas como solicitantes: actividad de docencia o investigación, campos apropiados, responsable académico y participación con ámbito/vencimiento. No construir gestión académica completa.
- Incorporación masiva mediante CSV de invitaciones: vista previa, roles/ámbitos delegables, deduplicación, envío limitado y canje por destinatario. Portal de solicitudes con catálogo autorizado; consultar recursos para pedirlos no concede gestión de inventarios. Especificación en [acceso institucional](10_acceso_institucional_y_docentes.md).
- Envío, solicitud de ajuste, propuesta del técnico, aceptación del solicitante, aprobación, preparación, ejecución, cierre y cancelación. La revisión propuesta usa `awaiting_requester_acceptance`; `changes_requested` sigue indicando que el solicitante debe corregir. Incluir `cancelled` explícitamente y distinguirlo de la conciliación de custodia pendiente.
- Aprobación que confirma agenda y recursos dentro de una transacción.
- Integración optativa con Reactivos y Equipos; sin esos módulos no se promete control de sus recursos.
- Entrega a custodia, consumo real, devolución verificada e incidencias con contexto. Implementar `return_batches` al incorporar retornos químicos, para conservar procedencia y aptitud sin mezclar sobrantes manipulados con existencias disponibles.
- Panel diario del técnico y avisos operativos. Polling inicial cada 30 segundos con pestaña visible, invalidación tras mutaciones y refresco al recuperar foco; ajustar con mediciones. Mostrar cuándo se actualizó y revalidar siempre los comandos. SSE queda condicionado a necesidad medida. Correo mediante tareas persistentes.

Criterios de aceptación:

1. Una práctica recorre creación → aprobación → preparación → ejecución → cierre y produce historial verificable.
2. Dos aprobaciones concurrentes por un mismo espacio/activo o por cantidades incompatibles no se confirman ambas.
3. El docente o tesista acepta o declina la revisión concreta propuesta por el técnico. Aceptar no reserva por sí solo: devuelve la revisión al técnico para aprobación y reserva atómicas. Cambios de fecha o requisitos aprobados conservan la revisión y reservas vigentes mientras se negocia otra; al confirmar, se reemplazan conjuntamente o se conserva la situación anterior si hay conflicto.
4. Cancelar antes de entregar libera reservas; cancelar después exige resolver custodia, consumo o devolución. `cancelled` no oculta obligaciones abiertas. Vencer una propuesta de cambio notifica y cierra esa propuesta; nunca libera silenciosamente la reserva vigente.
5. Entregar 20 g, consumir 17 g y devolver 3 g produce saldos correctos; los 3 g no vuelven a disponible sin verificación.
6. Una avería identifica las actividades afectadas y bloquea nuevas asignaciones incompatibles.
7. Un cambio en la reserva vinculada se realiza desde su práctica; no existen dos versiones editables del cronograma.
8. Probados Core + Laboratorios; Core + Laboratorios + Prácticas; y esa combinación con cada inventario habilitado.
9. El imprimible corresponde a una revisión identificable y distingue propuesta de aprobación; el logo y los documentos no atraviesan el aislamiento entre tenants.
10. Un tesista no aprueba ni ajusta stock por su condición de solicitante. Vencer su participación o retirar al responsable impide nuevas solicitudes y permite al técnico/administrador autorizado reasignar y resolver pendientes sin borrar entregas.
11. Un docente ve sus solicitudes y los recursos solicitables de su ámbito, sin editar inventarios ni consultar detalles privados de otros. Aprobar revalida su elegibilidad además de la autorización técnica; una revocación impide nuevos compromisos.
12. Invitar por CSV y repetir el lote no duplica miembros ni eleva permisos; un destinatario incorrecto no canjea la invitación. Un miembro de A/B no mezcla recursos entre espacios aunque esté autorizado en ambos.

Antes del piloto de prácticas, revisar RPO/RTO y presupuesto: perder un día de movimientos puede ser inaceptable para la operación diaria. Repetir ensayo de recuperación con los datos y archivos del nuevo flujo.

La oferta de reserva integrada de laboratorio, reactivos, equipos **y materiales verificados** requiere también M6/F4. F3 no adelanta implícitamente préstamos o existencias de Materiales; su entrega independiente puede iniciarse tras F2 y la integración se acepta cuando ambos flujos estén listos.

## 6. Fase 4 — Materiales y préstamos

Entregables:

- Consumibles y reutilizables por cantidad; activos individuales cuando haga falta identificación.
- Entrega, préstamo, retorno parcial, inspección, daños, pérdidas y vencimientos.
- Integración con Prácticas opcional; préstamos independientes con Core + Materiales.
- Transferencias entre responsables/laboratorios con autorización, tránsito, recepción parcial y diferencias.
- Necesidad de reposición simple si no hay recurso apto disponible; sin compras/ERP.

Criterios de aceptación:

- De diez unidades prestadas pueden volver ocho; las dos pendientes conservan responsable y estado.
- Una devolución dañada no incrementa el saldo utilizable.
- Una transferencia no crea ni pierde cantidad institucional por el simple traslado.
- Desactivar el módulo con préstamos abiertos permite resolverlos y prohíbe nuevos préstamos.
- Una práctica finalizada no oculta los pendientes de devolución que permanezcan abiertos según política.

No prometer capacidad compartida futura avanzada para conjuntos de materiales hasta disponer de reglas y pruebas de intervalos. La primera versión puede reservar conservadoramente hasta la devolución verificada.

## 7. Fase 5 — Mantenimiento, Analítica y alertas avanzadas

Entregables:

- Planes y órdenes preventivas/correctivas, checklist, evidencias, resultado y próximo vencimiento.
- Bloqueos de agenda de activos y relación con incidencias.
- Mantenimiento funciona con Core + Equipos, aunque el cliente no tenga Laboratorios ni Prácticas.
- Indicadores de consumo, utilización, preparación, incidencias y calidad de datos según fuentes contratadas.
- Reportes filtrables y exportaciones; alertas configurables avanzadas, resúmenes y escalamiento.

Criterios de aceptación:

- Un mantenimiento confirmado impide reservar el mismo activo durante ese intervalo.
- Core + Equipos + Mantenimiento completa una orden y bloquea su activo sin contratar Laboratorios ni Prácticas.
- Al resolver una orden queda evidencia de quién decide que vuelve a operar.
- Las alertas repetidas se agrupan y los reintentos no duplican efectos de negocio.
- Cada indicador declara periodo, fuente y fórmula; no presenta cero cuando carece de datos.
- Analítica requiere un módulo operativo y nunca revela datos de módulos/instituciones sin autorización.

Priorizar Mantenimiento sobre Analítica si la demanda real lo justifica. Los avisos esenciales de stock, caducidad y averías ya existen desde sus módulos iniciales.

## 8. Plan de verificación transversal

| Área | Prueba significativa | Momento |
|---|---|---|
| Aislamiento | Acceso cruzado por ID, consultas, archivos, caché y jobs | Fase 1 y cada nueva entidad |
| Paquetes | A solo Reactivos, B solo Equipos, C ambos; luego combinaciones dependientes | Desde fase 2 |
| Concurrencia | Operaciones simultáneas sobre el mismo saldo/intervalo | Al introducir cada comando |
| Idempotencia | Reenvío después de timeout con mismo payload y clave; cambio de payload rechazado | Cada comando irreversible de negocio |
| Historial | Movimiento/decisión/auditoría se confirman juntos y no se eliminan por desactivación operativa; la conservación y supresión siguen su política | Desde fase 2 |
| Importación | Errores por fila, repetición, unidades incompatibles y conciliación del saldo inicial | Desde fase 2 |
| Cuotas | Límites por tenant, admisión concurrente y progreso de trabajos de distintos clientes | Desde fase 1; importaciones reales en F2 |
| Tareas | Caída tras commit, reintento y retirada de permiso/módulo | Desde fase 1 |
| Recuperación | Base, Auth/configuración y documentos recuperables | Antes del piloto y periódicamente |
| Salida y datos personales | Exportación, retención justificada, supresión autorizada y restauración que respeta supresiones | Diseñar en F1 y ensayar antes del piloto |
| Operador | Administración contractual auditada sin acceso implícito al dominio | Desde fase 1 |
| Experiencia | Teclado, contraste, móvil, errores y tareas por rol | Cada flujo visible |

Usar PostgreSQL real de pruebas para RLS, bloqueos y restricciones; un mock no demuestra esos comportamientos. Reservar pruebas end-to-end para los recorridos críticos, sin exigir cobertura artificial de cada componente.

Volumen inicial para dimensionar, **no límite comercial ni carga ya medida**: 3 organizaciones, 10.000 posiciones/activos por organización, 100.000 movimientos y 50 sesiones concurrentes de mezcla realista. Confirmar o sustituir con datos de fase 0.

Objetivos iniciales a medir: p95 inferior a 1 segundo en consultas paginadas y a 2 segundos en comandos ordinarios bajo ese escenario, excluyendo carga de archivos/exportaciones. Cero inconsistencias confirmadas de stock, reservas o aislamiento en las pruebas. Si no se alcanza, identificar consulta, latencia o capacidad antes de sumar infraestructura.

## 9. Migración e incorporación de cada institución

1. Acordar perímetro del tenant, titular y responsables del tratamiento, contrato, retención y correspondencia de campos; no mezclar catálogos de clientes.
2. Cargar muestra en staging, detectar duplicados y campos faltantes, normalizar solo unidades compatibles.
3. Validar catálogos, lotes, responsables, ubicaciones y documentos con el cliente.
4. Ensayar importación completa con identificadores de origen y reporte de conciliación.
5. Acordar ventana de corte; congelar movimientos del sistema anterior y registrar el saldo verificado.
6. Importar con lote identificado y saldos iniciales trazables; reconciliar filas, totales y muestras físicas.
7. Obtener aceptación del responsable, habilitar usuarios y acompañar primeros movimientos.

Si falla antes de la aceptación y todavía no hay operación nueva, retirar la importación mediante procedimiento controlado. Si ya existen movimientos reales, corregir con operaciones compensatorias; no restaurar toda la base compartida ni borrar historial para repetir la carga.

## 10. Primeras tareas del backlog

La decisión T-00 ya está registrada. Las tareas de implementación siguen pendientes; estos documentos no constituyen software implementado.

| ID | Tarea | Evidencia de terminación | Depende de |
|---|---|---|---|
| T-00 | Registrar decisiones de producto — completada | Espacios independientes, propietario/equipo, proforma conceptual y plan por entregables confirmados | — |
| P-01 | Validar los dos paquetes de lanzamiento | Casos reales y exclusiones de Reactivos/Equipos; oferta del documento 09 aplicada | T-00 |
| P-02 | Recoger muestras y perfil de conectividad | Datos anonimizados y restricciones | P-01 |
| P-03 | Validar prototipo de inventario/equipos | Resultados de tareas y ajustes de UX | P-01 |
| T-01 | Crear monorepo y pipeline | Compilación, comprobación de fronteras y despliegue de staging reproducibles | P-01 |
| T-02 | Modelar Core y roles SQL | Migración limpia, tenant A/B y acceso denegado probado; separación entre unidad y ubicación | T-00, T-01 |
| S-01 | Validar infraestructura y proveedores | SMTP y dominio listos, correo real recibido, regiones y conexiones medidas, destinos de respaldo/errores confirmados | T-01 |
| T-03 | Implementar Auth, propietario, membresías y alcances | Alta, invitación, recuperación, transferencia de propiedad, revocación y cambio de espacio probados | T-02, S-01 |
| T-04 | Implementar derechos y registro de módulos | Dependencias y API denegada por paquete probadas | T-03 |
| T-05 | Implementar documentos, auditoría y tareas | Archivo privado, trazabilidad y recuperación de job | T-03 |
| O-01 | Implementar consola del operador | Alta, invitación inicial, paquete, límites y estados auditados; MFA y denegación de datos del dominio | T-04, T-05 |
| Q-01 | Aplicar límites por tenant y actor | Admisión de peticiones, archivos y trabajos probada entre instancias | T-04, T-05 |
| DP-01 | Preparar alta, salida y protección de datos | Acuerdos revisados, exportación/retención/supresión definidas y ensayo inicial con datos sintéticos | T-00, T-05 |
| T-06 | Ensayar respaldo y restauración | Registro de tiempos y checksums correctos; una recuperación respeta supresiones anteriores | S-01, T-05, DP-01 |
| R-01 | Implementar catálogo/lotes y movimientos | Saldo + historial atómicos, sin negativos | T-02, T-04, P-02 |
| E-01 | Implementar activos y capacidad de incidencias | Ciclo de condición e historial verificables; propiedad de `incidents` separada de Core | T-02, T-04, T-05 |
| I-01 | Implementar importación con conciliación | Archivo repetido no duplica movimientos; cuotas y progreso entre tenants verificados | R-01, E-01, Q-01 |
| X-01 | Completar y ensayar exportación final y supresión | Datos y archivos verificables, relaciones conservadas, retenciones justificadas y otros tenants intactos | R-01, E-01, DP-01 |
| V-01 | Validar tres combinaciones de módulos y salida | A Reactivos, B Equipos, C ambos; aislamiento, incorporación y terminación demostrados | I-01, X-01, T-06, O-01, P-03 |

T-00 está resuelta y permite avanzar hacia P-01/T-01. T-01 puede prepararse mientras se recogen muestras; T-03 necesita correo validado en S-01. Empezar el dominio después de obtener una muestra P-02, con membresías, cantidades y movimientos como base de los flujos visibles.

## 11. Medición del resultado del producto

Levantar una línea base antes de cada piloto y revisar con el responsable institucional al terminar el primer mes. Fijar objetivos de mejora con esa evidencia, sin inventar porcentajes de ahorro.

| Indicador | Definición | Desde |
|---|---|---|
| Inventario ubicado | Posiciones/activos vigentes con ubicación verificada ÷ total vigente | F2 |
| Calidad de migración | Filas conciliadas y aceptadas ÷ filas previstas; mostrar errores restantes | F2 |
| Tiempo operativo | Mediana de tiempo para registrar salida o resolver incidencia, comparada con el proceso anterior | F2 |
| Adopción de prácticas | Actividades gestionadas en plataforma ÷ total reportado por la institución en el periodo | F3 |
| Preparación a tiempo | Prácticas marcadas listas antes de su inicio ÷ prácticas que debían ejecutarse | F3 |
| Pendientes de devolución | Cantidad y antigüedad de préstamos vencidos aún no resueltos | F4 |

Los indicadores excluyen registros de prueba, identifican periodo y organización y muestran «sin datos» cuando no hay denominador. Distinguir conflictos detectados y resueltos antes de aprobar de conflictos que alcanzan la operación real.

## 12. Qué puede hacer cambiar este plan

Operación obligatoria sin Internet, alojamiento institucional obligatorio, SSO previo a compra, contratación por unidad con recursos compartidos, sustancias/procesos con trazabilidad adicional, integraciones externas o volúmenes muy superiores son motivos para revisar alcance y arquitectura antes del desarrollo afectado. No incorporarlos de forma implícita a una fase existente.

App móvil nativa, ERP/compras, facturación automática, sincronización offline, hardware, IA y analítica predictiva quedan fuera de las fases iniciales. Se incorporarán por una necesidad validada, con módulo/capacidad, presupuesto y criterio de aceptación propios.
