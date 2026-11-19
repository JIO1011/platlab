import { z } from 'zod';
import { clockTime } from './common.js';
import { decimalString } from './decimal.js';

/**
 * Inicio (ADR 0011 y 0026). Cada panel es una consulta aparte, para que cargue y falle por separado:
 * `…/home` (las tarjetas de los módulos), `…/home/agenda`, `…/home/calendar` y `…/home/tasks`.
 */

/** Movimiento reciente que un módulo muestra en su tarjeta, ya filtrado por el ámbito del miembro. */
export const homeActivity = z.object({
  id: z.uuid(),
  /** Tipo propio del módulo (en Reactivos: receipt, issue o adjustment). */
  type: z.string(),
  title: z.string(),
  detail: z.string(),
  quantity: decimalString,
  unit: z.string(),
  occurredAt: z.iso.datetime({ offset: true }),
  actor: z.string().nullable(),
});

/**
 * Gráfico de una tarjeta (ADR 0011): sucesos por día con ceros incluidos, nunca cantidades de
 * unidades distintas. null si el módulo no tiene una serie que mostrar.
 */
export const homeTrend = z.object({
  label: z.string(),
  points: z
    .array(z.object({ date: z.iso.date(), value: z.number().int().nonnegative() }))
    .max(90),
});

/**
 * GET /v1/workspaces/:workspaceId/home: tarjetas de los módulos visibles. Cada módulo aporta
 * contadores accionables con claves propias (01 §7); null si el módulo todavía no tiene resumen.
 */
export const homeResponse = z.object({
  cards: z.array(
    z.object({
      moduleCode: z.string(),
      name: z.string(),
      summary: z.record(z.string(), z.number().int().nonnegative()).nullable(),
      activity: z.array(homeActivity).max(10),
      trend: homeTrend.nullable(),
    }),
  ),
});

/** Finalizada, en proceso o por iniciar (ADR 0026, «Diseño de IN-01»). */
const agendaStatus = z.enum(['done', 'in_progress', 'upcoming']);

/** Un área del Núcleo (`core.locations`): una fila de Actividad. */
const agendaArea = z.object({ id: z.uuid(), name: z.string() });

/**
 * Una actividad con fecha que aporta un módulo. Sin hora es «Todo el día». `type` es propio del módulo (practice,
 * maintenance, return) y `ref` es lo que se abre en él: el bloque, el equipo o el préstamo. `area` es dónde ocurre
 * (el área del bloque o la del equipo); null si no tiene, como una devolución.
 */
export const agendaItem = z.object({
  moduleCode: z.string(),
  type: z.string(),
  ref: z.uuid(),
  title: z.string(),
  detail: z.string(),
  startsAt: clockTime.nullable(),
  endsAt: clockTime.nullable(),
  status: agendaStatus,
  area: agendaArea.nullable(),
});

const agendaDay = z.object({ date: z.iso.date(), items: z.array(agendaItem) });

/** GET …/home/agenda?date=: el día pedido (hoy por defecto) y, si hoy no queda nada por iniciar, el próximo día con algo. */
export const agendaQuery = z.strictObject({ date: z.iso.date().optional() });

export const homeAgendaResponse = z.object({
  /** Hoy en la zona del espacio: la pantalla dibuja la línea de «ahora» con ella. */
  today: z.iso.date(),
  timeZone: z.string(),
  /** Las áreas que Actividad dibuja como filas, también las libres (ADR 0026): las de Laboratorios, por nombre. */
  areas: z.array(agendaArea),
  day: agendaDay,
  next: agendaDay.nullable(),
});

/** GET …/home/calendar?month=YYYY-MM: cuántas cosas tiene cada día del mes, por tipo. */
export const calendarQuery = z.strictObject({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes AAAA-MM').optional() });

export const homeCalendarResponse = z.object({
  month: z.string(),
  today: z.iso.date(),
  /** Todos los días del mes, también los vacíos. */
  days: z.array(
    z.object({
      date: z.iso.date(),
      total: z.number().int().nonnegative(),
      counts: z.array(z.object({ moduleCode: z.string(), type: z.string(), count: z.number().int().positive() })),
    }),
  ),
});

/** Rojo antes que ámbar (ADR 0026, «Por atender»). */
const taskTone = z.enum(['danger', 'warning']);

/** Un caso de una fila de «Por atender»: `ref` es lo que se abre en el módulo y `date`, la fecha que importa (vence, se reportó). */
const taskCase = z.object({ ref: z.uuid(), title: z.string(), detail: z.string().nullable(), date: z.iso.date().nullable() });

/** Cuántos casos trae cada fila al desplegarse (ADR 0026, revisión de IN-02). */
export const TASK_CASES = 5;

/**
 * Una fila de «Por atender»: `kind` es propio del módulo; la pantalla pone el texto y los enlaces. `cases` son los
 * primeros de la lista de su módulo, en su orden.
 */
const homeTask = z.object({
  moduleCode: z.string(),
  kind: z.string(),
  count: z.number().int().positive(),
  tone: taskTone,
  cases: z.array(taskCase).max(TASK_CASES),
});

/** GET …/home/tasks: lo rojo primero; vacío es «Todo al día». */
export const homeTasksResponse = z.object({ tasks: z.array(homeTask) });

export type HomeResponse = z.infer<typeof homeResponse>;
export type HomeActivity = z.infer<typeof homeActivity>;
export type HomeTrend = z.infer<typeof homeTrend>;
export type AgendaStatus = z.infer<typeof agendaStatus>;
export type AgendaItem = z.infer<typeof agendaItem>;
export type AgendaArea = z.infer<typeof agendaArea>;
export type HomeAgendaResponse = z.infer<typeof homeAgendaResponse>;
export type HomeCalendarResponse = z.infer<typeof homeCalendarResponse>;
export type TaskTone = z.infer<typeof taskTone>;
export type HomeTask = z.infer<typeof homeTask>;
export type TaskCase = z.infer<typeof taskCase>;
export type HomeTasksResponse = z.infer<typeof homeTasksResponse>;
