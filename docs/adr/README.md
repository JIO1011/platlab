# Decisiones de arquitectura de PlatLab

Actualizado: 29 de septiembre de 2026. No hay software desplegado.

Los ADR registran decisiones, alternativas y motivos; no duplican el manual de implementación. Una decisión aceptada solo se reemplaza con otra que indique qué cambia. Una propuesta pendiente no se presenta como preferencia confirmada del usuario.

| ADR | Tema | Especificación operativa |
|---|---|---|
| [0001](0001_espacios_y_acceso.md) | Nombres, aislamiento y permisos | Modelo en `docs/plan/03`; flujos de usuarios en `docs/plan/10` |
| [0002](0002_contratos_y_derechos.md) | Autoridad de contratos, derechos y cuotas | Modelo en `docs/plan/03` |
| [0003](0003_refresco_y_limites.md) | Refresco, caché y límites HTTP | Este ADR contiene los valores iniciales; infraestructura los referencia |
| [0004](0004_identidad_y_operacion.md) | JWT, invitaciones, OAuth y consola del proveedor | Flujos en `docs/plan/10`; operación en `docs/plan/04` |
| [0005](0005_datos_reales_y_recuperacion.md) | Pruebas reales, respaldos y acceso privilegiado | Requisitos y fuentes jurídicas en `docs/plan/08` |
| [0006](0006_sql_y_pruebas.md) | SQL tipado, jerarquía de ubicaciones y pruebas | Modelo en `docs/plan/03` |
| [0007](0007_aprobacion_condicionada.md) | Asignación técnica, reubicación y aceptación condicionada | Aceptado el 29 de septiembre; flujo de actividades en `docs/plan/03` |

El [roadmap](../plan/06_roadmap.md) es la única autoridad de fases, puertas y dependencias. [Producto y paquetes](../plan/09_producto_y_paquetes.md) define la oferta; las cifras comerciales no se infieren de los ADR. [Revisión](../plan/07_decisiones_revision.md) relaciona las observaciones con estas resoluciones.

`CLAUDE.md` orienta la navegación y las invariantes: no debe volver a copiar matrices, parámetros o fases completas. En los documentos de diseño, sustituir las repeticiones de reglas por enlaces a su fuente. Las fechas indican revisión del archivo, no una obligación de editar todos los documentos cada día.
