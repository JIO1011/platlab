# 04 — Roadmap

Revisión: 30 de septiembre de 2026. Única autoridad de fases, puertas y dependencias. El orden lo fijan las dependencias y la evidencia, sin estimar fechas ni horas.

Contexto confirmado: hay un laboratorio interesado en los ocho módulos. Acepta un piloto por entregas y necesita sustancias fiscalizadas desde el inicio; ya cuenta con calificación, responsable y reportes. El producto completo sigue siendo el destino.

## 1. Fases

| Fase | Resultado verificable | Depende de |
|---|---|---|
| F0 | Casos, muestras y reglas del laboratorio; perfil fiscalizado (REG-01) | Decisiones registradas; avanza en paralelo a la demo |
| F1a + R-00 | Core mínimo y primer recorrido de Reactivos | Modelo y un caso sintético |
| F1b | Operación del SaaS: alta real, consola, cuotas, recuperación y salida | F1a; en paralelo con F2 |
| F2 | Reactivos y Equipos utilizables por separado y juntos | Las partes de F1a/F1b que use cada entrega |
| F3 | Laboratorios, agenda, docentes, estudiantes y Prácticas | Core y agenda; integra los inventarios publicados |
| F4 | Materiales, préstamos y transferencias ampliadas | Core; Prácticas solo para integrarse |
| F5 | Mantenimiento, indicadores y alertas avanzadas | Equipos para M7; datos operativos suficientes para M8 |

- R-00 es el primer tramo de Reactivos, no un módulo aparte.
- El orden de desarrollo no crea dependencias comerciales nuevas.

## 2. Puertas

| Puerta | Qué permite | Evidencia mínima |
|---|---|---|
| G0 Demo sintética | Mostrar el producto y recoger comentarios | F1a + R-00: dos espacios aislados, roles y módulos efectivos, cantidades exactas, auditoría, idempotencia y concurrencia probadas ([primer incremento](desarrollo/primer_incremento.md)) |
| G1 Piloto con datos reales | Incorporar clientes seleccionados, también en prueba gratuita | En dos pasos, descritos debajo |
| G2 Venta abierta | Vender Reactivos, Equipos y ambos | G1, tres combinaciones validadas, incorporación repetible, transferencia de propiedad en la interfaz, soporte documentado, capacidad y costos medidos |

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
  - Si varios espacios comparten calificación.
- Medir la conectividad desde Ecuador.
- Concretar el colaborador para Prácticas (P-04).

**F1a + R-00.** Detalle en el [primer incremento](desarrollo/primer_incremento.md).

- Monorepo y CI.
- Espacios, identidades, membresías, propietario, ubicaciones y roles con ámbito.
- RLS, FKs compuestas y roles SQL; JWT por JWKS.
- Derechos mínimos vía `apply_contract_revision`, también en los fixtures.
- Auditoría e idempotencia.
- Catálogo, lote, ingreso, salida y ajuste.
- Inicio con la tarjeta del módulo y tablero de Reactivos.

**F1b, antes de G1.** Quedan fuera la pasarela de pago, los roles personalizados y la suplantación de usuarios.

- Spike de proveedores y ambientes.
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
  - Ajuste y conteo; cuarentena, caducidad y mínimos.
  - Motivos y destinos; SDS privada; traslados.
  - Envases, si el cliente los exige.
- Fiscalizados: REG-02, con custodia y retornos si el laboratorio entrega a docentes.
- Equipos: activos, condición, traslado, custodio, importación, documentos e incidencias.
- Común: Inicio por paquete, búsqueda, marca, exportación y desactivación con pendientes.

**F3.**

- Laboratorios y agenda.
- Plantillas y actividades de docencia e investigación.
- Invitaciones por CSV y OAuth de Google y Microsoft.
- Solicitud desde plantilla, revisión del Administrador, aprobación condicionada y reubicación.
- Preparación, cierre y cancelación; tablero del Operador.
- Impresión HTML con la marca del espacio.

