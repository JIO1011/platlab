import { ACTIVITY_CHANGEABLE, type ActivityStage } from '@platlab/contracts';
import { CircleCheck, Lock, Play, type LucideIcon } from 'lucide-react';
import type { Tone } from './request-status';
import { shortDateText } from './schedule-placement';

/** Cómo se llama cada etapa de un bloque (L-01e): siempre con texto, nunca solo con color (ADR 0010). */
export const stageLabels: Record<ActivityStage, string> = {
  scheduled: 'Programada',
  ready: 'Lista',
  running: 'En curso',
  closed: 'Cerrada',
};

/** El ámbar queda para lo pendiente de decidir: «En curso» es una pastilla de tinta sólida y «Cerrada», verde. */
export const stageTones: Record<ActivityStage, Tone> = {
  scheduled: 'neutral',
  ready: 'neutral',
  running: 'strong',
  closed: 'success',
};

/** La marca de cada etapa distinta de «Programada» (L-01e): un ícono con su texto, igual en la solicitud, el Cronograma y «Reservas»; el color no la dice. */
export const stageMarks: Record<Exclude<ActivityStage, 'scheduled'>, LucideIcon> = { ready: CircleCheck, running: Play, closed: Lock };

/** Mover, cancelar y cambiar los frascos, solo antes de empezar. */
export const isChangeable = (stage: ActivityStage): boolean => ACTIVITY_CHANGEABLE.includes(stage);

/** «Reportar incidencia», desde un bloque en curso o cerrado. */
export const canReportIncident = (stage: ActivityStage): boolean => stage === 'running' || stage === 'closed';

/** Las líneas marcadas tras marcar o desmarcar una, sin repetirse y en el orden de la solicitud. */
export function toggleLine(prepared: readonly number[], line: number, checked: boolean): number[] {
  const without = prepared.filter((item) => item !== line);
  return (checked ? [...without, line] : without).sort((a, b) => a - b);
}

/** Cuántas líneas de la solicitud faltan por marcar (las marcadas que ya no existen no cuentan). */
export function uncheckedCount(total: number, prepared: readonly number[]): number {
  return Math.max(0, total - new Set(prepared.filter((line) => line >= 1 && line <= total)).size);
}

/** Lo que «Marcar lista» dice de la lista de chequeo; no bloquea. Sin líneas, nada. */
export function checklistNote(total: number, prepared: readonly number[]): string | null {
  if (total === 0) return null;
  const left = uncheckedCount(total, prepared);
  if (left === 0) return 'Todas las líneas están marcadas.';
  return left === 1 ? 'Falta 1 línea por marcar.' : `Faltan ${left} líneas por marcar.`;
}

/** Por qué «Iniciar» aún no se puede: se inicia desde el día de la práctica. `null` si ya se puede. */
export function startBlockedReason(date: string, today: string): string | null {
  return date > today ? `Se inicia desde el día de la práctica, ${shortDateText(date)}.` : null;
}
