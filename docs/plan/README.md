# PlatLab — Diseño y plan de implementación

Fecha de elaboración: 24 de septiembre de 2026. Revisión: 26 de septiembre de 2026. Estado: diseño y plan para orientar la implementación; todavía no hay software construido.

## Recomendación

Construir un **SaaS con un monolito modular**, una base PostgreSQL y módulos habilitados por espacio de trabajo independiente. Cada espacio tiene propietario transferible, administradores y miembros con funciones distintas; una universidad puede contratar varios espacios sin mezclar sus datos. Distinguir espacio, titular jurídico, identidad personal y contrato. Mantener TypeScript y Supabase, usar React + Vite y alojar sus archivos estáticos en Cloudflare. Concentrar negocio en una API Node.js + Fastify y un proceso de tareas del mismo monolito.

Tu prioridad confirmada es **ofrecer paquetes diferentes a varios clientes desde el inicio**. La primera oferta será Núcleo + Reactivos, Núcleo + Equipos y su combinación; Laboratorios + Prácticas llegan después, incluyendo docentes y tesistas. Has confirmado que la proforma era conceptual y puede cambiar. La nube sigue siendo la recomendación; evaluar necesidades sin Internet con los clientes.

La revisión incorpora consola del operador del SaaS, cuotas, correo Resend, respaldo externo R2, observabilidad Better Stack y actualización de panel cada 30 segundos. Sustituye los plazos anteriores por fases con dependencias y criterios de salida, y separa inmutabilidad del historial de las obligaciones de eliminación.

La práctica será el centro de la operación integrada cuando esté contratada. Un cliente que solo necesita inventario podrá usarlo de manera completa sin contratar prácticas.

## Documentos

| Archivo | Para qué sirve |
|---|---|
| [01 — Evaluación](01_evaluacion.md) | Qué conservar, qué corregir y qué falta validar en las ideas actuales |
| [02 — Arquitectura](02_arquitectura.md) | Stack, monolito, límites de módulos, core, permisos y contratos |
| [03 — Dominio y datos](03_dominio_y_datos.md) | Modelo PostgreSQL, estados, inventario, reservas, transacciones e integridad |
| [04 — Infraestructura](04_infraestructura.md) | Nube, alternativa con túnel, ambientes, despliegue, backups y costos |
| [05 — Experiencia y diseño](05_experiencia_y_diseno.md) | Cómo conservar y mejorar el diseño de las 15 páginas del PDF |
| [06 — Roadmap](06_roadmap.md) | Fases, entregables, dependencias, aceptación y primeras tareas |
| [07 — Revisión y decisiones](07_decisiones_revision.md) | Evaluación de las observaciones y decisiones resueltas con tus respuestas |
| [08 — Ciclo del cliente y datos](08_ciclo_cliente_y_datos.md) | Estados, salida, exportación, conservación, eliminación y fuentes normativas |
| [09 — Producto y paquetes](09_producto_y_paquetes.md) | Espacios, roles, paquetes y oferta de producto que sustituye el alcance conceptual anterior |
| [10 — Acceso institucional y docentes](10_acceso_institucional_y_docentes.md) | Incorporación masiva, permisos para solicitar recursos, aislamiento entre clientes y diagramas |

Para esta revisión, leer primero el documento 07 y después el roadmap; consultar los demás al diseñar cada entrega.

## Decisiones que guían el trabajo

1. El espacio de trabajo define aislamiento y módulos; la entidad contratante puede agrupar varios espacios independientes. Su propietario administra acceso y puede transferir esa responsabilidad.
2. Módulo contratado, módulo habilitado y permiso de usuario son conceptos diferentes.
3. Las operaciones críticas se confirman en el servidor y en una transacción de base de datos.
4. Reservar, entregar y consumir son operaciones diferentes.
5. Desactivar un módulo permite resolver pendientes y consultar durante la relación autorizada; la terminación del encargo y los derechos sobre datos siguen otro procedimiento.
6. Las alertas esenciales pertenecen al módulo operativo; los análisis avanzados pueden venderse aparte.
7. ReactiLab aporta referencias reutilizables, pero requiere un núcleo de datos nuevo.
8. Las fases construyen paquetes utilizables; no se ofrecerán como disponibles módulos aún no implementados.

## Cómo se relaciona con los documentos anteriores

Se revisaron [el PRD conceptual](../PRD_Plataforma_Gestion_Laboratorios.md), [la proforma modular](../Proforma_Gestion_Laboratorios_Modular_v2.html), las 15 páginas de [Propuesta.pdf](../Propuesta.pdf) y una muestra del código local de ReactiLab.

Los originales se conservan como antecedentes. El documento 09 sustituye el alcance de la proforma v2; el HTML original no representa la oferta vigente. Sus precios, reglas y promesas no se consideran validados por estar escritos. Las preferencias confirmadas prevalecen sobre el orden del MVP original y están registradas en el documento 07.

Las referencias oficiales están enlazadas junto a las decisiones correspondientes. Los volúmenes, costos y objetivos operativos son hipótesis que deben medirse antes de contratar condiciones de servicio. El roadmap no fija fechas ni una dedicación semanal supuesta.
