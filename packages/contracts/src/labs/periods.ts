import { z } from 'zod';
import { expectedVersion } from '../common.js';

/**
 * Períodos de Laboratorios (ADR 0023, «Períodos y sigla»): identifican la actividad en el código de la solicitud
 * programada (P1-S12-ANT03, la semana se cuenta desde su inicio) y fuera de ellos no se agenda. Los activos no se
 * solapan ni repiten código; se archivan, no se borran. `labs.periods` aplica las mismas reglas.
 */

/** Un código corto en mayúsculas: «P1», «2026-1». */
const periodCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{0,9}$/, 'Hasta 10 letras, números o guiones, sin tildes');

/** Un período empieza antes de terminar y dura hasta un año (366 días contando los dos extremos); fechas ISO. */
export const periodDatesValid = (startsOn: string, endsOn: string): boolean =>
  startsOn <= endsOn && (Date.parse(endsOn) - Date.parse(startsOn)) / 86_400_000 <= 365;

const dates = (value: { startsOn?: string | undefined; endsOn?: string | undefined }) =>
  value.startsOn === undefined || value.endsOn === undefined || periodDatesValid(value.startsOn, value.endsOn);
const datesMessage = { message: 'El período empieza antes de terminar y dura hasta un año', path: ['endsOn'] };

export const period = z.object({
  id: z.uuid(),
  code: z.string(),
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
  version: z.number().int().positive(),
  archivedAt: z.string().nullable(),
});

/** GET /periods: los activos por fecha de inicio y después los archivados. */
export const periodList = z.object({ items: z.array(period) });

/** POST /periods: un código libre (CODE_TAKEN) y fechas que no se crucen con otro activo (VALIDATION_FAILED). */
export const createPeriodRequest = z
  .object({ code: periodCode, startsOn: z.iso.date(), endsOn: z.iso.date() })
  .strict()
  .refine(dates, datesMessage);

/** PATCH /periods/:periodId: solo lo que llega cambia, con la versión que la persona vio. */
export const updatePeriodRequest = z
  .object({ code: periodCode.optional(), startsOn: z.iso.date().optional(), endsOn: z.iso.date().optional(), expectedVersion })
  .strict()
  .refine(dates, datesMessage);

export const periodParams = z.object({ workspaceId: z.uuid(), periodId: z.uuid() });

export type Period = z.infer<typeof period>;
export type PeriodList = z.infer<typeof periodList>;
