# 04 — Roadmap

Revisión: 30 de septiembre de 2026. Única autoridad de fases, puertas y dependencias. El orden lo fijan las dependencias y la evidencia, sin estimar fechas ni horas.

Contexto confirmado: hay un laboratorio interesado en los ocho módulos. Acepta un piloto por entregas y necesita sustancias fiscalizadas desde el inicio; ya cuenta con calificación, responsable y reportes. El producto completo sigue siendo el destino.

## 1. Fases

| Fase | Resultado verificable | Resultado para el laboratorio | Depende de |
|---|---|---|---|
| F0 | Casos, muestras y reglas del laboratorio; perfil fiscalizado (REG-01) | Su proceso real documentado y validado por su responsable | Decisiones registradas; avanza en paralelo a la demo |
| F1a + R-00 | Core mínimo y primer recorrido de Reactivos | Ver su flujo de reactivos funcionando con datos de prueba | Modelo y un caso sintético |
| F1b | Operación del SaaS: alta real, consola, cuotas, recuperación y salida | Plataforma lista para recibir sus datos con garantías | F1a; en paralelo con F2 |
| F2 | Reactivos y Equipos utilizables por separado y juntos | Inventario real conciliado y reporte de fiscalizados revisable | Las partes de F1a/F1b que use cada entrega |
| F3 | Laboratorios, agenda, docentes, estudiantes y Prácticas | Una práctica completa: solicitud, preparación, consumo y devolución | Core y agenda; integra los inventarios publicados |
| F4 | Materiales, préstamos y transferencias ampliadas | Material y préstamos controlados de punta a punta | Core; Prácticas solo para integrarse |
| F5 | Mantenimiento, indicadores y alertas avanzadas | Equipos con mantenimiento al día y alertas preventivas | Equipos para M7; datos operativos suficientes para M8 |

- R-00 es el primer tramo de Reactivos, no un módulo aparte.
- El orden de desarrollo no crea dependencias comerciales nuevas.
- Si P-04 lo exige, un Materiales mínimo se adelanta a F3 (§3).
- Terminar una fase no pone su módulo a la venta: eso lo marca su etapa (§2).

## 2. Puertas

