# ADR 0002 — Una autoridad operativa de derechos y límites

Estado: aceptado. Fecha: 28 de septiembre de 2026.

## Problema

Contrato, paquete, derechos y límites representan conceptos diferentes, pero permitir editar vigencias y cuotas en todos ellos produciría contradicciones. No basta con decidir qué tabla consultar: también hay que definir cómo se actualizan juntas.

## Decisión

`platform.package_definitions` identifica cada paquete; `platform.package_versions` define sus versiones inmutables publicadas, con módulos y límites predeterminados. Un cambio de precio o composición crea otra versión; no modifica clientes existentes.

`platform.contracts` identifica la relación con titular y espacio. `platform.contract_revisions` conserva la versión aceptada del paquete, excepciones autorizadas, vigencia y referencia documental. Es evidencia comercial, no otra tabla mutable de permisos consultada en cada petición.

Un comando administrativo `apply_contract_revision`:

1. Verifica operador, MFA, permiso, versión esperada e idempotencia.
2. Bloquea el contrato/espacio, valida paquete, módulos publicados y dependencias.
3. Aplica en la misma transacción la revisión y su proyección en `core.workspace_entitlements` y `platform.workspace_limits`, con `contract_id`, `contract_revision_id` y versión de aplicación comunes.
4. Registra auditoría y eventos; todos los efectos se confirman o se revierten juntos.

El runtime consulta **derechos efectivos y límites efectivos**, además de estado del espacio, membresía y permisos. No vuelve a interpretar el nombre del paquete ni hace tres evaluaciones independientes de vigencia.

Las FKs compuestas de ambas proyecciones incluyen `workspace_id` y la referencia a contrato/revisión; no admiten una revisión comercial de otro espacio.

MVP: una revisión comercial efectiva por espacio; la aplicación inmediata usa este comando. Para una fecha futura se conserva la revisión programada y su estado pendiente; no se concede anticipadamente. La expiración de derechos se valida en cada operación aunque falle el proceso administrativo. La renovación usa el mismo comando; un retraso no abre acceso indebidamente.

El estado operativo del módulo (`enabled`, cierre de pendientes, consulta) permanece separado del derecho comercial. Aplicar un paquete no reabre silenciosamente un módulo suspendido ni elimina obligaciones existentes. Una reducción de cuota bloquea nuevo consumo incompatible; no borra datos para ajustarlo.

Los contadores de uso y reservas son hechos operativos en PostgreSQL, no parte del contrato. El limitador HTTP es defensa de tráfico, no cupo comercial: [ADR 0003](0003_refresco_y_limites.md).

## Comprobación

No hay endpoint de edición libre de derechos/cuotas; las excepciones se registran como revisión de contrato. Probar reintentos, cambio de paquete concurrente con una operación y renovación fallida. Una comprobación de consistencia detecta proyecciones con revisión distinta; reparar mediante comando auditado, no una sincronización silenciosa que cambie permisos.

No se construye un motor de cobros, prorrateos ni múltiples suscripciones solapadas en el MVP. El [modelo](../plan/03_dominio_y_datos.md) conserva la estructura concreta.
