# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

**PlatLab** — plataforma SaaS multi-institución para gestionar laboratorios universitarios. Fase de **diseño**: el repositorio solo contiene documentación; todavía no hay código, `package.json`, comandos de build/lint/test ni infraestructura desplegada. Cuando se cree el monorepo (tarea T-01 del roadmap), reemplazar esta sección con los comandos reales, incluido cómo ejecutar un solo test.

Documentos y jerarquía:

- `docs/PRD_Plataforma_Gestion_Laboratorios.md` — PRD v1.0: visión y alcance funcional.
- `docs/plan/` — diseño técnico y plan de implementación. **Prevalece sobre el PRD** donde lo corrige explícitamente (orden del MVP, estados, modelo de cantidades); `01_evaluacion.md` justifica cada cambio. Leer primero `docs/plan/README.md` y `06_roadmap.md`.
- `docs/Proforma_Gestion_Laboratorios_Modular_v2.html` — antecedente conceptual (precios por módulo, licencia anual, simulador de dependencias). El usuario autorizó reemplazar su alcance: `docs/plan/09_producto_y_paquetes.md` define la oferta actual; precios históricos no validados.
- `docs/Propuesta.pdf` — 15 páginas de mockups; la dirección visual derivada (tokens, pantallas, estados) está en `docs/plan/05_experiencia_y_diseno.md`.

## ROL

Actúa como experto senior en desarrollo de software full-stack, product manager, UX/UI y marketing para ser estrategico, aplicar buenas practicas. Analiza, evalúa y propone la mejor solución. Responde de manera resumida y en alto nivel.

## MCP

- context7 para documentación de librerías.
- codebase-memory para analizar código (local) hay skill global.

## Arquitectura decidida (`docs/plan/02`–`04`)

- **Monolito modular SaaS**: un código y una versión, una base PostgreSQL compartida, espacios independientes aislados por `tenant_id`, módulos por espacio. Una universidad puede tener varios espacios bajo el mismo titular jurídico. Cada espacio tiene propietario transferible y miembros; licencia y datos no pertenecen a su identidad personal. Sin microservicios ni despliegues por cliente o por módulo; un cliente dedicado es una excepción cotizada con el mismo código y migraciones.
- Stack: TypeScript estricto · SPA React + Vite (React Router, TanStack Query, React Hook Form + Zod, Tailwind + Radix/shadcn) · API Node 24 + Fastify (cada módulo es un plugin encapsulado) · `pg` con SQL parametrizado, sin ORM · Supabase (PostgreSQL, Auth, Storage privado) · pnpm workspaces, ESLint, Vitest, Playwright.
- Hosting: SPA en Cloudflare Workers Static Assets; API (Web Service) y worker (Background Worker) en Render desde la misma imagen; Supabase Pro. Alternativa: VPS + Cloudflare Tunnel con el mismo Dockerfile.
- Estructura a crear: `apps/web` (`app/`, `features/`, `operator/` para `/ops`), `apps/server` (`entrypoints/api.ts` y `worker.ts`, `modules/<módulo>/{domain,application,infrastructure,http}`, `capabilities/{inventory,scheduling,incidents}`, `platform/`), `packages/contracts` (DTO/Zod/errores, sin acceso a BD), `packages/ui`, `supabase/migrations`, `infra/`.
- Servicios propuestos: Resend, R2 para copias externas y Better Stack; región candidata Render Virginia + Supabase North Virginia, pendiente de medición. Polling visible de paneles cada 30 segundos; revalidación autoritativa de comandos siempre en API.

### Invariantes

