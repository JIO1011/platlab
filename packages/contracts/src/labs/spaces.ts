import { z } from 'zod';
import { expectedVersion, text } from '../common.js';

/**
 * Espacios de Laboratorios (ADR 0023): áreas del Núcleo habilitadas para agendar, con aforo, horario
 * semanal y cierres; feriados comunes y la anticipación del espacio de trabajo. Los configura el
 * Administrador; nada se borra.
 */

/** Anticipación con que se solicita un espacio, para todo el espacio de trabajo. */
export const LEAD_DAYS_DEFAULT = 7;

/** GET /settings: sin ajustes guardados, la anticipación por defecto y la versión 0. */
export const labsSettings = z.object({ leadDays: z.number().int(), version: z.number().int().nonnegative() });

/** PUT /settings: de 0 a 90 días. */
export const updateLabsSettingsRequest = z.object({ leadDays: z.number().int().min(0).max(90) }).strict();

/** Hora de 00:00 a 23:59; 24:00 no es una hora. */
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Debe ser una hora HH:MM');

/** Franja [apertura, cierre) de un día. */
const slot = z
  .object({ opens: time, closes: time })
  .strict()
  .refine((value) => value.opens < value.closes, 'La apertura debe ser antes del cierre');

/** Franjas de un día, ordenadas y sin solaparse; sin franjas, el día está cerrado. */
const daySlots = z
  .array(slot)
  .refine(
    (slots) => slots.every((value, index) => index === 0 || slots[index - 1]!.closes <= value.opens),
    'Las franjas deben ir en orden y sin solaparse',
  );

/** Horario semanal por día ISO: "1" es lunes y "7", domingo (la misma regla que valida SQL). */
export const weeklyHours = z
  .object({ '1': daySlots, '2': daySlots, '3': daySlots, '4': daySlots, '5': daySlots, '6': daySlots, '7': daySlots })
  .strict();

/** Aforo: personas a la vez en el área. */
const capacity = z.number().int().positive().max(2_147_483_647);

export const space = z.object({
  areaId: z.uuid(),
  areaName: z.string(),
  /** La sede o el edificio que contiene el área; nulo si está en la raíz. */
  groupName: z.string().nullable(),
  /** El área se archivó en «Áreas»: el espacio ya no se agenda. */
  areaArchived: z.boolean(),
  capacity: z.number().int().positive(),
  weeklyHours,
  version: z.number().int().positive(),
  archivedAt: z.string().nullable(),
});

/** GET /spaces: los espacios activos y archivados, por sede o edificio y nombre del área. */
export const spaceList = z.object({ items: z.array(space) });

/**
 * POST /spaces: habilita un área activa del Núcleo; uno archivado se reactiva con estos datos y uno
 * activo responde VALIDATION_FAILED.
 */
export const createSpaceRequest = z.object({ areaId: z.uuid(), capacity, weeklyHours }).strict();

/** PATCH /spaces/:areaId: solo lo que llega cambia, con la versión que la persona vio. */
export const updateSpaceRequest = z.object({ capacity: capacity.optional(), weeklyHours: weeklyHours.optional(), expectedVersion }).strict();

export const spaceParams = z.object({ workspaceId: z.uuid(), areaId: z.uuid() });

export const closure = z.object({
  id: z.uuid(),
  /** Nulo: feriado común a todos los espacios. */
  areaId: z.uuid().nullable(),
  areaName: z.string().nullable(),
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
  reason: z.string(),
  voidedAt: z.string().nullable(),
  createdAt: z.string(),
});

/** GET /closures: los que tocan el rango, sin los anulados salvo que se pidan. */
export const closureListQuery = z
  .object({ from: z.iso.date(), to: z.iso.date(), includeVoided: z.stringbool().default(false) })
  .strict()
  .refine((value) => value.from <= value.to, 'El rango empieza antes de terminar');

export const closureList = z.object({ items: z.array(closure) });

/** POST /closures: sin área es un feriado común; con área, de un espacio activo. */
export const createClosureRequest = z
  .object({ areaId: z.uuid().nullable().default(null), startsOn: z.iso.date(), endsOn: z.iso.date(), reason: text(200) })
  .strict()
  .refine((value) => value.startsOn <= value.endsOn, 'El cierre empieza antes de terminar');

export const closureParams = z.object({ workspaceId: z.uuid(), closureId: z.uuid() });

export type LabsSettings = z.infer<typeof labsSettings>;
export type WeeklyHours = z.infer<typeof weeklyHours>;
export type Space = z.infer<typeof space>;
export type SpaceList = z.infer<typeof spaceList>;
export type Closure = z.infer<typeof closure>;
export type ClosureList = z.infer<typeof closureList>;
