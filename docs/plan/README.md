# PlatLab — Diseño y plan de implementación

Revisión: 29 de septiembre de 2026. Estado: documentación lista para orientar el desarrollo; todavía no hay aplicación ni infraestructura desplegada.

## Punto de partida

El objetivo es un SaaS modular para varias universidades o empresas, con espacios independientes y propietario/equipo propios. Se mantiene el producto completo de ocho módulos y la posibilidad de vender combinaciones.

Está confirmado un laboratorio interesado en todos los módulos, con calificación, responsable y reportes actuales de sustancias fiscalizadas; este alcance es obligatorio desde su piloto. El usuario acepta probar por entregas. Las evidencias y reglas concretas del reporte se revisarán con su responsable; el interés no equivale a contrato firmado ni a funcionalidades validadas.

La primera implementación recomendada es una demo sintética de catálogo, lote, entrada y salida, con aislamiento, permisos, auditoría y cantidades exactas. La operación SaaS y los módulos avanzan después en paralelo, con puertas separadas para demo, piloto real y venta abierta. El piloto de este cliente no puede excluir fiscalizados para acortar alcance.

## Qué leer para empezar

1. [Primer incremento](../desarrollo/primer_incremento.md): comportamiento, rutas, transacción y pruebas del primer recorrido.
2. [Roadmap](06_roadmap.md): única fuente de fases, puertas, dependencias y tareas regulatorias del piloto.
3. [ADRs](../adr/README.md): decisiones de arquitectura, fuentes y alternativas descartadas.
4. [Revisión](07_decisiones_revision.md): evaluación de observaciones y respuestas pendientes.

## Fuentes por tema

| Documento | Autoridad |
|---|---|
| [01 — Evaluación](01_evaluacion.md) | Análisis del concepto original y referencias de ReactiLab |
| [02 — Arquitectura](02_arquitectura.md) | Stack, estructura del monolito y límites de módulos |
| [03 — Dominio y datos](03_dominio_y_datos.md) | Modelo lógico, invariantes, estados y cantidades |
| [04 — Infraestructura](04_infraestructura.md) | Despliegue, recuperación, operación y presupuesto provisional |
| [05 — Experiencia](05_experiencia_y_diseno.md) | Dirección visual derivada del PDF y comportamiento de pantallas |
| [06 — Roadmap](06_roadmap.md) | Fases, puertas y backlog |
| [07 — Revisión](07_decisiones_revision.md) | Índice crítico y decisiones consultadas al usuario |
| [08 — Ciclo del cliente](08_ciclo_cliente_y_datos.md) | Especificación de privacidad, salida, conservación y disposición |
| [09 — Producto](09_producto_y_paquetes.md) | Paquetes y condiciones de oferta |
| [10 — Acceso institucional](10_acceso_institucional_y_docentes.md) | Incorporación masiva y experiencia del solicitante |
| [ADRs](../adr/README.md) | Decisiones y motivos; parámetros canónicos de refresco/límites |

Evitar copiar reglas completas entre documentos: enlazar su autoridad. Los ADR aceptados prevalecen sobre formulaciones anteriores; un ADR propuesto no cambia todavía el comportamiento vigente. Las fases pertenecen al roadmap y el detalle de tablas al modelo, no a CLAUDE.md.

## Antecedentes y límites

Se conservan el [PRD conceptual](../PRD_Plataforma_Gestion_Laboratorios.md), la [proforma HTML](../Proforma_Gestion_Laboratorios_Modular_v2.html) y las 15 páginas de [Propuesta.pdf](../Propuesta.pdf). No son una oferta vigente ni prueban que precios o reglas sean correctos. El PDF sigue siendo la referencia visual, con las mejoras del documento 05.

Las referencias oficiales están junto a las decisiones. Costos, capacidad, región y condiciones de datos requieren las comprobaciones del piloto. No se fijan fechas ni horas semanales supuestas. El acuerdo de trabajar por entregas no equivale a un calendario contractual ni a renunciar al producto completo.