- **La API es la autoridad del negocio.** El navegador usa Supabase solo para Auth y para URLs firmadas de Storage emitidas por la API. Los esquemas de dominio son privados: nada de Data API/PostgREST ni CRUD directo desde el cliente.
- Cada operación de dominio: verificar JWT (firma, emisor, audiencia, expiración) → abrir transacción con un rol SQL sin propiedad de tablas ni `BYPASSRLS` → `set_config(..., true)` de actor y tenant → comprobar membresía, permiso, alcance y clase de acción del módulo → ejecutar todo con el **mismo cliente `pg`**. El `organization_id` que envía el navegador es una selección, nunca una autorización. No usar `postgres` ni `service_role` para SQL de negocio; credenciales privilegiadas de Auth/Storage quedan encapsuladas y separadas.
- RLS por tenant es la **segunda barrera**; permisos, transiciones y reglas se validan en la API.
- Toda tabla institucional lleva `tenant_id NOT NULL`, `UNIQUE(tenant_id, id)` y **FKs compuestas que incluyen `tenant_id`**.
- Las migraciones SQL de `supabase/migrations/` son la única autoridad del esquema. Migraciones aditivas; sin `down` destructivo automático.
- Comandos explícitos (`POST /v1/orgs/:org/activities/:id/approve`) en lugar de `PATCH` libre sobre estados o saldos. Los comandos críticos llevan clave de idempotencia y versión esperada, y devuelven errores con código estable (`INSUFFICIENT_STOCK`, `SCHEDULE_CONFLICT`, `VERSION_CONFLICT`, `MODULE_READ_ONLY`).
- Cantidades: `numeric` en BD y **strings decimales** en JSON; nunca operar con `number` de JavaScript.
- Inventario como **ledger**: `inventory.entries` inmutables para operación ordinaria, saldos como proyección y correcciones mediante operaciones compensatorias. Disposición autorizada y protección de datos siguen `docs/plan/08`; inmutabilidad no implica retención perpetua. Nunca `GREATEST(0, …)` ni datos inventados (caducidad desconocida ≠ vigente).
- Los efectos externos (correo, exportaciones) salen por **outbox** en la misma transacción; el worker entrega al menos una vez y sus consumidores son idempotentes.
- Conflictos de agenda con `EXCLUDE USING gist` sobre `tstzrange` `[inicio, fin)`.
- Sin Redis, Kafka, Elasticsearch, motor BPM, microfrontends ni event sourcing mientras no haya un problema medido.

### Módulos, dependencias y activación

| # | Módulo | Depende de |
|---|--------|-----------|
| 1 | Núcleo (espacios, propiedad, identidades, membresías, roles con alcance, ubicaciones, config, entitlements, documentos, auditoría) | — (obligatorio) |
| 2 | Reactivos | 1 |
| 3 | Equipos | 1 |
| 4 | Laboratorios (agenda de espacios) | 1 |
| 5 | Prácticas y Solicitudes | 1 + 4; integra 2, 3 y 6 solo si están habilitados |
| 6 | Materiales y Préstamos | 1 |
| 7 | Mantenimiento | 1 + 3 |
| 8 | Analítica y alertas avanzadas | 1 + ≥1 módulo operativo |

`inventory`, `scheduling` e `incidents` son capacidades internas compartidas, no módulos comerciales. Las alertas esenciales (caducidad, stock mínimo, averías) pertenecen a cada módulo operativo, no a Analítica.

Habilitación de nuevas operaciones = módulo publicado + derecho vigente (`core.tenant_entitlements`) + estado operativo + dependencias + permiso + alcance. Estados: `disabled → enabled → draining → read_only`. Desactivar no borra datos: bloquea operaciones nuevas, permite resolver pendientes y conserva consulta/exportación durante el acceso autorizado. Terminar el encargo activa disposición, no conservación ilimitada. La API aplica vencimiento aunque `draining` se actualice manualmente. Módulo contratado ≠ bandera de despliegue ≠ permiso de usuario; ocultar el menú no es un control, la API deniega.

Límites entre módulos: se usa solo la interfaz pública de otro módulo; Core no importa módulos comerciales; cada tabla la escribe su módulo propietario; un caso de uso puede coordinar varios módulos en la misma transacción; el frontend no importa código del servidor. CI usa dependency-cruiser para importaciones y pruebas PostgreSQL para restricciones/atomicidad.

