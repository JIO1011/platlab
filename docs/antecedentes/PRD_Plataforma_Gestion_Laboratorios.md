# PRD — Plataforma Integral de Gestión de Laboratorios

**Versión:** 1.0  
**Estado:** Conceptual / definición de producto  
**Objetivo:** servir como base para alcance, UX, arquitectura y planificación del desarrollo.

---

## 1. Visión del producto

Construir una plataforma web institucional para **planificar, coordinar, ejecutar y controlar las actividades de laboratorio y los recursos asociados**.

La solución no se concibe como un inventario aislado. El objeto central es la **Práctica / Actividad de laboratorio**, que conecta:

- docente / responsable;
- asignatura / actividad;
- laboratorio;
- fecha y horario;
- reactivos;
- materiales;
- equipos;
- preparación;
- ejecución;
- consumos / devoluciones;
- incidencias;
- trazabilidad.

### Idea central

```text
PLANIFICAR
   ↓
SOLICITAR
   ↓
VALIDAR
   ↓
APROBAR
   ↓
PROGRAMAR
   ↓
PREPARAR
   ↓
EJECUTAR
   ↓
CERRAR
   ↓
TRAZABILIDAD
```

---

## 2. Problemas a resolver

Los procesos actuales presentan principalmente:

- información distribuida entre archivos y registros separados;
- desconocimiento de disponibilidad real;
- posibles adquisiciones duplicadas;
- conflictos de horarios;
- consumos y devoluciones difíciles de seguir;
- daños o fallas sin contexto suficiente;
- trabajo manual repetitivo;
- poca visibilidad sobre qué debe preparar cada técnico;
- dificultad para consultar inventario institucional entre laboratorios.

La institución dispone de múltiples laboratorios administrados por un número reducido de técnicos, por lo que el sistema debe priorizar **automatización, visibilidad y trabajo por excepción**.

---

## 3. Principios del producto

1. **Registrar una sola vez.** La información no debe repetirse entre formularios.
2. **Reutilizar información existente.** Prácticas, recursos, usuarios y laboratorios deben seleccionarse desde catálogos existentes.
3. **Validar automáticamente.** El sistema debe comprobar disponibilidad, stock, horarios y conflictos.
4. **Mostrar excepciones.** El técnico debe concentrarse en problemas, no en revisar información correcta.
5. **Una sola plataforma.** Los módulos comparten organización, usuarios, datos y trazabilidad.
6. **Modularidad comercial.** Cada institución puede contratar y habilitar módulos de forma progresiva.

---

## 4. Usuarios principales

### Docente
- crear o reutilizar prácticas;
- seleccionar laboratorio;
- solicitar recursos;
- consultar estado;
- responder ajustes solicitados.

### Técnico de laboratorio
- revisar solicitudes;
- aprobar / solicitar ajustes / rechazar;
- preparar prácticas;
- gestionar inventario;
- registrar consumos y devoluciones;
- gestionar incidencias;
- cerrar actividades.

### Coordinador / responsable
- supervisar;
- revisar excepciones;
- consultar indicadores;
- autorizar casos especiales.

### Estudiante
Rol inicialmente limitado. Puede incorporarse posteriormente para consulta o solicitudes controladas.

---

## 5. Modelo funcional de alto nivel

```text
                    ORGANIZACIÓN
                         │
              Usuarios / Roles
                         │
          ┌──────────────┴──────────────┐
          │                             │
     LABORATORIOS                   RECURSOS
          │                 ┌───────────┼───────────┐
          │                 │           │           │
          │             Reactivos   Materiales   Equipos
          │                 │           │           │
          └─────────────────┴─────┬─────┴───────────┘
                                  │
                         PRÁCTICA / ACTIVIDAD
                                  │
                         Validación / aprobación
                                  │
                              Cronograma
                                  │
                              Preparación
                                  │
                               Ejecución
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
              Consumo         Devolución       Incidencia
                 │                │                │
                 └────────────────┼────────────────┘
                                  │
                             Trazabilidad
```

---

## 6. Módulos

### 1. Núcleo Institucional
Base obligatoria.

Incluye:
- organización;
- usuarios;
- roles;
- permisos;
- ubicaciones;
- configuración;
- auditoría / trazabilidad básica.

