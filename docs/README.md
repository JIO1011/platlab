# PlatLab — hilo del proyecto

Revisión: 1 de octubre de 2026. Estado: primer incremento en construcción (T-01 a T-03 cerrados; T-04/T-05 verificados en local); sin infraestructura desplegada ni datos reales.

## Qué es

SaaS modular para gestionar laboratorios de varias instituciones: reactivos, equipos, materiales, laboratorios y agenda, prácticas e investigación, mantenimiento y analítica. Es un solo producto —monolito modular— donde cada cliente trabaja en un espacio aislado con los módulos que contrata. La idea de origen está en la [proforma](antecedentes/Proforma_Gestion_Laboratorios_Modular_v2.html) y el [PRD](antecedentes/PRD_Plataforma_Gestion_Laboratorios.md).

## Dónde estamos y qué sigue

| Punto | Estado |
|---|---|
| Diseño | Cerrado para el primer incremento; decisiones en [05](05_decisiones.md) |
| Hecho | T-01 (monorepo y CI), T-02/T-03 (Core, RLS, JWT por JWKS, roles con ámbito) y T-04/T-05 (derechos por contrato, admisión de dos ejes bajo bloqueo, `/me` y `/home`, auditoría e idempotencia); evidencias en [desarrollo/evidencias](desarrollo/evidencias/) |
| Siguiente paso | R-00 del [primer incremento](desarrollo/primer_incremento.md): catálogo, lote, ingreso, salida y ajuste por API, con saldo e historial; después la interfaz (paso 5) |
| Primera puerta | G0: demo sintética con dos espacios aislados ([roadmap](04_roadmap.md)) |
| En paralelo | F0 con el laboratorio interesado: fiscalizados (REG-01) y prácticas (P-04) |

## Decisiones cerradas

1. Monolito modular: un repositorio, una versión y migraciones comunes; sin microservicios ni código por cliente.
2. Cada cliente usa uno o varios espacios de trabajo aislados (`core.workspaces`, `workspace_id`); los datos nunca se comparten entre espacios.
3. Solo el Equipo PlatLab activa o desactiva módulos, mediante contrato; el propietario solicita cambios.
4. La API autoriza cada operación; RLS y FKs compuestas son la segunda barrera. El navegador no accede directamente a las tablas.
5. Roles del espacio: Propietario, Administrador, Operador, Docente, Estudiante (tesista) y Responsable de fiscalizados.
6. Nadie borra registros de negocio: se archivan, cancelan o compensan.
7. El inventario es un libro de movimientos con cantidades exactas; reservar, entregar y consumir son operaciones distintas.
8. El docente propone desde una plantilla; el Administrador asigna sala y recursos y confirma.
9. Las sustancias fiscalizadas son obligatorias desde el piloto del laboratorio interesado, que avanza por entregas.
10. Stack: React + Vite, Node 24 + Fastify, `pg` + PgTyped, Supabase (PostgreSQL, Auth, Storage), Cloudflare y Render.
11. Tres puertas: G0 demo sintética, G1 piloto con datos reales y G2 venta abierta.
12. Cada módulo avanza por etapas (desarrollo → piloto → general) y solo se vende en etapa general. Una sola función de admisión, con dos ejes (espacio y módulo), gana lo más restrictivo y lee bajo bloqueo; separa operaciones nuevas, resolución de pendientes y consulta. Las capacidades compartidas se autorizan según el módulo dueño del recurso.
13. No se fijan fechas, horas ni presupuestos contractuales sin evidencia.

## Mapa de documentos

| Documento | Responde | Única fuente de |
|---|---|---|
| [01 Producto](01_producto.md) | Qué hace la plataforma y cómo se usa | Módulos, roles, flujos y pantallas |
| [02 Arquitectura](02_arquitectura.md) | Cómo se construye y opera | Contrato de módulo, aislamiento, infraestructura y parámetros iniciales |
| [03 Datos](03_datos.md) | Cómo se guardan y protegen los datos | Esquemas, estados, invariantes y transacciones |
| [04 Roadmap](04_roadmap.md) | En qué orden y con qué evidencia | Fases, puertas y backlog |
| [05 Decisiones](05_decisiones.md) | Por qué se decidió y qué falta decidir | ADR resumidos y preguntas abiertas |
| [Primer incremento](desarrollo/primer_incremento.md) | Qué se programa ahora | Rutas, transacción y pruebas de G0 |

Antecedentes: el [PRD](antecedentes/PRD_Plataforma_Gestion_Laboratorios.md), la [proforma](antecedentes/Proforma_Gestion_Laboratorios_Modular_v2.html) y [Propuesta.pdf](antecedentes/Propuesta.pdf). No son una oferta vigente ni reglas validadas; el PDF sigue siendo la referencia visual. El plan detallado anterior (evaluación, infraestructura, ciclo legal de datos y ADR completos) está en el commit `bc26fa8`.

## Glosario

| Término | Significado |
|---|---|
| Espacio de trabajo | Frontera de aislamiento de un cliente (`workspace_id`); no es una sala |
| Titular | Entidad jurídica que contrata; puede tener varios espacios |
| Propietario | Miembro único y transferible que gobierna el espacio; no es el titular jurídico |
| Equipo PlatLab | Personal del proveedor; usa la consola y no ve datos de clientes por defecto |
| Módulo | Unidad contratable (M1–M8 y futuras) con esquema, API, pantallas y permisos propios |
| Derecho | Módulo habilitado para un espacio por contrato (`core.workspace_entitlements`) |
| Etapa del módulo | `development`, `pilot` o `general`: dónde puede habilitarse un módulo y si puede venderse |
| Capacidad | Funcionalidad compartida que no se vende sola (inventario, agenda, incidencias) y es dueña de su esquema |
| RPO / PITR | Máximo de datos que se pueden perder al restaurar / restauración a cualquier punto en el tiempo |
| Ámbito | Parte del árbol de ubicaciones donde aplica un rol |
| Ubicación / laboratorio | Lugar físico del Core / ubicación con capacidad y agenda (M4) |
| Movimiento | Asiento inmutable del inventario; el saldo es su proyección |
| Reserva / entrega / consumo | Comprometer / pasar a custodia / gastar realmente |
| G0 / G1 / G2 | Demo sintética / piloto con datos reales / venta abierta |

## Cómo mantener esta documentación

- Cada tema vive en un solo documento; los demás enlazan.
- Una decisión nueva se registra en [05](05_decisiones.md) antes de cambiar código u otros documentos.
- Los parámetros iniciales están solo en [02 §12](02_arquitectura.md#12-parámetros-iniciales); las fases y puertas, solo en [04](04_roadmap.md).
- Al terminar T-01, registrar en `CLAUDE.md` los comandos reales.
