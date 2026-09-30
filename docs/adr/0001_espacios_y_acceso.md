# ADR 0001 — Espacios de trabajo y autorización

Estado: aceptado. Fecha: 28 de septiembre de 2026. Sustituye los nombres técnicos anteriores del plan; mantiene el aislamiento y las decisiones de propiedad ya acordadas.

## Decisión

- Entidad SQL: `core.workspaces`, PK `id`. FK de las tablas del espacio: `workspace_id`. API: `/v1/workspaces/:workspaceId`; cuerpo/query usan `workspace_id` cuando corresponde. UI en español: «Espacio de trabajo».
- Titular jurídico: `platform.customer_accounts`. Puede contratar varios espacios; no equivale a usuario, propietario ni universidad obligatoriamente.
- `tenant` queda como término conceptual de multi-tenancy, no como un segundo identificador o nombre SQL. No existen migraciones productivas que obliguen a mantener alias antiguos.
- Una identidad tiene membresías locales. Un propietario por espacio puede delegar roles; el proveedor aplica módulos publicados según suscripción. El propietario puede recibir funciones operativas adicionales, sin saltarse reglas de aprobación propia.
- Para el MVP, catálogo de roles, permisos y matriz de delegación **fijos en código y versionados**. Guardar en SQL sus definiciones sincronizadas por migración y asignaciones por espacio/ámbito; sin editor de roles personalizados. Los comandos y el canje de invitación consultan la misma política, evitando dos autoridades editables.
- Aislamiento en API, RLS con rol limitado, FKs compuestas, archivos, jobs, exportaciones y caché. El contexto SQL se deriva de identidad y membresía comprobadas.

No se crea una aplicación por universidad ni una tabla por cliente. Un dedicado conserva producto y migraciones comunes, si una necesidad contractual u operativa lo justifica.

## Consecuencias

La UI mantiene el término español; eso no constituye otra entidad. `workspace_id` identifica tanto un espacio universitario como empresarial. El nombre no sustituye los controles de aislamiento.

Ubicación física se implementa en F1a. Las unidades administrativas se difieren: T-02 debe demostrar que no se confundieron ambos conceptos, no crear una tabla de unidades vacía. Jerarquía y comprobación de ámbitos: [ADR 0006](0006_sql_y_pruebas.md).

El detalle de campos e invariantes pertenece a [dominio](../plan/03_dominio_y_datos.md); las invitaciones y vistas de docentes, a [acceso institucional](../plan/10_acceso_institucional_y_docentes.md).
