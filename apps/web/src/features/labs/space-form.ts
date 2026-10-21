import type { WeeklyHours } from '@platlab/contracts';
import type { z } from 'zod';
import { fieldErrors } from '../../app/commands';
import { days } from './hours-text';

/** Horario sin ninguna franja: todos los días cerrados, de donde parte un espacio nuevo. */
export const closedWeek: WeeklyHours = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [], '7': [] };

/** El aforo escrito en el campo; si no es un número entero, `undefined` y el contrato lo rechaza. */
export const capacityOf = (text: string): number | undefined => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : undefined);

/** Lo que el contrato rechazó de un espacio, dicho donde la persona lo corrige. */
export interface SpaceIssues {
  areaId?: string | undefined;
  capacity?: string | undefined;
  hours?: string | undefined;
}

/**
 * Los errores del contrato (`createSpaceRequest` y `updateSpaceRequest`) en palabras de la hoja. Los del horario
 * nombran el día: «Lunes: La apertura debe ser antes del cierre».
 */
export function spaceIssues(error: z.ZodError): SpaceIssues {
  const fields = fieldErrors(error);
  const hours = error.issues.find((issue) => issue.path[0] === 'weeklyHours');
  const day = days.find((entry) => entry.key === hours?.path[1]);
  return {
    areaId: fields['areaId'] ? 'Elige un área.' : undefined,
    capacity: fields['capacity'] ? 'Escribe cuántas personas caben a la vez (1 o más).' : undefined,
    hours: hours
      ? `${day ? `${day.name}: ` : ''}${hours.code === 'invalid_format' ? 'Completa la apertura y el cierre.' : hours.message}`
      : undefined,
  };
}
