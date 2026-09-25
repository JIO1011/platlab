# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

**PlatLab** — Plataforma Integral de Gestión de Laboratorios universitarios. El repositorio está en fase **conceptual / definición de producto**: todavía no hay código, stack elegido, comandos de build/test ni repositorio git. Solo existe `docs/`:

- `docs/PRD_Plataforma_Gestion_Laboratorios.md` — PRD v1.0, **fuente de verdad** del alcance funcional. Leerlo antes de proponer diseño o código.
- `docs/Proforma_Gestion_Laboratorios_Modular_v2.html` — proforma comercial (precios por módulo/etapa, licencia anual, condiciones). Incluye un simulador JS que auto-selecciona dependencias (módulo 5 ⇒ 4, módulo 7 ⇒ 3).
- `docs/Propuesta.pdf` — propuesta comercial.

Cuando se defina el stack y se cree código, actualizar este archivo con comandos y arquitectura reales.

## ROL
Actua como experto senior en desarrollo de software full-stack, product manager, UX/UI, marketing.
Analiza, evalua y propon la mejor solucion.
Responder de manera resumida y en alto nivel. 

##MCP
context7 para doc
code-base-memory para analiza codigo

## Referencia existente: ReactiLab

El PRD indica que el módulo de **Reactivos** puede basarse en ReactiLab, ubicado en `/home/jio/Documentos/Inventario_V1` (tiene su propio `CLAUDE.md`). Es una SPA React 19 + Vite + TypeScript sobre Supabase, organizada por features (`src/features/*` con barrel `index.ts`), TanStack Query con query-key factories por organización y Realtime, multi-organización con roles. Si no se decide otra cosa, es el punto de partida natural para stack y patrones.

## Modelo de producto (big picture)

- El objeto central **no es el inventario**, sino la **Práctica / Actividad de laboratorio**, que vincula docente, asignatura, laboratorio, horario, recursos (reactivos, materiales, equipos), preparación, ejecución, consumos/devoluciones e incidencias.
- Plataforma **única y modular**: todos los módulos comparten organización, usuarios, datos y trazabilidad; cada institución habilita módulos progresivamente (modularidad comercial). El diseño debe permitir activar/desactivar módulos por organización.
- Roles: Docente, Técnico de laboratorio, Coordinador/responsable, Estudiante (limitado, posterior).
- Principios: registrar una sola vez, reutilizar catálogos, validar automáticamente, mostrar solo excepciones al técnico.

### Módulos y dependencias

| # | Módulo | Depende de |
|---|--------|-----------|
| 1 | Núcleo Institucional (org, usuarios, roles, permisos, ubicaciones, config, auditoría) | — (obligatorio) |
| 2 | Reactivos | 1 |
| 3 | Equipos | 1 |
| 4 | Laboratorios | 1 |
| 5 | Prácticas y Solicitudes | 1 + 4, integra recursos habilitados |
| 6 | Materiales y Préstamos | 1 |
| 7 | Mantenimiento | 1 + 3 |
| 8 | Analítica y Alertas | 1 + ≥1 módulo operativo |

Etapas: **1** = módulos 1–4 (MVP: incluye importación inicial de reactivos y cronograma básico), **2** = 5–6, **3** = 7–8.

### Workflow de una práctica

`BORRADOR → ENVIADA → VALIDACIÓN AUTOMÁTICA → EN REVISIÓN → (APROBADA | REQUIERE AJUSTE | RECHAZADA)`; si se aprueba: `PROGRAMADA → EN PREPARACIÓN → LISTA → EN CURSO → CIERRE → FINALIZADA`. La plantilla/formato de práctica es reutilizable e **imprimible**. El técnico puede modificar la solicitud para acomodarla.

### Reglas de negocio clave

- **Solicitar ≠ consumir.** Cantidades separadas: existencia física, reservada, disponible (= física − reservada) y consumida. Se reserva al aprobar; el consumo se descuenta solo en el cierre real.
- En el cierre se registran **solo diferencias** (usado, devuelto, faltantes, incidencias).
- Material reutilizable: `Solicitud → Entrega → Uso → Devolución → Verificación → Disponible`.
- Estados mínimos de equipo: disponible, reservado, en uso, fuera de servicio, en mantenimiento.
- Una incidencia creada desde una práctica **hereda** fecha, laboratorio, responsable, práctica y recurso.
- Reposición: ante stock insuficiente, buscar primero en el inventario institucional (otros laboratorios → transferir) antes de generar necesidad de adquisición.
- Reglas de anticipación de solicitudes **configurables**, nunca un plazo fijo.
- El **cronograma** semanal es una vista derivada de las prácticas aprobadas, no un registro manual.
- El dashboard del técnico responde "¿qué tengo que hacer hoy?" (prácticas del día, preparaciones, solicitudes por revisar, conflictos, incidencias, mantenimientos, alertas); evitar gráficos sin acción.

### Fuera de alcance inicial

App móvil nativa, ERP/compras, facturación, SSO institucional, integraciones no definidas, hardware/lectores, automatizaciones avanzadas, IA.

### Reglas aún sin cerrar (no asumir; preguntar)

Quién solicita, quién aprueba, quién puede modificar, cancelación, anticipación, transferencias, devoluciones parciales y excepciones.
