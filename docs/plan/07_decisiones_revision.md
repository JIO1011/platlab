# Revisión crítica y decisiones

Revisión: 29 de septiembre de 2026. Este archivo es el índice de evaluaciones; las decisiones técnicas viven en [ADRs](../adr/README.md). No repetir aquí parámetros, estados o matrices que ya tienen una fuente.

## Observaciones del 28 de septiembre

| Observación | Evaluación y resolución | Fuente |
|---|---|---|
| Nombres diferentes para el espacio | Aceptada: unificar SQL y API; la UI conserva el término español | [ADR 0001](../adr/0001_espacios_y_acceso.md) |
| Polling agota 600 peticiones/minuto | Riesgo válido; 100 usuarios generan 200 con una consulta o 600 con tres. Separar lecturas/comandos y refresco por función | [ADR 0003](../adr/0003_refresco_y_limites.md) |
| ETag y contador por espacio como solución | Parcial: 304 no reduce peticiones; diferir ETag y contador global hasta medir necesidad | [ADR 0003](../adr/0003_refresco_y_limites.md) |
| Contratos, derechos y límites contradictorios | Aceptada la ambigüedad: paquete versionado, revisión contractual y aplicación atómica de proyecciones efectivas | [ADR 0002](../adr/0002_contratos_y_derechos.md) |
| Rotar backups en siete días resuelve SPDP | Rechazada esa conclusión: no cubre automáticamente todos los supuestos ni copias del proveedor | [ADR 0005](../adr/0005_datos_reales_y_recuperacion.md) |
| Trial solo sintético | La prohibición no era absoluta; ahora distinguir demo de trial real mediante G1 y aceptación válida del encargo | [ADR 0005](../adr/0005_datos_reales_y_recuperacion.md) |
| T-02 parece exigir unidades administrativas | Corregido: evidencia conceptual, sin crear esa tabla en F1a | [Modelo](03_dominio_y_datos.md) |
| El proveedor sí tiene acceso fuera de la consola | Aceptada: separar operadores, automatización e intervención privilegiada; no inventar límite obligatorio de dos personas | [ADR 0005](../adr/0005_datos_reales_y_recuperacion.md) |
| Fecha de revisión de diseño desactualizada | Corregida al revisar el archivo; cada fecha refleja su revisión real | [Diseño](05_experiencia_y_diseno.md) |
| F1 bloquea demasiado feedback | Aceptada: F1a + primer flujo de reactivos; F1b paralela a F2; puertas demo/piloto/venta | [Roadmap](06_roadmap.md) |
| Google/Microsoft OAuth para docentes | Aceptada para F3; correo sigue disponible. OAuth no equivale a SAML ni concede membresía | [ADR 0004](../adr/0004_identidad_y_operacion.md) |
| Aceptar invitación crea cuenta confirmada | Corregida: confirma al verificar/canjear el correo; no preconfirmar cuentas por CSV | [ADR 0004](../adr/0004_identidad_y_operacion.md) |
| Aprobación técnica condicionada | Aceptada el 29: docente propone recursos; técnico asigna sala y preautoriza cambios; aceptación confirma solo si siguen válidos | [ADR 0007](../adr/0007_aprobacion_condicionada.md) |
| Consola en dominio/build propios | Aceptada: apps/operator y API común con JWT, aal2, operador vigente y permiso; Access opcional | [ADR 0004](../adr/0004_identidad_y_operacion.md) |
| Rate limiter en memoria y luego Key Value | Aceptada con precisión: Redis compatible para múltiples réplicas; Workers KV no sirve como contador estricto | [ADR 0003](../adr/0003_refresco_y_limites.md) |
| Delegación de roles fija en código | Aceptada: catálogo y política versionados, asignaciones persistentes, sin editor universal | [ADR 0001](../adr/0001_espacios_y_acceso.md) |
| Fiscalizados como diferenciador | Necesidad confirmada y obligatoria para el piloto; REG-01/REG-02 verifican trazabilidad y reporte vigente dentro de Reactivos | [Producto](09_producto_y_paquetes.md) |
| Descuento por espacios del mismo titular | Hipótesis comercial razonable, condicionada a costos; un espacio institucional compartido puede ser legítimo | [Producto](09_producto_y_paquetes.md) |
| Colaborador para Prácticas durante F2 | Aceptada como tarea de descubrimiento; no adelanta implícitamente el módulo completo | [Roadmap](06_roadmap.md) |
| ADR y menos duplicación | Aceptada: fuentes por tema, este archivo como índice y CLAUDE como navegación | [Índice ADR](../adr/README.md) |
| JWKS asimétricos | Aceptada desde F1a, con rotación y controles de token | [ADR 0004](../adr/0004_identidad_y_operacion.md) |
| pgTAP / supabase test db | Aceptada junto a integración API y concurrencia real, no como sustituto de estas | [ADR 0006](../adr/0006_sql_y_pruebas.md) |
| ltree para ubicaciones | Diferido: parent_id y CTE recursiva primero; medir antes de sumar otra representación | [ADR 0006](../adr/0006_sql_y_pruebas.md) |
| Tipado SQL sin elegir | Resuelto: pg + PgTyped; migraciones SQL siguen siendo la autoridad | [ADR 0006](../adr/0006_sql_y_pruebas.md) |

## Decisiones anteriores que siguen vigentes

El usuario confirmó espacios independientes con propietario transferible, administradores, operadores, docentes y tesistas; una universidad puede tener varios espacios. La proforma anterior era conceptual y puede reemplazarse. El plan debe tener dependencias y entregables, sin fechas ni capacidad semanal supuestas. No volver a preguntar estas tres decisiones.

La revisión anterior también incorporó consola, cuotas, proveedores, salida de datos, aceptación de cambios, cancelación explícita e impresión con marca. M8 conserva alertas avanzadas y cada módulo incluye sus avisos esenciales. Cerrar la Data API no elimina todas las opciones de tiempo real. Los ADR actuales reemplazan las formulaciones técnicas anteriores cuando lo indican.

## Respuestas recibidas el 28–29 de septiembre

| Pregunta | Estado | Impacto |
|---|---|---|
| Laboratorio interesado | Confirmado, interesado en todos los módulos | Producto completo como objetivo; no se reduce la oferta total al primer incremento |
| Sustancias fiscalizadas desde el piloto | Confirmado, obligatorias | REG-01 y REG-02 son requisitos de G1 de este cliente |
| Calificación, responsable y reportes actuales | Confirmado por el usuario | Verificar evidencias y formato con ese responsable; no inventar sus campos ni cupos |
| Piloto por entregas | Aceptado | Inventarios y trazabilidad primero; Agenda/Prácticas después, conservando los ocho módulos como objetivo |
| Aprobación condicionada y asignación | Aceptado con aclaración | El docente propone desde plantilla; el técnico asigna/reubica salas con sugerencias del sistema y controla cambios |

Las preguntas de diseño consultadas están resueltas. Queda trabajo de validación, no una nueva elección de arquitectura: revisar reportes/calificación con el responsable, fijar los campos y reglas de REG-01, medir proveedores y comprobar recuperación/disposición. Cada tarea tiene una puerta en el roadmap; no impide comenzar el primer incremento sintético.

## Cómo empezar

La especificación implementable es [primer incremento](../desarrollo/primer_incremento.md); el orden y las puertas viven en [roadmap](06_roadmap.md). No hace falta construir exportaciones de todos los módulos, una consola completa o automatización comercial antes de mostrar el flujo sintético. Antes de datos reales sí deben cumplirse las condiciones del alcance que se vaya a pilotar.
