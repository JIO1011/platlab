# Roadmap y plan de acción

Fecha: 24 de septiembre de 2026. Prioridad confirmada: ofrecer distintos paquetes a varios clientes desde la primera oferta. Operación propuesta en nube, evaluando excepciones con cada institución.

## 1. Orden de implementación

Construir primero una plataforma capaz de operar dos combinaciones reales: **Core + Reactivos** y **Core + Equipos**. Luego añadir agenda y prácticas para conectar esos recursos. De ese modo se comprueba modularidad comercial, aislamiento y utilidad sin exigir a todos los clientes contratar la operación completa.

| Fase | Resultado | Módulos | Estimación inicial |
|---|---|---|---|
| 0 | Alcance y decisiones contrastados con clientes | Definición | 1–2 semanas |
| 1 | Plataforma segura y desplegable con varias instituciones | Core | 2–3 semanas |
| 2 | Primera oferta comercial con dos paquetes independientes | Reactivos y Equipos | 4–6 semanas |
| 3 | Agenda y ciclo completo de prácticas | Laboratorios y Prácticas | 5–8 semanas |
| 4 | Materiales, préstamos y transferencias ampliadas | Materiales | 3–5 semanas |
| 5 | Mantenimiento e indicadores | Mantenimiento y Analítica | 4–6 semanas |

Rangos para **un desarrollador con experiencia y unas 25 horas productivas por semana**, acceso continuo a usuarios y sin integraciones adicionales. Primera oferta: aproximadamente 7–11 semanas; conjunto del alcance: 19–30 semanas antes de contingencia. Reservar 20–30% adicional para datos, hallazgos y ajustes. Son estimaciones de planificación, no fechas prometidas ni respaldo de los precios actuales.

La reutilización de ReactiLab todavía no está cuantificada. Un equipo mayor no divide automáticamente los plazos; medir avance después de las primeras dos iteraciones y reestimar.

## 2. Fase 0 — Validar producto y riesgos

Entregables:

- Identificar dos instituciones o dos escenarios representativos de clientes con paquetes diferentes.
- Observar una entrada/salida de reactivo y una incidencia de equipo; documentar quién decide y qué evidencia guarda.
- Recoger muestras anonimizadas de hojas actuales, unidades, lotes, ubicaciones y documentos.
- Definir paquete, usuarios, responsables, soporte, límites, exportación y condiciones de desactivación.
- Medir conectividad y tolerancia a pérdida/interrupción; confirmar si nube compartida es aceptable.
- Prototipo sencillo del inicio, tabla, importación, ficha y movimiento; usar [dirección visual](05_experiencia_y_diseno.md).
- Registrar decisiones pendientes con responsable; separar las necesarias para inventario de las de prácticas posteriores.

Criterio de salida: alcance de ambos paquetes definido con ejemplos y exclusiones; datos de muestra disponibles; responsable institucional de validar existencias y permisos; política de continuidad inicial acordada.

Todavía no es necesario cerrar reglas de todos los módulos futuros. Sí definir límites que condicionan la base: institución, ubicación, lote, cantidad, custodia, identidad y pertenencia.

## 3. Fase 1 — Core y base operativa

Entregables:

- Monorepo, TypeScript, CI, frontend básico y API con módulo Core.
- Migraciones reproducibles, roles SQL, RLS y FKs por organización.
- Auth, recuperación de acceso, invitaciones, membresías y roles con alcance por ubicación.
- Organizaciones, ubicaciones, configuración y administración de paquetes.
- Registro de módulos publicados, dependencias, derechos de uso y estados operativos.
- Auditoría, idempotencia, documentos privados y base de importaciones/outbox.
- Desarrollo, staging y producción preparados; configuración versionada y secretos separados.
- Ejecutar el [spike de infraestructura](04_infraestructura.md): conectividad, roles, tareas, archivos y restauración.

El spike de 3–5 días está incluido en esta fase. Su prueba de reserva es mínima y sintética para comprobar concurrencia; el módulo operativo de reservas se implementa en fase 3.

Criterios de aceptación:

1. Una misma persona puede pertenecer a A y B sin compartir datos accidentalmente.
2. Una llamada manipulando `organization_id`, URL o ID de documento no atraviesa el aislamiento.
3. Usuario revocado pierde acceso a nuevas operaciones aunque conserve una sesión anterior.
4. Módulo no contratado se deniega por API; ocultar el menú no es la única barrera.
5. La cadena completa de migraciones reconstruye una base vacía en CI.
6. Se recuperan base y un archivo privado desde respaldo en un entorno aislado.

No desarrollar todavía un portal de ventas, pasarela de pago o constructor de permisos ilimitado. La administración interna mínima debe ser suficiente y quedar auditada.