### 2. Reactivos (reactilab en /documentos/inventariov1 puede ser una base o referencia)
Incluye:
- nombre;
- CAS;
- cantidad y unidad;
- marca y lote;
- caducidad;
- estado físico;
- tipo de peligro;
- ubicación;
- ficha de seguridad / documentación;
- stock;
- reserva;
- consumo;
- historial.

Conceptos de cantidad:
- existencia física;
- disponible;
- reservada;
- consumida.

### 3. Equipos
Incluye:
- nombre;
- marca;
- modelo;
- serie;
- ubicación;
- alimentación;
- estado;
- disponibilidad;
- responsable;
- documentación;
- historial;
- incidencias.

Estados mínimos:
- disponible;
- reservado;
- en uso;
- fuera de servicio;
- en mantenimiento.

### 4. Laboratorios
Incluye:
- nombre;
- ubicación;
- capacidad;
- responsable;
- horarios;
- disponibilidad;
- reservas;
- registro de uso;
- recursos asociados.

### 5. Prácticas y Solicitudes
Módulo operativo central.

Incluye:
- plantillas o formato y se puede ser reutilizables;
- datos académicos;
- fecha / horario;
- laboratorio;
- selección de recursos;
- validación de disponibilidad;
- aprobación;
- cronograma;
- preparación;
- inicio;
- cierre;
- trazabilidad.

### 6. Materiales y Préstamos
Incluye:
- consumibles;
- reutilizables;
- cantidades;
- ubicación;
- disponibilidad;
- préstamos;
- devoluciones;
- consumos;
- transferencias;
- estado / responsable.

### 7. Mantenimiento
Incluye:
- preventivo;
- correctivo;
- programación;
- responsable;
- historial;
- próximo mantenimiento;
- estado;
- seguimiento de incidencias.

### 8. Analítica y Alertas
Incluye:
- stock mínimo;
- caducidades;
- mantenimientos próximos;
- incidencias abiertas;
- utilización de laboratorios;
- consumo;
- indicadores operativos;
- reportes.

---

## 7. Workflow principal de una práctica

### Estados

```text
BORRADOR
   ↓
ENVIADA
   ↓
VALIDACIÓN AUTOMÁTICA
   ↓
EN REVISIÓN
   ↓
 ┌───────────────┬────────────────┐
 │               │                │
APROBADA    REQUIERE AJUSTE    RECHAZADA
 │
 ↓
PROGRAMADA
 │
 ↓
EN PREPARACIÓN
 │
 ↓
LISTA
 │
 ↓
EN CURSO
 │
 ↓
CIERRE
 │
 ↓
FINALIZADA
```

### Flujo

1. Docente crea una práctica desde cero o desde una plantilla. esta plantilla o formato es imprimible 
2. Selecciona fecha, horario y laboratorio.
3. Selecciona reactivos, materiales y equipos existentes.
4. El sistema valida disponibilidad, stock, recursos, conflictos de horario y reglas de anticipación.
5. El técnico revisa principalmente excepciones y puede modificar para acomodarla.
6. Al aprobarse, se reservan recursos y se actualiza el cronograma.
7. El técnico prepara la práctica.
8. Se inicia la actividad.
9. Al finalizar se registran únicamente diferencias: cantidad utilizada, cantidad devuelta, faltantes e incidencias.
10. El sistema actualiza inventario e historiales.

---

## 8. Cronograma

La matriz semanal debe ser una **vista automática**, no un registro manual independiente.

Se genera desde prácticas aprobadas y debe mostrar:

- laboratorio;
- fecha;
- horario;
- práctica;
- docente;
- estado;
- técnico responsable.

Estados visuales sugeridos:
- lista;
- pendiente;
- conflicto;
- en ejecución;
- finalizada.

---

## 9. Dashboard del técnico

Debe responder:

> **¿Qué tengo que hacer hoy?**

Prioridad de información:

1. prácticas del día;
2. pendientes de preparación;
3. solicitudes por revisar;
4. conflictos;
5. incidencias abiertas;
6. mantenimientos próximos;
7. alertas críticas.

Evitar dashboards centrados en gráficos sin acción.

---

## 10. Reglas de negocio clave

### Disponibilidad
Solicitar un recurso **no equivale a consumirlo**.

```text
Existencia física: 100 g
Reservado:          20 g
Disponible:         80 g
Consumido:           0 g
```

