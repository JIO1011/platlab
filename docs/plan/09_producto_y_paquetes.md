# Producto, espacios y paquetes

Fecha: revisión del 29 de septiembre de 2026. Definición de producto basada en las respuestas del usuario. Sustituye el alcance comercial de la proforma conceptual; no es una cotización ni afirma que los módulos estén construidos. Las puertas de disponibilidad comercial son las del [roadmap](06_roadmap.md).

## 1. Qué se vende

PlatLab es un servicio para gestionar recursos y operación de laboratorios universitarios. Se contrata por **espacio de trabajo independiente**, con un paquete de módulos, usuarios autorizados, límites y condiciones de servicio. El producto y sus actualizaciones son comunes a todos los clientes.

Una universidad puede contratar un espacio para varios laboratorios o varios espacios para departamentos que operan por separado. El titular jurídico se registra una sola vez cuando corresponde; no se convierte automáticamente en administrador de todos esos espacios.

Ejemplo: Química y Biología pertenecen a la misma universidad, pero contratan por separado. Cada departamento tiene espacio, propietario, equipo y módulos propios. Una docente puede pertenecer a ambos y cambiar de espacio; esa pertenencia no comparte existencias ni reservas. Si Química administra tres laboratorios, estos son ubicaciones dentro de su espacio, con permisos por ubicación.

La licencia pertenece al espacio, no a la persona que lo creó. Cambiar de propietario no cambia los datos, el contrato ni el paquete. Compartir o fusionar inventarios entre espacios queda fuera del lanzamiento y requerirá un proyecto explícito de integración/migración.

El modelo técnico de aislamiento tiene una sola autoridad en [ADR 0001](../adr/0001_espacios_y_acceso.md). Aquí se describe su oferta comercial, no un segundo modelo de autorización.

## 2. Quién usa el producto

| Función | Responsabilidad | Entrega |
|---|---|---|
| Propietario | Gobierno del espacio, nombrar administradores, solicitar cambios comerciales, transferir propiedad | F1 |
| Administrador | Configurar miembros, roles delegables, ubicaciones y marca | F1 |
| Técnico u operador del laboratorio | Gestionar inventario y luego aprobar, preparar y conciliar actividades, según permisos | F2; ampliación F3 |
| Docente | Solicitar actividades docentes, aceptar propuestas y consultar sus resultados | F3 |
| Tesista | Solicitar actividades de investigación con participación autorizada, ámbito y vencimiento | F3 |
| Operador del SaaS | Alta de clientes, paquetes, límites, estados y diagnóstico técnico autorizado | F1; consola separada |

Una persona puede acumular funciones y tener funciones diferentes en cada espacio. Propietario y administrador no obtienen automáticamente permiso para ajustar stock o aprobar solicitudes propias. El operador del SaaS no es el técnico del laboratorio ni recibe acceso implícito al contenido de clientes.

Docentes y tesistas comparten el motor de solicitudes; cambian campos y políticas de participación. La aprobación académica de un responsable no sustituye la aprobación técnica de recursos. No se incluye gestión de calificaciones, matrículas o expedientes universitarios.

Muchos docentes se incorporan con invitaciones individuales o CSV de invitaciones en F3, con rol/ámbito asignados y aceptación personal. La suscripción es por espacio; solicitar reactivos/equipos no exige dar acceso administrativo a sus inventarios. Para una empresa, el mismo permiso puede presentarse como «Solicitante», validando antes sus procesos específicos. [Acceso institucional y docentes](10_acceso_institucional_y_docentes.md) define estas reglas y el aislamiento.

## 3. Paquetes y momento de disponibilidad

Los paquetes son combinaciones del mismo registro de módulos. No crean versiones de código ni bases distintas. Un módulo solo se anuncia como disponible después de cumplir sus criterios del [roadmap](06_roadmap.md).

| Oferta | Módulos | Resultado que compra el cliente | Disponible al aceptar |
|---|---|---|---|
| Inventario químico | M1 + M2 | Catálogo, lotes, existencias, movimientos, documentos y avisos esenciales | F2 |
| Activos de laboratorio | M1 + M3 | Inventario de equipos, ubicación, condición, responsable e incidencias | F2 |
| Inventario institucional | M1 + M2 + M3 | Los dos inventarios dentro del mismo espacio | F2 |
| Agenda de laboratorios | M1 + M4 | Espacios, horarios, bloqueos y reservas con control de conflictos | F3 |
| Prácticas e investigación | M1 + M4 + M5 | Solicitud, revisión, aprobación, preparación y cierre de actividades docentes/de tesis | F3 |
| Materiales y préstamos | M1 + M6 | Consumibles, reutilizables, préstamos y devoluciones parciales | F4 |
| Mantenimiento | Añadir M7 a M1 + M3 | Planes, órdenes y trazabilidad de intervenciones | F5 |
| Analítica y alertas avanzadas | Añadir M8 a un paquete operativo | Indicadores, reglas configurables, resúmenes y escalamiento sobre módulos contratados | F5 |

Prácticas se integra con M2/M3/M6 cuando están habilitados. Sin el inventario correspondiente, identifica los recursos externos como no verificados; no muestra una disponibilidad ficticia ni registra consumos en un módulo no contratado. M6 puede desarrollarse tras F2 si la demanda lo justifica; su integración con actividades depende de F3.

Los avisos esenciales de caducidad, stock, averías y acciones pendientes están incluidos en los módulos que los necesitan. M8 añade análisis y automatizaciones avanzadas: no cobra aparte los controles indispensables de operación.

## 4. Alta, ampliaciones y salida

