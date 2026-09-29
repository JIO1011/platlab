# Producto, espacios y paquetes

Fecha: 26 de septiembre de 2026. Definición de producto basada en las respuestas del usuario. Sustituye el alcance comercial de la proforma conceptual; no es una cotización ni afirma que los módulos estén construidos.

## 1. Qué se vende

PlatLab es un servicio para gestionar recursos y operación de laboratorios universitarios. Se contrata por **espacio de trabajo independiente**, con un paquete de módulos, usuarios autorizados, límites y condiciones de servicio. El producto y sus actualizaciones son comunes a todos los clientes.

Una universidad puede contratar un espacio para varios laboratorios o varios espacios para departamentos que operan por separado. El titular jurídico se registra una sola vez cuando corresponde; no se convierte automáticamente en administrador de todos esos espacios.

Ejemplo: Química y Biología pertenecen a la misma universidad, pero contratan por separado. Cada departamento tiene espacio, propietario, equipo y módulos propios. Una docente puede pertenecer a ambos y cambiar de espacio; esa pertenencia no comparte existencias ni reservas. Si Química administra tres laboratorios, estos son ubicaciones dentro de su espacio, con permisos por ubicación.

La licencia pertenece al espacio, no a la persona que lo creó. Cambiar de propietario no cambia los datos, el contrato ni el paquete. Compartir o fusionar inventarios entre espacios queda fuera del lanzamiento y requerirá un proyecto explícito de integración/migración.

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

1. El operador registra titular, espacio, condiciones, paquete y límites; envía invitación al propietario. El espacio queda en `provisioning`.
2. El propietario verifica su identidad y acepta. El espacio pasa a prueba o activo, según las condiciones autorizadas; configura marca, ubicaciones y equipo.
3. La incorporación valida/importa datos, comprueba saldos y permite operar el paquete contratado.
4. El propietario o representante autorizado solicita ampliaciones. El proveedor aplica derechos, vigencia y límites; el cliente no se autoasigna licencias.
5. Desactivar un módulo bloquea operaciones nuevas y permite resolver pendientes según la política de continuidad. Terminar el servicio inicia exportación y disposición de datos, con sus autorizaciones y obligaciones propias.

La administración de propiedad no equivale a representación jurídica. Cierre contractual y eliminación requieren instrucciones de quien esté autorizado para ello. Los procedimientos están en [dominio](03_dominio_y_datos.md) y [ciclo del cliente](08_ciclo_cliente_y_datos.md).

## 5. Cómo estructurar la oferta económica

Recomendación: una suscripción por espacio y paquete, con límites de uso y soporte descritos; incorporación y migración presupuestadas por separado según calidad de los datos. La contratación puede ser mensual o anual sin alterar el modelo de módulos. No cobrar una reconstrucción del producto común a cada universidad.

Separar tres conceptos: desarrollo de capacidades aún no disponibles, incorporación de un cliente y servicio recurrente. El servicio dedicado o en servidor del cliente es una modalidad adicional con costos y responsabilidades propios; no forma parte de la tarifa compartida estándar.

No se valida el precio histórico de US$ 100/mes ni se declara imposible para cualquier escenario. Antes de publicar tarifa, calcular ingreso menos infraestructura asignada, soporte comprometido, mantenimiento y contingencia, usando un número conservador de clientes. El presupuesto de infraestructura de [04](04_infraestructura.md) es compartido y excluye trabajo humano; no demuestra por sí solo rentabilidad.

La ficha de cada oferta debe precisar módulos disponibles, espacios incluidos, usuarios/almacenamiento/importaciones, incorporación, horario y alcance de soporte, renovación, recuperación, exportación y salida. Las cuotas técnicas iniciales protegen al sistema; no se presentan como cupos comerciales definitivos sin validarlas.

## 6. Orden recomendado para lanzar

Primero completar la base común y probar dos clientes sintéticos aislados. Después validar Reactivos y Equipos como productos completos, individualmente y combinados. Publicar esas tres configuraciones cuando funcionen la incorporación, los movimientos, los permisos, la recuperación y la salida.

Agregar después Agenda y Prácticas/Investigación usando el mismo inventario. Mantener como referencia visual el PDF, adaptando navegación, solicitudes y marca a los módulos y funciones realmente disponibles. [Experiencia y diseño](05_experiencia_y_diseno.md) describe esa evolución.

El siguiente trabajo es F0 y el inicio de F1 del roadmap. No hace falta escoger una fecha ficticia ni construir todos los módulos para empezar a implementar; sí demostrar cada entrega antes de venderla como disponible.