G0 y G2 se aplican a cada módulo y fijan su etapa ([02 §6](02_arquitectura.md#6-autorización-etapas-y-admisión)). G1 se aplica a cada espacio y alcance.

| Puerta | Qué permite | Evidencia mínima |
|---|---|---|
| G0 del módulo — demo sintética | Etapa `pilot`: mostrarlo y habilitarlo en contratos de piloto | Demo sintética de sus flujos, con aislamiento, permisos, cantidades exactas, auditoría, idempotencia y concurrencia probadas. Para Reactivos: el [primer incremento](desarrollo/primer_incremento.md) |
| G1 de un espacio — datos reales | Usar datos reales en ese espacio y alcance, también en una prueba gratuita | En dos pasos, descritos debajo |
| G2 del módulo — venta abierta | Etapa `general`: venderlo en paquetes publicados | G1 del módulo en al menos un cliente, incorporación repetible, soporte documentado, capacidad y costos medidos |

- **G2 de la oferta inicial** (Reactivos, Equipos y ambos) exige además las tres combinaciones validadas y la transferencia de propiedad en la interfaz.
- **Módulos posteriores (M4–M8):** cada uno define sus criterios de G0 y G2 al iniciar su fase.

Los dos pasos de G1:

1. **Autorizar la carga controlada.** Antes de recibir datos reales se demuestra, con datos sintéticos, que funcionan las garantías de datos, seguridad, identidad, contrato, cuotas, consola, propiedad, recuperación y salida.
2. **Habilitar la operación.** El inventario real se importa, se concilia y el responsable lo acepta.

Para el laboratorio interesado, REG-01 y REG-02 forman parte de G1. Cada módulo nuevo repite las verificaciones afectadas antes de usar datos reales.

## 3. Contenido de cada fase

**F0.** No bloquea G0.

- Observar entradas y salidas de reactivos e incidencias de equipos.
- Recoger muestras anonimizadas de unidades, lotes y ubicaciones.
- REG-01 con el responsable:
  - Sustancias y concentraciones, calificación, sitios y cupos.
  - Custodia, retorno y formato vigente del reporte.
  - Si almacena soluciones preparadas y si estas siguen siendo fiscalizadas.
  - Si la calificación abarca varias unidades.
- Definir los espacios del piloto: uno por cada operación que comparte inventario. Si la calificación abarca varias unidades, resolver la consolidación antes de fijar esa división.
- Confirmar que el laboratorio conserva su registro actual durante el piloto, como fuente de reconstrucción si hay que restaurar una copia ([02 §12](02_arquitectura.md#12-parámetros-iniciales)).
- Medir la conectividad desde Ecuador.
- P-04: concretar el colaborador para Prácticas y analizar una práctica representativa. Si usa material que se entrega y se devuelve, se adelanta a F3 un Materiales mínimo: consumibles y reutilizables por cantidad, con entrega y devolución verificadas.

**F1a + R-00.** Detalle en el [primer incremento](desarrollo/primer_incremento.md).

- Monorepo y CI, con una prueba de humo de `pg` + PgTyped antes de extender el dominio: decimales como cadena, fechas y transacción con contexto local.
- Espacios, identidades, membresías, propietario, ubicaciones y roles con ámbito.
- Manifiestos con etapa, rutas y permisos por módulo, y una función de admisión de dos ejes que lee bajo bloqueo compartido.
- RLS, FKs compuestas y roles SQL; JWT por JWKS.
- Derechos mínimos vía `apply_contract_revision`, también en los fixtures.
- Auditoría e idempotencia.
- Catálogo, lote, ingreso, salida y ajuste.
- Inicio con la tarjeta del módulo y tablero de Reactivos.

**F1b, antes de G1.** Quedan fuera la pasarela de pago, los roles personalizados y la suplantación de usuarios.

- Spike de proveedores y ambientes, incluida la conexión a PostgreSQL desde Render ([02 §9](02_arquitectura.md#9-infraestructura-y-ambientes)).
- Alta en `provisioning`, con invitación y aceptación del propietario por correo real.
- Consola del Equipo PlatLab con MFA exigido en la API.
- Paquetes y contratos con aplicación atómica.
- Límites HTTP en memoria y cuotas exactas en PostgreSQL.
- Documentos privados, outbox y worker; observabilidad.
- Contrato de encargo y proveedores revisados.
- Copias de base y archivos con restauración aislada.
- Traspaso de propiedad asistido.

**F2.**

- Reactivos:
  - Importación y conciliación.
  - Ajuste y conteo; caducidad y mínimos.
  - Motivos y destinos; SDS privada; traslados.
  - Envases, si el cliente los exige.
  - Preparaciones, si REG-01 confirma que el laboratorio almacena soluciones.
- Fiscalizados: REG-02, con custodia y retornos si el laboratorio entrega a docentes.
- Equipos: tipos de equipo, activos, condición, traslado, custodio, importación, documentos e incidencias.
- Común: Inicio por paquete, búsqueda, marca, exportación y desactivación con pendientes.

**F3.**

- Laboratorios y agenda.
- Plantillas y actividades de docencia e investigación.
- Invitaciones por CSV y OAuth de Google y Microsoft.
- Solicitud desde plantilla, revisión del Administrador, aprobación condicionada y reubicación.
- Confirmación en lote, con un resultado por solicitud.
- Preparación, cierre y cancelación; tablero del Operador.
- Materiales mínimo, si P-04 lo exige.
- Impresión HTML con la marca del espacio.

**F4.** Consumibles y reutilizables, préstamos con devoluciones parciales, daños, pérdidas y transferencias.

**F5.**

- Mantenimiento: planes, órdenes, bloqueos y liberación con resultado.
- Analítica: indicadores con fuente y fórmula, alertas y resúmenes.

## 4. Criterios de aceptación clave

**G0:**

- A y B, ambos con Reactivos, permanecen aislados; C, sin Reactivos, no ve el módulo.
- La admisión cumple todas las combinaciones de sus dos ejes y deniega los estados desconocidos.
- Un ítem no se opera desde la ruta de otro módulo.
- Un movimiento y una desactivación simultáneos no dejan un movimiento nuevo después de la desactivación.
- Un propietario sin rol operativo no registra salidas.
- El Operador registra salidas pero no ajusta; el Administrador sí ajusta.
- Dos salidas de 60 g sobre 100 g dejan 40 g y un solo movimiento.
- Los reintentos son idempotentes y el rollback no deja residuos.
- El pool no filtra contexto entre peticiones y la base se reconstruye de forma reproducible.

**F3:**

- Dos aprobaciones incompatibles nunca se confirman juntas.
- Una aceptación queda ligada a una revisión concreta.
- La reubicación equivalente se audita y se notifica.
- Cancelar antes de entregar libera las reservas.
- Con 20 g entregados, 17 consumidos y 3 devueltos se conserva la procedencia.
- Una revocación impide compromisos nuevos.

**F4:**

- Si de 10 unidades vuelven 8, quedan 2 pendientes.
- Una devolución dañada no aumenta lo disponible.

**Escenario de carga a confirmar:** tres espacios, 10 000 posiciones o activos por espacio y 100 000 movimientos; en F3, además, 100 usuarios de agenda.

## 5. Backlog

| ID | Entrega | Evidencia | Depende de |
|---|---|---|---|
| T-00 | Espacios, propiedad, producto y roles | Decisiones en [05](05_decisiones.md) | — |
| P-01 | Validar paquetes y primer caso | Ejemplos, exclusiones y sustancias reguladas identificadas | T-00 |
| P-02 | Muestras y conectividad | Caso sintético para G0; perfil real para G1 | P-01 |
| REG-01 | Perfil fiscalizado del piloto | El responsable valida sustancias, autorización, sitios, cupos, hechos, formato vigente y consolidación | P-01 |
| P-03 | Prototipo y tareas por rol | Comentarios observados, matriz de roles validada y cambios de UX | P-01 |
| T-01 | Monorepo y CI | Compilación, fronteras, migraciones y tipos reproducibles; prueba de humo de `pg` + PgTyped | T-00 |
| T-02 | Core y roles SQL | Dos espacios, propietario, ubicaciones y restricciones | T-01 |
| T-03 | Identidad y acceso mínimo | Auth local, propietario válido, roles fijos, ámbito y revocación probados | T-02 |
| T-04 | Derechos, etapas y registro de módulos | Manifiestos con etapa; rutas y permisos por módulo; comando de aplicación de revisión; admisión de dos ejes con denegación por defecto y todas sus combinaciones probadas; los fixtures usan el comando | T-03 |
| T-05 | Transacciones, auditoría e idempotencia | Misma conexión, rollback y reintentos; admisión bajo bloqueo compartido con orden fijo; movimiento contra desactivación simultánea | T-03 |
| R-00 | Primer recorrido de Reactivos | Catálogo, lote, ingreso, salida y ajuste; Inicio y tablero; pruebas de concurrencia | T-04, T-05 |
| V-00 | G0 de Reactivos | Demo sintética y evidencias del primer incremento; Reactivos pasa a etapa `pilot` | R-00 |
| S-01 | Spike de proveedores | Región, conectividad, modo de conexión a PostgreSQL, SMTP, respaldo, observabilidad y costos verificados; la credencial local de `seed.sql` no llega a ramas ni ambientes remotos | T-01 |
| T-03B | Identidad productiva y propiedad asistida | Invitaciones, recuperación y relevo ensayados, sin cuentas huérfanas | T-03, S-01 |
| T-07 | Archivos, outbox y worker | Documentos privados, reintentos, concesiones y autorización de trabajos | T-05 |
| O-01 | Consola del Equipo PlatLab | Aplicación separada, MFA en la API, contratos, derechos y límites auditados; los cambios de estado respetan el orden de bloqueo de la admisión | T-04, T-05, T-03B |
| Q-01 | Cuotas y control de abuso | Reservas exactas en PostgreSQL, límites HTTP en memoria y reparto de trabajos | T-04, T-07 |
| DP-01 | Datos reales y salida | Acuerdos, proveedores y procedimientos revisados; retención por repositorio | T-00 |
| R-01A | Reactivos por frasco ([ADR 0012](05_decisiones.md#adr-0012)) | Frascos con código y QR; ficha en dos niveles; salida con atajos, FEFO y advertencia de vencido; motivos y destinos; salidas del Operador con aprobación y reserva; caducidad y mínimos; traslados y conteo. Todo en la capacidad inventario y probado con datos sintéticos | R-00 |
| R-01B | Reactivos para el piloto | SDS privada, avisos por correo (aprobaciones, bajo mínimo, por vencer) y exportación; ajustes que exija el alcance pactado | R-01A, T-07, P-02 |
| REG-02 | Trazabilidad y reporte fiscalizado | Perfil implementado, custodia y retorno si aplica, periodo conciliado y exportación revisada | REG-01, R-01A, T-07 |
| E-01 | Equipos e incidencias | Tipos de equipo, activos, condición, traslados e historial; `incidents` separado de Core | T-04, T-05, T-07, P-02 |
| I-01 | Importación conciliada | Lotes reiniciables e idempotentes por módulo | Q-01 y R-01A o E-01 |
| X-00 | Salida del primer módulo | Exportación, documentos, supresión y otros espacios intactos, incluidos los datos regulatorios | DP-01, T-07, R-01A o E-01; REG-02 para este cliente |
| T-06 | Recuperación del alcance piloto | Base, archivos y configuración recuperados; supresiones respetadas | S-01, T-07, DP-01, R-01A o E-01; REG-02 para este cliente |
| V-P01 | G1 del primer alcance | Garantías comprobadas antes de la carga real; inventario conciliado y aceptado antes de operar | T-03B, O-01, Q-01, X-00, T-06, P-03, REG-02; I-01 si hay importación |
| P-04 | Colaborador de Prácticas | Flujos revisados con el responsable académico y técnico; práctica representativa analizada y decisión sobre Materiales mínimo | P-01; durante F2 |
| O-02 | Transferencia de propiedad en la interfaz | Aceptación, concurrencia y revocación probadas | T-03B, O-01 |
| X-01 | Salida de toda la oferta | Reactivos, Equipos y combinado, con archivos | X-00, R-01B, E-01 |
| V-01 | G2 de la oferta inicial | Combinaciones, importación, incorporación, soporte, carga, costos y salida completos; Reactivos y Equipos pasan a etapa `general` | V-P01, R-01B, E-01, I-01, X-01, O-02 |
| V-Mx | G0 y G2 de cada módulo posterior (M4–M8) | Criterios propios, definidos al iniciar su fase | Su fase; el G1 de su alcance para G2 |

- Para el cliente confirmado, R-01A, R-01B y REG-02 son obligatorias.
- T-01 puede empezar mientras se recogen muestras.
- R-00 no depende de SMTP, de la consola ni de tener un cliente.
- Después de G0, F1b y F2 avanzan en paralelo hasta encontrarse en G1.

## 6. Incorporación de un cliente

1. Acordar perímetro, responsables, tratamiento y campos.
2. Ensayar con una muestra anonimizada solo después de autorizar la carga controlada.
3. Conciliar catálogo, lotes y activos, fijar el corte del sistema anterior y registrar el saldo inicial con su origen.
4. Obtener la aceptación del responsable antes de habilitar la operación.

Si la conciliación falla, el acceso se queda en incorporación hasta corregirla. Con movimientos reales ya registrados, se corrige con operaciones compensatorias; nunca se restaura la base compartida.

Métricas: se miden desde F2 con la línea base del piloto, distinguiendo «sin datos» de cero.
