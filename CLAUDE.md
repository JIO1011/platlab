# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

PlatLab es un SaaS modular para laboratorios. El repositorio contiene diseño y plan; todavía no hay código, package.json, comandos de build/lint/test ni infraestructura desplegada. Al implementar T-01, registrar aquí los comandos reales, incluido cómo ejecutar una prueba.

## ROL

Actúa como experto senior en desarrollo de software full-stack, product manager, UX/UI y marketing para ser estrategico, aplicar buenas practicas. Analiza, evalúa y propone la mejor solución. Responde de manera resumida y en alto nivel.

## MCP

- context7 para documentación de librerías.
- codebase-memory para analizar código (local) hay skill global.

## Qué leer y qué documento manda

- [Plan](docs/plan/README.md): punto de entrada.
- [Primer incremento](docs/desarrollo/primer_incremento.md): primera entrega implementable.
- [Roadmap](docs/plan/06_roadmap.md): única autoridad de fases, puertas y dependencias; no copiar aquí su backlog.
- [ADRs](docs/adr/README.md): decisiones técnicas y sus motivos; distinguir aceptados de propuestos.
- [Modelo](docs/plan/03_dominio_y_datos.md): tablas, estados, transacciones e invariantes.
- [Arquitectura](docs/plan/02_arquitectura.md), [infraestructura](docs/plan/04_infraestructura.md), [diseño](docs/plan/05_experiencia_y_diseno.md), [ciclo de datos](docs/plan/08_ciclo_cliente_y_datos.md): especificaciones de cada tema.
- [Producto](docs/plan/09_producto_y_paquetes.md) sustituye la oferta conceptual anterior. PRD, proforma HTML y PDF se conservan como antecedentes; precios y reglas no se validan por estar escritos.
- [Revisión](docs/plan/07_decisiones_revision.md) registra respuestas y preguntas pendientes; no repetir decisiones ya resueltas.

## Invariantes para implementar

- Monolito modular con producto y migraciones comunes. Nombres canónicos: core.workspaces, workspace_id y /v1/workspaces/:workspaceId; «Espacio de trabajo» en UI. Titular jurídico y propietario personal son conceptos diferentes.
- La API autoriza todas las operaciones de dominio. Membresía, módulo, permiso y ámbito se comprueban en servidor; RLS y FKs compuestas añaden aislamiento. El navegador no tiene CRUD directo al dominio.
- SQL parametrizado mediante pg + PgTyped; una conexión y transacción para autorización, contexto local, negocio, auditoría e idempotencia. Runtime sin propiedad de tablas ni BYPASSRLS; las migraciones SQL son la autoridad.
- Cantidades exactas: numeric y cadenas decimales, nunca aritmética de cantidades con number. Movimiento confirmado y saldo se guardan juntos; correcciones por operaciones compensatorias.
- Reservar, entregar y consumir son operaciones distintas. Efectos externos mediante outbox al incorporarlos; no enviarlos antes del commit.
- Separar suscripción, permisos del miembro y banderas de despliegue. La aplicación contractual de derechos/límites sigue el ADR 0002.
- Aislamiento de la consola operadora no elimina el acceso privilegiado de infraestructura. Aplicar los procedimientos de los ADR 0004/0005.
- Demo sintética, piloto real y venta abierta tienen puertas diferentes. G1 exige garantías previas a la carga real controlada y conciliación antes de habilitar operación; seguir el roadmap.
- pgTAP bajo roles reales, integración API y concurrencia PostgreSQL verifican invariantes distintas. No marcar verificaciones aprobadas por estar documentadas.

## Contexto confirmado del producto

El usuario quiere varios paquetes y el producto completo de ocho módulos, con espacios independientes y propietario transferible. Hay un laboratorio interesado en todos los módulos. Sustancias fiscalizadas son necesarias desde el piloto; no diferirlas a Analítica ni excluirlas sin una nueva decisión explícita.

El usuario confirma calificación, responsable y reportes actuales, y acepta el piloto por entregas. REG-01 debe verificar el proceso y formato concreto. La aprobación condicionada está aceptada: el docente propone recursos desde plantilla; el técnico asigna/reubica la sala, apoyado por sugerencias. El ADR 0007 define qué cambios requieren aceptación y cómo se confirma sin reservas parciales. No volver a preguntar estas decisiones.

No fijar fechas, horas ni presupuestos contractuales inventados. Mantener parámetros de refresco, cuotas, tablas de roles y fases únicamente en sus fuentes; enlazarlos desde otros documentos.

## ReactiLab

Referencia local: /home/jio/Documentos/Inventario_V1. Reutilizar patrones de UI después de revisar propiedad/licencia; los defectos de persistencia y concurrencia están documentados en la evaluación. No copiar su baseline ni su historia de migraciones como núcleo de PlatLab.
