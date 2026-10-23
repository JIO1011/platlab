import { z } from 'zod';
import { expectedVersion, text } from '../common.js';
import type { WeeklyHours } from './spaces.js';

/**
 * Cronograma de Laboratorios (ADR 0023, «Reglas y diseño de L-01c»): cada fecha de una solicitud enviada se programa
 * como un bloque en un área, a una hora y con un responsable (un Operador o el Administrador). Las reglas de
 * `scheduleCheck` las usan la validación en vivo al arrastrar y el servidor, que decide con los datos bajo bloqueo.
 */

/** Lo más largo que se pide de una vez: seis semanas. */
export const SCHEDULE_MAX_DAYS = 42;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora HH:MM');

/** El código de un bloque: período, semana desde su inicio, sigla del área y número de esa área en esa semana. */
export const activityCode = (periodCode: string, week: number, abbreviation: string, sequence: number): string =>
  `${periodCode}-S${week}-${abbreviation}${String(sequence).padStart(2, '0')}`;

/** La semana del período en que cae `date` (la primera es la de su inicio), contada de 7 en 7 días. */
export const periodWeek = (startsOn: string, date: string): number => Math.floor((Date.parse(date) - Date.parse(startsOn)) / (7 * 86_400_000)) + 1;

/** El día ISO de la semana (1 lunes … 7 domingo) de una fecha `YYYY-MM-DD`, sin depender de la zona. */
export const isoWeekday = (date: string): number => ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;

// ---------------------------------------------------------------------------
// Reglas al programar
// ---------------------------------------------------------------------------

/** Lo que impide programar (`blocking`) y lo que solo avisa (`capacity`). */
export const scheduleProblem = z.enum(['past', 'period', 'closed', 'hours', 'overlap', 'capacity']);
export type ScheduleProblem = z.infer<typeof scheduleProblem>;

export interface ScheduleSlot {
  date: string;
  startsAt: string;
  endsAt: string;
}

export interface ScheduleContext {
  /** Hoy en la zona del espacio de trabajo: se programa solo hacia el futuro. */
  today: string;
  participants: number;
  space: { capacity: number; weeklyHours: WeeklyHours };
  /** Períodos activos. */
  periods: ReadonlyArray<{ startsOn: string; endsOn: string }>;
  /** Cierres vigentes del área y feriados comunes (sin anular). */
  closures: ReadonlyArray<{ startsOn: string; endsOn: string }>;
  /** Los demás bloques activos del área ese día (sin el que se mueve). */
  others: ReadonlyArray<{ startsAt: string; endsAt: string }>;
}

export interface ScheduleCheck {
  /** Lo que impide programar, en el orden en que se explica. */
  blocking: ScheduleProblem[];
  /** Lo que solo avisa: superar el aforo. */
  warnings: ScheduleProblem[];
}

/** Qué impide o advierte programar `slot` en el área de `context`. `[inicio, fin)`: un bloque empieza cuando otro termina. */
export function scheduleCheck(slot: ScheduleSlot, context: ScheduleContext): ScheduleCheck {
  const blocking: ScheduleProblem[] = [];
  if (slot.date <= context.today) blocking.push('past');
  if (!context.periods.some((period) => period.startsOn <= slot.date && slot.date <= period.endsOn)) blocking.push('period');
  if (context.closures.some((closure) => closure.startsOn <= slot.date && slot.date <= closure.endsOn)) blocking.push('closed');
  const day = context.space.weeklyHours[String(isoWeekday(slot.date)) as keyof WeeklyHours];
  if (!day.some((range) => range.opens <= slot.startsAt && slot.endsAt <= range.closes)) blocking.push('hours');
  if (context.others.some((other) => other.startsAt < slot.endsAt && slot.startsAt < other.endsAt)) blocking.push('overlap');
  return { blocking, warnings: context.participants > context.space.capacity ? ['capacity'] : [] };
}

/** Cómo se explica cada problema en pantalla y en el error del servidor. */
export const scheduleProblemText: Record<ScheduleProblem, string> = {
  past: 'Solo se programa hacia el futuro',
  period: 'La fecha no está en un período activo',
  closed: 'El área está cerrada ese día',
  hours: 'Fuera del horario del área',
  overlap: 'Se cruza con otro bloque del área',
  capacity: 'Supera el aforo del área',
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/** GET /schedule?from&to: los bloques activos del rango, a lo sumo seis semanas. */
export const scheduleQuery = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .strict()
  .refine((value) => value.from <= value.to && (Date.parse(value.to) - Date.parse(value.from)) / 86_400_000 < SCHEDULE_MAX_DAYS, 'Hasta seis semanas, en orden');

/** Un bloque: «Actividad · Solicitante · Grupo» y lo que el Administrador necesita para moverlo. */
export const activity = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
  requestCode: z.string(),
  title: z.string(),
  requesterName: z.string(),
  /** El «Grupo» del bloque: la carrera de la solicitud, si la tiene. */
  group: z.string().nullable(),
  participants: z.number().int(),
  date: z.iso.date(),
  areaId: z.uuid(),
  startsAt: z.string(),
  endsAt: z.string(),
  responsibleId: z.uuid(),
  responsibleName: z.string(),
  code: z.string(),
  version: z.number().int().positive(),
});

export const scheduleList = z.object({ items: z.array(activity) });

/** POST /activities: programa una fecha de una solicitud enviada, con la versión de la solicitud que se vio. */
export const scheduleActivityRequest = z
  .object({
    requestId: z.uuid(),
    date: z.iso.date(),
    areaId: z.uuid(),
    startsAt: time,
    endsAt: time,
    responsibleId: z.uuid(),
    expectedVersion,
  })
  .strict()
  .refine((value) => value.startsAt < value.endsAt, { message: 'La hora de fin va después del inicio', path: ['endsAt'] });

/** PATCH /activities/:activityId: el mismo día, otra área, otra hora u otro responsable; con la versión del bloque. */
export const updateActivityRequest = z
  .object({ areaId: z.uuid(), startsAt: time, endsAt: time, responsibleId: z.uuid(), expectedVersion })
  .strict()
  .refine((value) => value.startsAt < value.endsAt, { message: 'La hora de fin va después del inicio', path: ['endsAt'] });

export const activityParams = z.object({ workspaceId: z.uuid(), activityId: z.uuid() });

/** La respuesta de programar o mover: el bloque y lo que solo avisa (superar el aforo). */
export const scheduledActivity = z.object({ activity, warnings: z.array(scheduleProblem) });

/** GET /schedule/responsibles: quienes pueden llevar un bloque (Operadores y Administradores). */
export const responsibleOptions = z.object({ items: z.array(z.object({ id: z.uuid(), name: z.string() })) });

/** POST /requests/:requestId/lab-cancel: el laboratorio cancela una enviada o programada, con motivo. */
export const labCancelRequest = z.object({ expectedVersion, reason: text(500) }).strict();

export type Activity = z.infer<typeof activity>;
export type ScheduleList = z.infer<typeof scheduleList>;
export type ScheduledActivity = z.infer<typeof scheduledActivity>;
export type ResponsibleOptions = z.infer<typeof responsibleOptions>;