El consumo se descuenta en el cierre real de la actividad.

### Material reutilizable

```text
Solicitud → Entrega → Uso → Devolución → Verificación → Disponible
```

### Incidencias
Si una incidencia nace desde una práctica, debe heredar automáticamente:
- fecha;
- laboratorio;
- usuario / responsable;
- práctica;
- recurso involucrado.

### Reposición

```text
Stock insuficiente
      ↓
Buscar en inventario institucional
      ↓
¿Existe en otro laboratorio?
      ├── Sí → transferir / reutilizar
      └── No → generar necesidad de adquisición
```

### Solicitudes
Las reglas de anticipación deben ser configurables; no fijar de forma rígida un plazo único.

---

## 11. Implementación recomendada

### Etapa 1 — Control y visibilidad
**Módulos:** 1, 2, 3 y 4.

Objetivo:
- consolidar información;
- conocer qué existe;
- conocer dónde está;
- conocer disponibilidad;
- estructurar laboratorios, usuarios y responsables.

### Etapa 2 — Automatización operativa
**Módulos:** 5 y 6.

Objetivo:
- digitalizar prácticas;
- automatizar solicitudes;
- validar disponibilidad;
- generar cronograma;
- controlar preparación, consumos, préstamos y devoluciones.

### Etapa 3 — Prevención y gestión
**Módulos:** 7 y 8.

Objetivo:
- prevenir fallos;
- controlar mantenimiento;
- generar alertas;
- obtener indicadores y reportes.

---

## 12. Dependencias funcionales

- Núcleo Institucional: obligatorio.
- Reactivos: requiere Núcleo.
- Equipos: requiere Núcleo.
- Laboratorios: requiere Núcleo.
- Prácticas y Solicitudes: requiere Núcleo + Laboratorios; se integra con los recursos habilitados.
- Materiales y Préstamos: requiere Núcleo.
- Mantenimiento: requiere Núcleo + Equipos.
- Analítica y Alertas: requiere Núcleo + al menos un módulo operativo.

---

## 13. MVP recomendado

Primera versión funcional:

- Núcleo institucional;
- Reactivos;
- Equipos;
- Laboratorios;
- usuarios y roles;
- importación inicial de reactivos;
- disponibilidad;
- estados;
- ubicaciones;
- historial básico;
- cronograma básico de laboratorios.

La siguiente iteración incorpora el flujo de prácticas y automatización operativa.

---

## 14. Fuera de alcance inicial

No incluir inicialmente:

- aplicación móvil nativa;
- ERP / compras completas;
- facturación;
- SSO institucional;
- integraciones no definidas;
- hardware / lectores;
- automatizaciones avanzadas;
- IA;
- desarrollo ilimitado por soporte.

Estas funciones pueden evaluarse como módulos o integraciones posteriores.

---

## 15. Métricas de éxito

- % de prácticas gestionadas digitalmente;
- reducción de conflictos de horario;
- reducción de solicitudes con recursos no disponibles;
- reducción de adquisiciones duplicadas;
- porcentaje de inventario con ubicación conocida;
- consumos registrados correctamente;
- incidencias con contexto completo;
- tiempo medio de revisión de solicitudes;
- porcentaje de prácticas preparadas a tiempo;
- equipos con mantenimiento vigente.

---

## 16. Riesgos de producto

### Sobrefragmentación
No dividir el producto en funciones demasiado pequeñas comercialmente.

### Scope creep
Cada módulo debe tener alcance y criterios de aceptación definidos.

### Datos iniciales
La calidad de la base existente condiciona la migración.

### Reglas pendientes de validar
Antes de desarrollar deben cerrarse:
- quién solicita;
- quién aprueba;
- quién puede modificar;
- reglas de cancelación;
- anticipación;
- transferencias;
- devoluciones parciales;
- excepciones.

---

## 17. Próximo paso recomendado

Antes de desarrollo:

1. validar este PRD 


---

## 18. Definición final del producto

> **Plataforma modular para gestionar la planificación, disponibilidad, operación y trazabilidad de los laboratorios universitarios y sus recursos.**

- **Inventario** = disponibilidad.
- **Práctica** = operación.
- **Cronograma** = planificación.
- **Dashboard** = trabajo diario.
- **Trazabilidad** = control.
- **Analítica** = mejora continua.