## 4. Fase 2 — Primera oferta con varios paquetes

Paquete A: Core + Reactivos.

- Catálogo/especificación, lotes, posición y unidad base; envase individual si lo confirma la fase 0.
- Importación con vista previa, errores descargables y saldo inicial como movimiento.
- Recepción, salida manual autorizada, conteo/ajuste con motivo e historial atómico.
- Consulta por ubicación, caducidad conocida/desconocida, cuarentena, stock mínimo y SDS privada.
- Traslado mínimo entre ubicaciones bajo custodia del mismo responsable, con despacho/recepción registrados. Si requiere otra aprobación institucional, dejarlo pendiente o capturarlo explícitamente; no editar la ubicación para simular entrega.

Paquete B: Core + Equipos.

- Inventario de activos, código, serie opcional, ubicación, condición y custodio.
- Importación, documentos, incidencias y cambios de condición con historial.
- Avisos de averías y datos incompletos. No ofrecer disponibilidad futura por horario ni mantenimiento planificado completo todavía.

Compartido:

- Inicio adaptado al paquete, búsqueda autorizada, exportación y configuración de módulos.
- Flujo de desactivación: impedir nuevas operaciones, resolver pendientes y mantener consulta.
- Manual breve de incorporación y operación; soporte y canal de reporte definidos.
- Revisión de tiempos de uso y calidad de datos antes de ampliar.

Criterios de aceptación:

1. Cliente A opera Reactivos sin tablas/formularios obligatorios de Laboratorios o Prácticas; cliente B opera Equipos sin Reactivos.
2. Una organización C de pruebas opera ambos. Activar el segundo módulo reutiliza usuarios y ubicaciones sin migración de cliente.
3. Dos salidas de 60 g sobre una existencia de 100 g no producen stock negativo ni dos salidas confirmadas.
4. Reintentar una recepción, salida o importación confirmada no duplica el efecto.
5. Un ajuste no puede confirmarse sin su movimiento y auditoría; datos faltantes no se completan con valores inventados.
6. Documentos y exportaciones respetan organización, rol y alcance; el historial sobrevive a desactivación de usuarios y módulos.
7. Los clientes validan existencias/activos migrados y completan tareas sin intervención constante del desarrollador.

Este es el **MVP comercial**. La proforma debe describir exactamente estos paquetes y marcar los siguientes como entregas posteriores.

## 5. Fase 3 — Laboratorios y Prácticas

Entregables:

- Laboratorios, capacidad, horarios, excepciones, preparación/limpieza y agenda de espacios exclusivos.
- Reservas directas para clientes con Laboratorios; la misma agenda incorpora reservas de Prácticas.
- Plantillas versionadas e imprimibles, ejecuciones, requisitos y datos académicos mínimos.
- Envío, solicitud de ajuste, aprobación, preparación, ejecución, cierre y cancelación.
- Aprobación que confirma agenda y recursos dentro de una transacción.
- Integración optativa con Reactivos y Equipos; sin esos módulos no se promete control de sus recursos.
- Entrega a custodia, consumo real, devolución verificada e incidencias con contexto.
- Panel diario del técnico y avisos operativos. Correo mediante tareas persistentes.

Criterios de aceptación:

1. Una práctica recorre creación → aprobación → preparación → ejecución → cierre y produce historial verificable.
2. Dos aprobaciones concurrentes por un mismo espacio/activo o por cantidades incompatibles no se confirman ambas.
3. Cambiar fecha o requisitos aprobados conserva revisión anterior y exige revalidación.
4. Cancelar antes de entregar libera reservas; cancelar después exige resolver custodia, consumo o devolución.
5. Entregar 20 g, consumir 17 g y devolver 3 g produce saldos correctos; los 3 g no vuelven a disponible sin verificación.
6. Una avería identifica las actividades afectadas y bloquea nuevas asignaciones incompatibles.
7. Un cambio en la reserva vinculada se realiza desde su práctica; no existen dos versiones editables del cronograma.
8. Probados Core + Laboratorios; Core + Laboratorios + Prácticas; y esa combinación con cada inventario habilitado.

Antes del piloto de prácticas, revisar RPO/RTO y presupuesto: perder un día de movimientos puede ser inaceptable para la operación diaria. Repetir ensayo de recuperación con los datos y archivos del nuevo flujo.

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

