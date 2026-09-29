# Revisión crítica y decisiones — 26 de septiembre de 2026

Estado: decisiones técnicas y respuestas del usuario incorporadas. Este documento responde al informe de revisión sin asumir que todas sus observaciones son correctas. Las tres consultas de negocio están resueltas; las validaciones operativas restantes tienen una fase asignada.

## 1. Resultado de la evaluación

Se mantiene el monolito modular, TypeScript, frontend estático, API Node y PostgreSQL. La revisión mejora alcance, operación y límites comerciales; no aporta una razón suficiente para cambiar a microservicios ni autoalojar toda la plataforma.

| Observación | Evaluación | Resolución |
|---|---|---|
| F1 y la primera oferta tienen plazos poco realistas | Aceptada la falta de sustento; tampoco se valida automáticamente la estimación alternativa | Se retiran las estimaciones previas. Por indicación del usuario, el plan usa dependencias, entregables y criterios de salida, sin fechas ni dedicación semanal supuestas |
| Posponer soporte temporal, envases y retornos | Parcialmente aceptada | Diferir soporte interactivo; envases según necesidad; partidas de retorno en F3. No diferir aislamiento, atomicidad ni recuperación |
| Automatizar `draining` es necesario desde F1 | No | Transición manual auditada; la API comprueba expiración y bloquea nuevas operaciones sin depender del scheduler |
| Cliente equivale a institución | Demasiado ambiguo | Espacio independiente con propietario y equipo; una universidad puede tener varios espacios bajo el mismo titular jurídico |
| M4 de la proforma contradice F3 | Aceptada; el usuario confirma que era conceptual | Mantener M4 en F3. El documento 09 sustituye el alcance comercial anterior |
| M8 pierde las alertas | Inexacta | Conserva alertas avanzadas, resúmenes y escalamiento. Los avisos indispensables pertenecen al módulo operativo |
| US$ 100/mes es inviable | No puede concluirse para todo escenario | Comparar costos repartidos entre clientes, uso y soporte; no prometer dedicado ni soporte ilimitado con ese precio |
| No existe consola de operador | Estaba insinuada, faltaba especificación | `/ops`, API administrativa, operadores con MFA y permisos separados; implementación mínima en F1 |
| “Nunca borrar” es incompatible con protección de datos | Aceptada como defecto de redacción/diseño | Inmutabilidad operativa y disposición autorizada son procedimientos distintos; nuevo documento 08 |
| Falta aceptación del solicitante y cancelación explícita | Aceptada | Estado en la revisión pendiente, aceptación del docente/tesista, reserva vigente preservada y `cancelled` con conciliación independiente |
| Se pierde Realtime al cerrar Data API | Inexacta | Broadcast privado sigue siendo posible; elegir polling visible cada 30 s al inicio |
| Falta elegir servicios | Aceptada | Resend, R2 y Better Stack; región candidata Virginia/North Virginia, sujeta a prueba |
| Faltan cuotas por cliente | Aceptada | Límites de frecuencia, almacenamiento y tareas; cuotas persistentes y reparto de trabajo, no solo contador local |
| Falta réplica de lectura | No es un hueco del MVP | Considerarla solo con contención analítica medida; nunca como autoridad de disponibilidad |
| Next.js aparece en evaluación | Era una comparación retórica que confundía | Texto corregido; recomendación sigue React/Vite + API Node |
| Incidencias tiene dos propietarios | Aceptada | Capacidad y esquema `incidents`, introducidos en F2; no tablas de incidencias dentro de Core |
| Impresión y logos indefinidos | Aceptada | Branding por espacio y HTML/CSS de impresión desde una revisión autorizada; PDF por navegador |

El [roadmap](06_roadmap.md) detalla secuencia y criterios. [Infraestructura](04_infraestructura.md) documenta proveedores y presupuesto. [Dominio](03_dominio_y_datos.md) define estados, cuotas y autoridades.

## 2. Correcciones a la explicación de arquitectura

