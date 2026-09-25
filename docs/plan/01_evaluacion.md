# Evaluación crítica de la propuesta

Fecha: 24 de septiembre de 2026. Referencias: PRD v1, proforma HTML y Propuesta.pdf, páginas 1–15.

## Dictamen

La propuesta tiene una dirección útil: reunir recursos, planificación y trazabilidad, con interfaces centradas en tareas. El monolito modular encaja con procesos que comparten información y necesitan aprobar reservas e inventario de forma consistente.

La mayor dificultad no está en dibujar pantallas o desplegar Next.js: está en definir qué significa disponibilidad, qué operaciones puede realizar cada institución y cómo impedir que dos usuarios comprometan el mismo recurso.

Con tu prioridad de vender paquetes desde el inicio, conviene validar primero dos productos completos sobre un núcleo común: **Inventario de reactivos** y **Gestión de equipos**. Después se integra el flujo de prácticas. Eso cambia la lectura del PRD: la práctica es el centro de la operación integrada, pero no una dependencia obligatoria de todo el producto.

## Qué conservar y qué corregir

| Idea original y referencia | Evaluación | Propuesta |
|---|---|---|
| Una plataforma, módulos contratables; proforma §1–4 | Conservar | Un código común, datos aislados por institución y derechos de uso comprobados en servidor |
| Práctica como objeto central; PRD §1 y PDF p.14 | Conservar para la operación integrada | Inventarios independientes siguen siendo productos completos |
| MVP con cronograma, prácticas después; PRD §8 y §13 | Hay una dependencia sin resolver | Laboratorios puede crear reservas directas; Prácticas crea reservas vinculadas en el mismo calendario |
| El sistema siempre encuentra una alternativa; PDF p.5 | No se puede garantizar | Mostrar opciones cuando existan y explicar por qué una solicitud no puede aprobarse |
| Todo está disponible «en vivo»; PDF p.4 | La pantalla puede quedar desactualizada | Mostrar momento de actualización; revalidar y reservar dentro de la transacción de aprobación |
| El técnico solo revisa excepciones; PDF p.6 | Buena prioridad, no regla absoluta | Primera versión con aprobación explícita; automatización posterior con política y evidencia |
| Descontar al cierre; PRD §10 | Falta representar lo ya entregado | Entrega a custodia de la práctica; consumo real al cierre; lo entregado deja de estar disponible |
| Solo registrar diferencias; PDF p.10 | Conservar como ayuda del formulario | Confirmar cantidades reales y estado de las devoluciones; no inventar consumo por omisión |
| Reutilizable utilizado y devuelto; PDF p.10 | No equivale a consumido | Separar consumibles de préstamos y verificar retorno antes de recuperar disponibilidad |
| Disponible/reservado/en uso/mantenimiento; PRD §6 | Mezcla estado físico y ocupación temporal | Separar condición, agenda y custodia; calcular disponibilidad para el intervalo consultado |
| Alternativas en otros laboratorios; PDF p.5 y p.12 | Existencia no implica acceso ni traslado inmediato | Consultar autorización, estado, ubicación y tiempo de traslado; transferencia con recepción |
| Alertas en etapa 3; proforma §3 | Algunas son necesarias antes | Caducidad, stock insuficiente y averías desde el módulo operativo; indicadores avanzados después |
| Activar/desactivar por cliente; proforma §4 | Falta ciclo de salida | Bloquear nuevas operaciones, resolver pendientes y conservar consulta e historial |
| El técnico puede modificar; PRD §7 | Puede cambiar lo que el docente aceptó | Versionar la solicitud; cambios de recursos/fecha necesitan nueva validación y aceptación definida |
| Trazabilidad «perfecta»; PDF p.13 | La calidad depende también de la captura | Historial verificable, correcciones compensatorias y responsables; medir registros faltantes |

## Alcance recomendado de los paquetes

| Paquete | Módulos | Resultado vendible | Momento |
|---|---|---|---|
| Inventario químico | 1 + 2 | Catálogo, lotes, ubicaciones, entradas/salidas, conteo, documentos y alertas propias | Primera oferta |
| Activos de laboratorio | 1 + 3 | Equipos, condición, custodio, ubicación, documentación, incidencias e historial | Primera oferta |
| Inventario institucional | 1 + 2 + 3 | Ambos inventarios y búsqueda por ubicación | Primera oferta; composición de los anteriores |
| Agenda y prácticas | 1 + 4 + 5 | Solicitud, reserva de espacio, aprobación, preparación y cierre | Segunda entrega comercial |
| Operación integrada | Anterior + recursos contratados | Reserva, entrega, consumo y devolución vinculados | Crece con módulos 2, 3 y 6 |
| Prevención y gestión | 7 y/o 8 con dependencias | Mantenimiento planificado e indicadores | Después de validar la operación |

Gestión de equipos inicial no prometerá reservas futuras ni mantenimiento preventivo completo. Cada paquete debe describir lo que ya funciona. La configuración comercial permite combinaciones; no se crean aplicaciones diferentes ni ramas de código para cada cliente.

El módulo 4 puede venderse solo con Core para agenda de laboratorios. El módulo 5 requiere el 4. Un cliente con 4 + 5 sin inventarios puede gestionar espacio y actividad; sus recursos externos se muestran como **no verificados**, sin prometer stock, reserva ni consumo automático.

## Revisión de la proforma

