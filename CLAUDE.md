# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

PlatLab es un SaaS modular para laboratorios. El repositorio contiene diseño y plan; todavía no hay código, package.json, comandos de build/lint/test ni infraestructura desplegada. Al implementar T-01, registrar aquí los comandos reales, incluido cómo ejecutar una prueba.

## ROL
Actúa como experto senior en desarrollo de software full-stack,arquitectura, infraestructura, base de datos, cloud (cloudflare, supabase), UI/UX, product manager, marketing, con visión estratégica y buenas prácticas. Analiza, evalúa y propone la mejor solución. Responde de manera resumida y en alto nivel.

## MCP

- context7 para documentación de librerías.
- codebase-memory para analizar código local; hay una skill global.

## Qué leer y qué documento manda

- [docs/README.md](docs/README.md): hilo del proyecto; estado, decisiones cerradas, siguiente paso y glosario. Empezar siempre aquí.
- [Primer incremento](docs/desarrollo/primer_incremento.md): lo que se programa ahora (F1a + R-00, puerta G0).
- [01 Producto](docs/01_producto.md): módulos, roles y su matriz, flujos y pantallas.
- [02 Arquitectura](docs/02_arquitectura.md): contrato de módulo, aislamiento, stack, infraestructura y parámetros iniciales (§12, única fuente).
- [03 Datos](docs/03_datos.md): esquemas, tablas, estados, invariantes y transacciones.
- [04 Roadmap](docs/04_roadmap.md): única autoridad de fases, puertas y backlog; no copiarlos aquí.
- [05 Decisiones](docs/05_decisiones.md): ADR 0001–0008 resumidos y preguntas pendientes. Registrar ahí toda decisión nueva antes de cambiar código u otros documentos.
- Antecedentes en `docs/antecedentes/`: PRD, proforma y Propuesta.pdf (la referencia visual). No son oferta vigente ni reglas validadas.
- El plan detallado anterior está en el commit `bc26fa8`; consultarlo con `git show bc26fa8:<ruta>` solo si hace falta un detalle.

## Invariantes para implementar

- Monolito modular con producto y migraciones comunes. Nombres canónicos: `core.workspaces`, `workspace_id` y `/v1/workspaces/:workspaceId`; en la interfaz, «Espacio de trabajo». Titular jurídico y propietario son conceptos diferentes.
- Cada módulo es una rebanada vertical con manifiesto en `packages/modules`. Se agrega siguiendo el contrato de 02 §4 y no modifica tablas de otros módulos. Cada esquema tiene un único propietario técnico: un módulo o una capacidad.
- Etapas y admisión (ADR 0009): cada módulo avanza `development → pilot → general`. Una sola función de admisión separa operación nueva, resolución de pendientes y consulta/exportación; se prueba como tabla de verdad (02 §6).
- La API autoriza todas las operaciones de dominio: membresía, derecho del módulo, permiso y ámbito se comprueban en el servidor. RLS y FKs compuestas añaden aislamiento. El navegador no tiene CRUD directo al dominio.
- SQL parametrizado con `pg` + PgTyped. Una conexión y una transacción para autorización, contexto local, negocio, auditoría e idempotencia. El runtime no es dueño de tablas ni tiene `BYPASSRLS`. Las migraciones SQL son la autoridad.
- Cantidades exactas: `numeric` y cadenas decimales, nunca aritmética de cantidades con `number`. Movimiento confirmado y saldo se guardan juntos. Nadie borra registros de negocio: se archiva, se cancela o se compensa.
- Reservar, entregar y consumir son operaciones distintas. Los efectos externos van por outbox y nunca antes del commit.
- Solo el Equipo PlatLab cambia derechos de módulos, mediante `apply_contract_revision`. Suscripción, permisos del miembro y banderas de despliegue son controles separados.
- Roles del espacio: Propietario, Administrador, Operador, Docente, Estudiante (tesista) y Responsable de fiscalizados. El personal del proveedor es el «Equipo PlatLab» (`staff`, `apps/console`, `/v1/console/*`). Nunca usar «operador» para el personal del proveedor.
- Aislar la consola no elimina el acceso privilegiado de infraestructura: aplicar los ADR 0004 y 0005.
- Demo sintética, piloto real y venta abierta tienen puertas diferentes (G0, G1, G2); seguir el roadmap.
- pgTAP bajo roles reales, integración API y concurrencia PostgreSQL verifican invariantes distintas. No marcar verificaciones como aprobadas por estar documentadas.

## Contexto confirmado del producto

El usuario quiere varios paquetes y el producto completo de ocho módulos, con espacios independientes y propietario transferible, y podrá agregar módulos nuevos. Hay un laboratorio interesado en todos los módulos. Las sustancias fiscalizadas son necesarias desde el piloto; no diferirlas a Analítica ni excluirlas sin una nueva decisión explícita.

El usuario confirma calificación, responsable y reportes actuales, y acepta el piloto por entregas. REG-01 debe verificar el proceso y el formato concretos.

La aprobación condicionada está aceptada: el docente propone recursos desde una plantilla y el Administrador asigna o reubica la sala, apoyado por sugerencias. El ADR 0007 define qué cambios requieren aceptación.

Decidido el 30-09-2026:

- Los roles del ADR 0008.
- «Operador» es el rol del laboratorio.
- Solo PlatLab activa o desactiva módulos por contrato.
- Documentación compacta en `docs/`.
- Etapas de módulo y tabla de admisión (ADR 0009).
- RPO de 24 h aceptado durante las pruebas y el piloto.
- Materiales en F3 según una práctica real (P-04).
- Equipos solicitados por tipo.
- Confirmación en lote con un resultado por solicitud.

El modelo comercial sigue pendiente: la recomendación está en 01 §4 y debe confirmarla el usuario.

No volver a preguntar estas decisiones.

No fijar fechas, horas ni presupuestos contractuales inventados. Mantener parámetros, matrices de roles y fases únicamente en sus fuentes y enlazarlos desde los demás documentos.

## ReactiLab

Referencia local: `/home/jio/Documentos/Inventario_V1`, código del propio usuario.

- **Usar como referencia de UX:** salida rápida, vista de producto a lote, SDS al retirar, motivo obligatorio y bandeja de aprobaciones.
- **No copiar:**
  - Su baseline ni su historia de migraciones.
  - Su modelo de frasco, lote y código fusionados.
  - El ajuste sin signo ni el borrado usado como baja.
- **Importación:** ReactiLab no la tiene; se diseña desde cero.
- **Licencia:** aclarar titularidad y licencia (README MIT frente a términos de software propietario) antes de copiar código.
