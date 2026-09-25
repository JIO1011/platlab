# PlatLab — Diseño y plan de implementación

Fecha de elaboración: 24 de septiembre de 2026. Revisión final: 25 de septiembre de 2026. Estado: propuesta técnica para orientar la implementación; todavía no hay software construido.

## Recomendación

Construir un **SaaS con un monolito modular**, una base PostgreSQL y módulos habilitados por institución. Mantener TypeScript y Supabase, usar React + Vite para la aplicación y alojar sus archivos estáticos en Cloudflare. Concentrar las reglas de negocio en una API Node.js + Fastify, desplegada en un servicio administrado, junto con un proceso de tareas del mismo monolito.

Tu prioridad confirmada es **ofrecer paquetes diferentes a varios clientes desde el inicio**. Por eso la primera oferta será Núcleo + Reactivos y Núcleo + Equipos, con aislamiento entre instituciones y activación de módulos ya probados. Laboratorios + Prácticas será la siguiente ampliación. La nube es la recomendación inicial; las necesidades de operación sin Internet deben evaluarse con los clientes.

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

Leer primero este índice y el roadmap; consultar los demás al diseñar cada entrega.

## Decisiones que guían el trabajo

1. Una institución es un cliente independiente; sus laboratorios no son clientes distintos.
2. Módulo contratado, módulo habilitado y permiso de usuario son conceptos diferentes.
3. Las operaciones críticas se confirman en el servidor y en una transacción de base de datos.
4. Reservar, entregar y consumir son operaciones diferentes.
5. Cada módulo conserva historial, exportación y resolución de pendientes al desactivarse.
6. Las alertas esenciales pertenecen al módulo operativo; los análisis avanzados pueden venderse aparte.
7. ReactiLab aporta referencias reutilizables, pero requiere un núcleo de datos nuevo.
8. Las fases construyen paquetes utilizables; no se ofrecerán como disponibles módulos aún no implementados.

## Cómo se relaciona con los documentos anteriores

Se revisaron [el PRD conceptual](../PRD_Plataforma_Gestion_Laboratorios.md), [la proforma modular](../Proforma_Gestion_Laboratorios_Modular_v2.html), las 15 páginas de [Propuesta.pdf](../Propuesta.pdf) y una muestra del código local de ReactiLab.

Los originales se conservan. Este plan propone cambios sobre ellos y registra por qué; sus precios, reglas y promesas no se consideran validados por el hecho de estar escritos. Las preferencias que confirmaste durante esta revisión prevalecen sobre el orden del MVP original.

Las referencias técnicas oficiales están enlazadas junto a las decisiones correspondientes. Los plazos, volúmenes y objetivos operativos de estos documentos son hipótesis de planificación: deben medirse y ajustarse en la fase 0, no presentarse como compromisos contractuales.