La suma de los módulos es US$ 11.900; las etapas suman ese mismo importe. La oferta integral de US$ 10.000 es un descuento comercial, no evidencia de que alcance para desarrollar y mantener todo el sistema.

El simulador implementa 5 → 4 y 7 → 3, pero permite seleccionar 8 únicamente con Core, aunque el texto exige al menos un módulo operativo. También vuelve a marcar silenciosamente una dependencia al intentar quitarla. La siguiente revisión debe explicar dependencias, actualizar el total visible y exigir una combinación válida. Este análisis no modifica la proforma original.

La licencia de US$ 1.200/año equivale a US$ 100/mes **de ingreso**, del que también salen infraestructura, backups, correo, monitoreo, soporte y mantenimiento. Un cliente con proyecto dedicado, restauración rápida o soporte intensivo necesitará otra tarifa. El primer año incluido debe contabilizarse en el precio de implementación. Ver [infraestructura y escenarios de costo](04_infraestructura.md).

Antes de reutilizar esos precios, definir: usuarios/laboratorios/almacenamiento incluidos, migraciones, horas y horario de soporte, tiempos de respuesta, exportación al terminar, periodo de consulta y qué se factura como cambio. La incorporación de un cliente al SaaS y el desarrollo de un módulo nuevo son trabajos distintos y deben presupuestarse como tales.

No se propone introducir facturación automática ni pasarela de pagos ahora. Una configuración administrativa auditada de contratos y módulos basta para las primeras instituciones.

## ReactiLab: aprovechar experiencia sin heredar defectos

Se realizó una revisión estática de archivos locales en `/home/jio/Documentos/Inventario_V1`. No se consultó producción ni se ejecutaron pruebas de ese proyecto. Los riesgos concurrentes siguientes se deducen del código; deben reproducirse en un entorno aislado si se decide extraer esa lógica.

| Evidencia local | Decisión para PlatLab |
|---|---|
| `src/features/inventory/hooks/useReagents.ts:36` y separación `api/` | Adaptar componentes, organización por funcionalidad y caché por organización |
| `src/features/auth/context/AuthContext.tsx:144` limpia caché al cambiar identidad | Conservar el principio; incluir usuario, organización y alcance en el diseño de caché |
| `supabase/schema/baseline.sql:1066` y `:1085` descuentan con `GREATEST(0, ...)` | Reescribir: rechazar cantidades insuficientes, no esconder diferencias dejando el saldo en cero |
| `src/features/inventory/api/reagentsApi.ts:184` y `:203` separan cambio de saldo e historial | Un único comando transaccional debe guardar ambos o ninguno |
| `supabase/schema/baseline.sql:1011` y `:1040` deciden aprobación sin bloqueo previo | Versión esperada y bloqueo del agregado; una decisión no debe sobrescribir otra concurrente |
| `supabase/schema/baseline.sql:190` concentra inventario sin lote/reserva separados | Crear producto, lote, posición, movimientos y asignaciones como entidades distintas |
| `src/features/inventory/api/reagentsApi.ts:57` completa caducidad faltante | Mantener «desconocida»; nunca inventar vigencia |
| `src/features/inventory/utils/reagentUtils.ts:62` usa densidad predeterminada | No trasladar conversiones basadas en datos supuestos |
| Migración `20260811010000_enforce_subscription_on_writes.sql:96` usa nombres de políticas distintos de `000_consolidated_schema.sql:736` | Nueva cadena de migraciones reproducible; no copiar simultáneamente baseline e historia divergente |

Reutilización propuesta: componentes presentacionales, formularios adaptados, tablas, patrones de sesión, importación como referencia y vocabulario validado. Revisar licencias y propiedad del código antes de incorporarlo. Reescribir persistencia crítica, modelo de cantidades, reservas, permisos institucionales y licencias por organización.

## Hipótesis que hay que validar

| Pregunta de negocio | Propuesta inicial | Cuándo resolver |
|---|---|---|
| ¿Los primeros clientes aceptan infraestructura compartida? | Sí, con aislamiento lógico; dedicado como alternativa cotizada | Fase 0 |
| ¿Qué conectividad real existe? | Operación en nube; registrar frecuencia/duración de cortes y procedimiento manual | Fase 0 |
| ¿Quién puede consultar inventario de otras ubicaciones? | Consulta institucional autorizada; movimientos solo dentro del alcance asignado | Antes del primer piloto |
| ¿Identificar cada envase es indispensable? | Lotes obligatorios; envases identificables cuando el proceso lo requiera | Antes de migrar reactivos |
| ¿Quién aprueba su propia práctica? | No por defecto; excepción explícita con permiso y motivo | Antes del módulo 5 |
| ¿Puede el técnico cambiar cantidades o sustitutos? | Proponer revisión; cambios sustanciales requieren aceptación docente | Antes del módulo 5 |
| ¿Anticipación y horario de solicitudes? | Configurables por institución; sin plazo universal inventado | Antes del módulo 5 |
| ¿Cómo se aceptan devoluciones y pérdidas? | Verificación por técnico y motivo registrado; retorno no verificado queda bloqueado | Antes de cierres/préstamos |
| ¿Hay espacios compartidos simultáneamente? | Un espacio exclusivo por reserva en primera versión | Antes del módulo 4 |
| ¿Qué datos pueden conservarse y por cuánto tiempo? | Política institucional y contrato, con responsables definidos | Antes de producción |

Estas preguntas no impiden construir el diseño. Las propuestas iniciales deben convertirse en decisiones registradas cuando se implemente el flujo correspondiente.
