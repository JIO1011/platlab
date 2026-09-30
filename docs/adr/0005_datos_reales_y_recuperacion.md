# ADR 0005 — Datos reales, respaldos y administración privilegiada

Estado: aceptado como criterio de diseño; capacidades contractuales/técnicas deben validarse antes del piloto. Revisión: 29 de septiembre de 2026.

## Demo y trial

La demo usa datos sintéticos. Un trial o piloto **puede usar inventario real** mediante la puerta G1 del [roadmap](../plan/06_roadmap.md): primero se autoriza la carga controlada con garantías de tratamiento y funcionalidad ya comprobadas; tras conciliar el inventario y obtener aceptación, se habilita operación. No necesita esperar a la venta abierta de todos los paquetes. El roadmap define estas comprobaciones y su evidencia.

El alta registra versión y aceptación del encargo por persona autorizada, espacio, finalidad e instrucciones. El propietario funcional no se presume representante jurídico. La aceptación contractual se acompaña de seguridad, proveedores, recuperación, exportación y disposición operables para los módulos del piloto. Un checkbox no demuestra por sí solo estas condiciones. La especificación normativa y de salida está en [ciclo del cliente](../plan/08_ciclo_cliente_y_datos.md).

## Respaldos y eliminación

Retirar la retención externa de 30 días como valor asumido para producción. Tampoco aprobar automáticamente una de 7 días. La retención normal se fija por repositorio y necesidades verificadas; una solicitud de eliminación o fin de encargo activa un procedimiento propio, que puede exigir eliminación anticipada.

La norma citada distingue términos de tres días para eliminación comunicada al encargado y cinco al terminar la relación; no son intercambiables. Incluso bajo una interpretación de días hábiles, siete naturales no demuestra cumplimiento de ambos supuestos. La edad del snapshot no es el inicio del procedimiento. Validar cómputo, alcance y excepciones con asesoría. [Resolución SPDP-SPD-2025-0030-R, arts. 23–24](https://spdp.gob.ec/wp-content/uploads/2025/08/0030-R.pdf).

Conservar un registro minimizado de supresiones independiente del snapshot y reaplicarlo antes de abrir una restauración. Esto evita reintroducción; no demuestra destrucción del backup antiguo. Verificar todas las copias: BD, Auth, archivos, R2, exportaciones, logs y proveedores. Una rotación lifecycle no garantiza supresión selectiva dentro de un backup global.

Los siete respaldos diarios de Supabase Pro no acreditan borrado selectivo por workspace. Su DPA y condiciones de eliminación necesitan revisión por servicio y evidencia del proveedor: cerrar un espacio no cierra el proyecto compartido. Si persiste incompatibilidad real, cambiar capacidades/proveedor o modalidad antes de tratar datos reales bajo esas condiciones; no bloquear la demo sintética. [Backups](https://supabase.com/docs/guides/platform/backups), [DPA Supabase](https://supabase.com/legal/customer-resources/data-processing-addendum).

## Tres caminos administrativos

1. Consola operadora: contratos y configuración, sin permiso implícito de lectura de inventario.
2. Automatización: migraciones, copias y disposición con credenciales específicas y trazabilidad. Las migraciones rutinarias se ejecutan por pipeline, no se etiquetan como emergencias.
3. Intervención excepcional de infraestructura: lista nominativa mínima de custodios, MFA, motivo, alcance, duración, evidencia y revisión posterior. No fijar «máximo dos personas» como obligación legal o necesidad técnica universal.

La auditoría de negocio no captura automáticamente todas las consultas del dashboard, backups ni roles privilegiados. Pro permite exigir MFA, pero esto no protege por sí solo PAT existentes; inventariar y revocar tokens innecesarios. La auditoría de plataforma y ciertos roles limitados requieren otros planes: verificar cobertura/costo antes de prometerla. Tickets externos y logs SQL disponibles son evidencias complementarias, no sustitutos de registros inexistentes. [MFA de organización](https://supabase.com/docs/guides/platform/mfa/org-mfa-enforcement), [Platform Audit Logs](https://supabase.com/docs/guides/security/platform-audit-logs), [control de acceso](https://supabase.com/docs/guides/platform/access-control).

El contrato describe acceso excepcional y obligaciones reales. No se promete imposibilidad técnica de acceso del proveedor cuando administra base, backups y despliegues.