## Modelo de dominio (`docs/plan/03`)

- La práctica es el centro de la operación **cuando el módulo 5 está contratado**; Reactivos y Equipos son productos completos por sí solos.
- Reservar ≠ entregar ≠ consumir. Disponible asignable = saldo utilizable − reservas activas. Aprobar crea las reservas en la misma transacción; preparar mueve cantidades a custodia de la actividad; el cierre registra consumo, devolución (a cuarentena si no está verificada) y pérdidas, sin dejar nada sin conciliar.
- Workflow: `draft → submitted → scheduled → preparing → ready → running → closing → completed`, más `changes_requested → draft`, `rejected` y `cancelled` con conciliación separada. Una revisión del técnico usa `awaiting_requester_acceptance`; el docente/tesista acepta antes de aprobación técnica y reserva atómicas. Una propuesta pendiente no reemplaza reservas vigentes. La validación automática produce resultados fechados, no un estado.
- Equipos: condición física (`operational | restricted | faulted | retired`) separada de agenda y custodia; "disponible" se calcula para un intervalo (sustituye los estados del PRD).
- El cronograma es una consulta de `scheduling.*_bookings`, nunca una segunda fuente editable.
- Identidad global (Supabase Auth) → membresía por tenant → principal humano/servicio; soporte interactivo diferido. Propietario único vía `owner_membership_id`, administradores y técnicos; docentes/tesistas en F3. Roles con alcance por ubicación, facultades delegables separadas de ejecutables; administrar no implica permisos operativos. Operadores SaaS usan autorización propia y MFA, sin acceso general al dominio.
- Muchos docentes: invitaciones por CSV en F3 sobre Core, aceptación personal y rol/ámbito autorizado; email institucional o registro Auth no otorgan membresía. Solicitar recursos no concede gestión de inventarios. Al aprobar se revalida elegibilidad del solicitante además de permisos técnicos. Ver `docs/plan/10_acceso_institucional_y_docentes.md`.

## Roadmap (`docs/plan/06`)

F0 validación con clientes → F1 Core multi-tenant (propiedad, auth, entitlements, consola SaaS, auditoría, outbox, cuotas y recuperación) → **F2 MVP comercial: Core + Reactivos y Core + Equipos, o ambos** → F3 Laboratorios + Prácticas/Investigación → F4 Materiales, préstamos y transferencias → F5 Mantenimiento + Analítica y alertas avanzadas. F4 puede adelantarse tras F2 para su operación independiente. Plan por dependencias y aceptación, sin calendario ni horas supuestas. T-00 está resuelta; el primer trabajo de código es T-01 (monorepo + CI) y T-02 (Core + roles SQL). Las pruebas de RLS, bloqueos y restricciones se hacen contra PostgreSQL real, no con mocks.

## ReactiLab (`/home/jio/Documentos/Inventario_V1`)

Referencia para UI, formularios, organización por features y caché por organización. **No** copiar su persistencia: descuenta con `GREATEST(0, …)`, separa saldo e historial en llamadas distintas, aprueba sin bloqueo, completa caducidades y densidades por defecto y tiene migraciones divergentes (detalle en `docs/plan/01_evaluacion.md`). Revisar propiedad y licencia antes de reutilizar código.

## Validaciones antes de implementar cada flujo

Están decididos los espacios independientes, propiedad transferible, funciones de docentes/tesistas, aceptación de propuestas, cancelación explícita y reemplazo de la proforma conceptual. Validar con casos reales: detalle de cambios sustanciales, anticipación configurable, reglas de transferencias/devoluciones, seguimiento por envase y conservación por categoría. El plan propone autoaprobación deshabilitada por defecto. Consultar solo huecos materiales no resueltos; no repetir las preguntas de `07`. Fuera de alcance: app nativa, ERP/compras, facturación/pasarela de pago, SSO, operación offline, hardware e IA.