- «Una vez desplegado» significa un producto común, no una sola instancia para siempre. Existen ambientes y puede haber réplicas de API/worker con la misma versión y contratos compatibles.
- API/worker son la vía ordinaria al dominio. Auth, Storage, migraciones, respaldos y procedimientos administrativos también necesitan accesos acotados a PostgreSQL.
- Los archivos usan normalmente enlaces firmados directos. Descargas con revocación inmediata o verificaciones específicas pueden requerir paso por backend.
- Las dependencias se controlan mediante inversión de puertos y límites de módulos. `dependency-cruiser` comprueba importaciones; no prueba integridad SQL ni transacciones.
- Un rechazo puede ocurrir antes de abrir transacción. La auditoría de éxito se confirma con el negocio; los intentos fallidos requieren un log separado que sobreviva al rollback.
- Región cercana reduce una fuente de latencia; no crea red privada entre Render y Supabase. La selección concreta debe medirse.

Referencias técnicas: [dependency-cruiser](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md), [regiones Render](https://render.com/docs/regions), [Broadcast privado](https://supabase.com/docs/guides/realtime/broadcast).

## 3. Decisiones resueltas con el usuario

| ID | Respuesta recibida | Decisión aplicada |
|---|---|---|
| D-01 | Espacios independientes, propietario que incorpora administradores/operadores, contemplar docentes/tesistas y vender a más universidades | Un propietario transferible por espacio, identidad compartida entre espacios y permisos por función; titular jurídico separado. Docentes/tesistas con flujos propios en F3 |
| D-02 | La proforma solo era una idea; elegir la mejor solución para comercializar | Sustituir su alcance por la oferta del documento 09; inventarios en F2, Agenda/Prácticas en F3; originales conservados como antecedentes |
| D-03 | La capacidad semanal y los plazos no son relevantes; se necesita un plan lógico | Fases por dependencias, resultados comprobables y puertas de salida; sin calendario ficticio |

La propiedad es gobierno de acceso, no titularidad personal de los datos ni licencia ligada a una cuenta. El propietario puede nombrar administradores y técnicos sin recibir automáticamente facultades de aprobación o ajuste. La universidad y el contrato continúan aunque cambie esa persona.

Validaciones siguientes: muestras de inventario/envases en F0; conectividad, proveedores y recuperación en F1; precio y soporte de lanzamiento antes de publicar la oferta; políticas de cambios y participación académica antes de F3. El plan propone valores de partida cuando procede; estas validaciones no reabren las tres decisiones resueltas.

## 4. Cómo resolver la diferencia comercial

La proforma v2 se conserva como antecedente. [Producto y paquetes](09_producto_y_paquetes.md) es la definición comercial vigente del diseño; no reutilizar el HTML histórico como oferta actual.

Primera oferta con inventario químico, equipos o ambos; Agenda y Prácticas como siguiente entrega. M8 se denomina **Analítica y alertas avanzadas**. Las alertas de caducidad, stock y averías se incluyen en los módulos que necesitan esos controles.

Separar en la nueva oferta: desarrollo de producto todavía pendiente, incorporación/migración del cliente y servicio recurrente con límites. No cobrar implícitamente a cada nuevo cliente una reconstrucción del mismo módulo ni prometer soporte sin alcance.

La infraestructura compartida presupuestada en la revisión es aproximadamente US$ 150–185/mes, sin trabajo humano ni PITR; no es un costo por cliente. Para evaluar una tarifa por espacio, usar número conservador de clientes y costo marginal: infraestructura asignada + soporte pactado + mantenimiento + contingencia + margen. El alcance comercial queda definido; la tarifa de venta requiere validar costos y condiciones de servicio, no escoger un número arbitrario.

## 5. Protección de datos: cambio material

El plan incorpora salida y exportación, disposición de datos por repositorio, identidades compartidas y compatibilidad de respaldos. El historial no se conserva para siempre por llamarse auditoría. La relación responsable/encargado y las instrucciones de salida deben quedar documentadas; los detalles y fuentes están en [ciclo del cliente y datos](08_ciclo_cliente_y_datos.md).

La resolución SPDP de 2025 contempla términos específicos para actuaciones del encargado al recibir eliminación y al terminar la relación; no se sustituirán por una gracia comercial genérica. Validar la ejecución con proveedores y asesoría antes del piloto. [Resolución SPDP-SPD-2025-0030-R, arts. 23–24](https://spdp.gob.ec/wp-content/uploads/2025/08/0030-R.pdf).

No se declara cumplimiento por elegir una región, cifrar copias o disponer de un botón de borrar. Tampoco se abandona la nube por anticipado: se verifica qué puede ejecutar cada proveedor y se ajusta la solución si aparece una incompatibilidad concreta.
