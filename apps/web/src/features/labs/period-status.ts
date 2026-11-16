/** Dónde está un período frente a hoy: aún no empieza, está en curso o ya terminó. */
export type PeriodState = 'scheduled' | 'current' | 'ended';

/** Cómo se dice cada estado y de qué tono es su texto; el estado nunca va solo en color. */
export const periodStateTexts: Record<PeriodState, { label: string; tone: 'success' | 'neutral' }> = {
  scheduled: { label: 'Programado', tone: 'neutral' },
  current: { label: 'Vigente', tone: 'success' },
  ended: { label: 'Terminado', tone: 'neutral' },
};

/**
 * El estado de un período por sus fechas frente a hoy (AAAA-MM-DD en la zona del espacio): no se activa a mano. El primer
 * y el último día cuentan como vigente; las fechas ISO se comparan como texto, que es el orden del calendario.
 */
export const periodState = ({ startsOn, endsOn }: { startsOn: string; endsOn: string }, today: string): PeriodState =>
  today < startsOn ? 'scheduled' : today > endsOn ? 'ended' : 'current';
