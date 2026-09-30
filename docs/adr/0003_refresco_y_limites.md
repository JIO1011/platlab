# ADR 0003 — Refresco y protección de tráfico

Estado: aceptado. Fecha: 28 de septiembre de 2026. Sustituye polling general y límite único de 600 peticiones/minuto por espacio.

## Evaluación

Un endpoint cada 30 segundos produce 2 peticiones/minuto por usuario: 100 usuarios generan 200. Con tres endpoints serían 600, antes de comandos, reintentos y otros lectores. El riesgo es real, pero la cifra depende de las consultas por vista.

## Decisión de lectura

- Un endpoint agregado por vista activa, con campos autorizados y paginación para listas. No cargar todo el inventario en un agregado universal.
- Panel operativo del técnico: polling cada 30 segundos, solo visible, con jitter y retroceso ante errores/429. No ejecutar polling de todas las pestañas de la aplicación a la vez.
- Docentes/tesistas: carga inicial, cambio de filtros, regreso a la pestaña, reconexión, después de mutación y botón actualizar; sin polling periódico inicial. Mostrar última actualización y estado de datos antiguos.
- Las reservas se revalidan al confirmar; una pantalla actualizada no es una retención de stock.
- Sin contador global de cambios por espacio inicialmente: generaría invalidación innecesaria, posible contención y un indicador de actividad ajena al ámbito. Si se necesita, medir y limitar versiones al recurso/vista y autorización pertinentes.

ETag/304 es una optimización posterior a medir, no el remedio al rate limit: sigue habiendo petición y autorización. Respuestas iniciales de API privada usan `Cache-Control: no-store`. Si una vista adopta ETag, cambiar explícitamente a caché privada con revalidación, variante por identidad/espacio/ámbito/filtros y nunca caché CDN compartida; comprobar permiso **antes** de devolver 304 y no almacenar datos de otro usuario tras cambiar sesión. [Semántica 304](https://www.rfc-editor.org/rfc/rfc9110.html#name-304-not-modified), [caché HTTP](https://www.rfc-editor.org/rfc/rfc9111.html).

## Decisión de límites

Valores de arranque para pruebas, no capacidad prometida ni cupos de suscripción:

| Clase | Por actor y espacio | Por espacio |
|---|---:|---:|
| Lecturas autenticadas | 120/min | 3 000/min |
| Comandos de negocio | 30/min | 300/min |

Admisión de trabajos, exportaciones y cargas tiene sus propios límites persistentes. Tráfico sin identidad: control inicial por IP de 300/min, sujeto a ajuste para NAT universitario y protección de endpoints sensibles. Probar el origen directo, proxy confiable, encabezados falsificados y `Retry-After`. El presupuesto de lecturas no consume el de comandos; también se mide saturación real del pool/CPU para no confundir límites con capacidad.

Una API: `@fastify/rate-limit` en memoria, con límites por clase y advertencia operativa de que reinicios/despliegues pueden reiniciar o multiplicar temporalmente contadores. No usarlo como garantía de cuota contractual. Antes de múltiples réplicas estables, configurar Redis/servicio Redis compatible con incrementos atómicos y TTL; probar carga y política ante caída. No construir un contador por petición en PostgreSQL. [Plugin oficial](https://github.com/fastify/fastify-rate-limit).

Cloudflare Workers KV no es la alternativa para contadores estrictos: su consistencia y modelo de actualización no ofrecen un incremento global atómico. Un servicio llamado «Key Value» solo es válido aquí si proporciona las operaciones Redis requeridas; el nombre comercial no basta. [Consistencia de KV](https://developers.cloudflare.com/kv/concepts/how-kv-works/).

Cuotas de almacenamiento, puestos contratados si aplican, concurrencia y trabajos pendientes continúan en PostgreSQL con comprobación/reserva atómicas. El contador HTTP no confirma ni descuenta recursos de negocio.

## Evidencia antes del piloto

Simular docentes con cambios de foco, varios paneles técnicos, comandos e importaciones simultáneos. Registrar peticiones por clase, p95, 429, pool y progreso entre espacios; ajustar valores con resultados. No afirmar capacidad para 100 usuarios por una multiplicación de peticiones sin probar el resto del sistema.