1. El operador registra titular, espacio y revisión contractual, y aplica paquete/derechos/límites mediante el comando del [ADR 0002](../adr/0002_contratos_y_derechos.md); envía invitación al propietario. El espacio queda en `provisioning`.
2. El propietario verifica su identidad y acepta. El espacio pasa a prueba o activo, según las condiciones autorizadas; configura marca, ubicaciones y equipo.
3. La incorporación valida/importa datos, comprueba saldos y permite operar el paquete contratado.
4. El propietario o representante autorizado solicita ampliaciones. El proveedor aplica derechos, vigencia y límites; el cliente no se autoasigna licencias.
5. Desactivar un módulo bloquea operaciones nuevas y permite resolver pendientes según la política de continuidad. Terminar el servicio inicia exportación y disposición de datos, con sus autorizaciones y obligaciones propias.

La administración de propiedad no equivale a representación jurídica. Cierre contractual y eliminación requieren instrucciones de quien esté autorizado para ello. Los procedimientos están en [dominio](03_dominio_y_datos.md) y [ciclo del cliente](08_ciclo_cliente_y_datos.md).

## 5. Cómo estructurar la oferta económica

Recomendación: una suscripción por espacio y paquete, con límites de uso y soporte descritos; incorporación y migración presupuestadas por separado según calidad de los datos. La contratación puede ser mensual o anual sin alterar el modelo de módulos. No cobrar una reconstrucción del producto común a cada universidad.

Evaluar descuento por volumen de espacios del mismo titular, con piso que cubra atención y operación de cada espacio. No fijar porcentaje sin validar costos. Una universidad puede reunir departamentos en un espacio si realmente comparten gobierno y operación: no tratarlo como abuso. Los límites transparentes de usuarios/almacenamiento/uso y el soporte pactado permiten cobrar el volumen; no forzar fronteras de datos para corregir un precio mal diseñado. Facturación conjunta no habilita consultas cruzadas.

Separar tres conceptos: desarrollo de capacidades aún no disponibles, incorporación de un cliente y servicio recurrente. El servicio dedicado o en servidor del cliente es una modalidad adicional con costos y responsabilidades propios; no forma parte de la tarifa compartida estándar.

No se valida el precio histórico de US$ 100/mes ni se declara imposible para cualquier escenario. Antes de publicar tarifa, calcular ingreso menos infraestructura asignada, soporte comprometido, mantenimiento y contingencia, usando un número conservador de clientes. El presupuesto de infraestructura de [04](04_infraestructura.md) es compartido y excluye trabajo humano; no demuestra por sí solo rentabilidad.

La ficha de cada oferta debe precisar módulos disponibles, espacios incluidos, usuarios/almacenamiento/importaciones, incorporación, horario y alcance de soporte, renovación, recuperación, exportación y salida. Las cuotas técnicas iniciales protegen al sistema; no se presentan como cupos comerciales definitivos sin validarlas.

## 6. Orden recomendado para lanzar

Primero completar la base común y probar dos clientes sintéticos aislados. Después validar Reactivos y Equipos como productos completos, individualmente y combinados. Publicar esas tres configuraciones cuando funcionen la incorporación, los movimientos, los permisos, la recuperación y la salida.

Agregar después Agenda y Prácticas/Investigación usando el mismo inventario. Mantener como referencia visual el PDF, adaptando navegación, solicitudes y marca a los módulos y funciones realmente disponibles. [Experiencia y diseño](05_experiencia_y_diseno.md) describe esa evolución.

El siguiente trabajo es el [primer incremento](../desarrollo/primer_incremento.md), junto con descubrimiento F0. Una demo sintética, un piloto real acotado y la venta abierta son resultados diferentes: seguir las puertas del roadmap.

## 7. Descubrimiento regulatorio y colaboración

El piloto confirmado necesita sustancias fiscalizadas y el usuario confirma calificación, responsable y reportes actuales. F0 verifica su alcance y evidencia: sustancias/concentraciones, titular, sitios, cupos, unidades y consolidación. No se repite la pregunta de si es necesario. Los [detalles del modelo](03_dominio_y_datos.md#perfil-de-sustancias-fiscalizadas-del-piloto) y las tareas REG-01/REG-02 del roadmap gobiernan esta entrega; pertenece a Reactivos sin exigir M8.

El reporte regulatorio es una oportunidad a validar, no una prestación ya incluida por tener un ledger. EPN describe consumo y reporte institucional a SISALEM; una calificación puede reunir unidades que PlatLab modele en espacios diferentes. Requerir exportaciones autorizadas y conciliación por el responsable, sin lectura cruzada automática por titular. [Proceso publicado por EPN](https://www.epn.edu.ec/academico/traspasos-masivos-y-asignacion-reasignacion-de-bienes-administrativo/).

Obtener formato y reglas vigentes antes de implementar el reporte del piloto. El manual oficial disponible de 2019 describe carga TXT, por lo que no se presupone CSV ni API pública; no automatizar presentación ante la autoridad en el MVP. Validar campos, conciliación y aceptación del responsable antes de G1; un CSV genérico no demuestra resolver ese proceso. No confundir fiscalización con registros de medicamentos o normativa ambiental. [Manual SISALEM de referencia histórica](https://www.ministeriodegobierno.gob.ec/wp-content/uploads/2019/06/MANUAL-DE-USUARIO-SISALEM-Mayo2019.pdf).

El laboratorio interesado quiere todos los módulos y acepta probar por entregas. Durante F2 concretar su participación como colaborador para Prácticas: observar solicitudes, preparación, cambios y cierre; validar con casos su asignación técnica y aprobación condicionada aceptadas por el usuario en el ADR 0007. Esto produce evidencia para F3, sin anunciar ese módulo como construido.