**F4.** Consumibles y reutilizables, préstamos con devoluciones parciales, daños, pérdidas y transferencias.

**F5.**

- Mantenimiento: planes, órdenes, bloqueos y liberación con resultado.
- Analítica: indicadores con fuente y fórmula, alertas y resúmenes.

## 4. Criterios de aceptación clave

**G0:**

- A y B permanecen aislados.
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
| T-01 | Monorepo y CI | Compilación, fronteras, migraciones y tipos reproducibles | T-00 |
| T-02 | Core y roles SQL | Dos espacios, propietario, ubicaciones y restricciones | T-01 |
| T-03 | Identidad y acceso mínimo | Auth local, propietario válido, roles fijos, ámbito y revocación probados | T-02 |
| T-04 | Derechos y registro de módulos | Manifiestos, comando de aplicación de revisión y denegación por módulo; los fixtures usan el comando | T-03 |
| T-05 | Transacciones, auditoría e idempotencia | Misma conexión, rollback y reintentos | T-03 |
| R-00 | Primer recorrido de Reactivos | Catálogo, lote, ingreso, salida y ajuste; Inicio y tablero; pruebas de concurrencia | T-04, T-05 |
| V-00 | G0 | Demo sintética y evidencias del primer incremento | R-00 |
| S-01 | Spike de proveedores | Región, conectividad, SMTP, respaldo, observabilidad y costos verificados | T-01 |
| T-03B | Identidad productiva y propiedad asistida | Invitaciones, recuperación y relevo ensayados, sin cuentas huérfanas | T-03, S-01 |
| T-07 | Archivos, outbox y worker | Documentos privados, reintentos, concesiones y autorización de trabajos | T-05 |
| O-01 | Consola del Equipo PlatLab | Aplicación separada, MFA en la API, contratos, derechos y límites auditados | T-04, T-05, T-03B |
| Q-01 | Cuotas y control de abuso | Reservas exactas en PostgreSQL, límites HTTP en memoria y reparto de trabajos | T-04, T-07 |
| DP-01 | Datos reales y salida | Acuerdos, proveedores y procedimientos revisados; retención por repositorio | T-00 |
| R-01 | Reactivos para el piloto | Ampliaciones de R-00 que exige el alcance pactado | R-00, P-02, T-07 |
| REG-02 | Trazabilidad y reporte fiscalizado | Perfil implementado, custodia y retorno si aplica, periodo conciliado y exportación revisada | REG-01, R-01, T-07 |
| E-01 | Equipos e incidencias | Activos, condición, traslados e historial; `incidents` separado de Core | T-04, T-05, T-07, P-02 |
| I-01 | Importación conciliada | Lotes reiniciables e idempotentes por módulo | Q-01 y R-01 o E-01 |
| X-00 | Salida del primer módulo | Exportación, documentos, supresión y otros espacios intactos, incluidos los datos regulatorios | DP-01, T-07, R-01 o E-01; REG-02 para este cliente |
| T-06 | Recuperación del alcance piloto | Base, archivos y configuración recuperados; supresiones respetadas | S-01, T-07, DP-01, R-01 o E-01; REG-02 para este cliente |
| V-P01 | G1 del primer alcance | Garantías comprobadas antes de la carga real; inventario conciliado y aceptado antes de operar | T-03B, O-01, Q-01, X-00, T-06, P-03, REG-02; I-01 si hay importación |
| P-04 | Colaborador de Prácticas | Flujos y decisiones revisados con el responsable académico y técnico | P-01; durante F2 |
| O-02 | Transferencia de propiedad en la interfaz | Aceptación, concurrencia y revocación probadas | T-03B, O-01 |
| X-01 | Salida de toda la oferta | Reactivos, Equipos y combinado, con archivos | X-00, R-01, E-01 |
| V-01 | G2 | Combinaciones, importación, incorporación, soporte, carga, costos y salida completos | V-P01, R-01, E-01, I-01, X-01, O-02 |

- Para el cliente confirmado, R-01 y REG-02 son obligatorias.
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