## 7. Fase 5 — Mantenimiento y Analítica

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
| Historial | Movimiento/decisión/auditoría se confirman juntos y no se eliminan por bajas | Desde fase 2 |
| Importación | Errores por fila, repetición, unidades incompatibles y conciliación del saldo inicial | Desde fase 2 |
| Tareas | Caída tras commit, reintento y retirada de permiso/módulo | Desde fase 1 |
| Recuperación | Base, Auth/configuración y documentos recuperables | Antes del piloto y periódicamente |
| Experiencia | Teclado, contraste, móvil, errores y tareas por rol | Cada flujo visible |

Usar PostgreSQL real de pruebas para RLS, bloqueos y restricciones; un mock no demuestra esos comportamientos. Reservar pruebas end-to-end para los recorridos críticos, sin exigir cobertura artificial de cada componente.

Volumen inicial para dimensionar, **no límite comercial ni carga ya medida**: 3 organizaciones, 10.000 posiciones/activos por organización, 100.000 movimientos y 50 sesiones concurrentes de mezcla realista. Confirmar o sustituir con datos de fase 0.

Objetivos iniciales a medir: p95 inferior a 1 segundo en consultas paginadas y a 2 segundos en comandos ordinarios bajo ese escenario, excluyendo carga de archivos/exportaciones. Cero inconsistencias confirmadas de stock, reservas o aislamiento en las pruebas. Si no se alcanza, identificar consulta, latencia o capacidad antes de sumar infraestructura.

## 9. Migración e incorporación de cada institución

1. Acordar correspondencia de campos y responsables del dato; no mezclar catálogos de clientes.
2. Cargar muestra en staging, detectar duplicados y campos faltantes, normalizar solo unidades compatibles.
3. Validar catálogos, lotes, responsables, ubicaciones y documentos con el cliente.
4. Ensayar importación completa con identificadores de origen y reporte de conciliación.
5. Acordar ventana de corte; congelar movimientos del sistema anterior y registrar el saldo verificado.
6. Importar con lote identificado y saldos iniciales trazables; reconciliar filas, totales y muestras físicas.
7. Obtener aceptación del responsable, habilitar usuarios y acompañar primeros movimientos.

Si falla antes de la aceptación y todavía no hay operación nueva, retirar la importación mediante procedimiento controlado. Si ya existen movimientos reales, corregir con operaciones compensatorias; no restaurar toda la base compartida ni borrar historial para repetir la carga.

## 10. Primeras tareas del backlog

Todas pendientes. Los documentos actuales constituyen diseño; estas tareas todavía no se han implementado.

| ID | Tarea | Evidencia de terminación | Depende de |
|---|---|---|---|
| P-01 | Definir los dos paquetes de lanzamiento | Alcance y casos reales por cliente | — |
| P-02 | Recoger muestras y perfil de conectividad | Datos anonimizados y restricciones | P-01 |
| P-03 | Validar prototipo de inventario/equipos | Resultados de tareas y ajustes de UX | P-01 |
| T-01 | Crear monorepo y pipeline | Compilación y despliegue de staging reproducibles | P-01 |
| T-02 | Modelar Core y roles SQL | Migración limpia, tenant A/B y acceso denegado probado | T-01 |
| T-03 | Implementar Auth, membresías y alcances | Inicio, invitación, revocación y cambio de institución probados | T-02 |
| T-04 | Implementar derechos y registro de módulos | Dependencias y API denegada por paquete probadas | T-03 |
| T-05 | Implementar documentos, auditoría y tareas | Archivo privado, trazabilidad y recuperación de job | T-03 |
| T-06 | Ensayar respaldo y restauración | Registro de tiempos y checksums correctos | T-05 |
| R-01 | Implementar catálogo/lotes y movimientos | Saldo + historial atómicos, sin negativos | T-02, T-04, P-02 |
| E-01 | Implementar activos e incidencias | Ciclo de condición e historial verificables | T-02, T-04, T-05 |
| I-01 | Implementar importación con conciliación | Archivo repetido no duplica movimientos | R-01, E-01 |
| V-01 | Validar tres combinaciones de módulos | A Reactivos, B Equipos, C ambos y aislamiento | I-01, T-06, P-03 |

El primer trabajo de programación recomendado es T-01/T-02 después de concretar P-01 y obtener una muestra P-02. Evitar empezar por un dashboard lleno de datos de ejemplo sin resolver membresías, cantidades y movimientos.

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

Operación obligatoria sin Internet, alojamiento institucional obligatorio, SSO previo a compra, sustancias/procesos con trazabilidad adicional, integraciones externas o volúmenes muy superiores son motivos para revisar alcance y arquitectura antes del desarrollo afectado.

App móvil nativa, ERP/compras, facturación automática, sincronización offline, hardware, IA y analítica predictiva quedan fuera de las fases iniciales. Se incorporarán por una necesidad validada, con módulo/capacidad, presupuesto y criterio de aceptación propios.
