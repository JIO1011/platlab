import { cn } from '@platlab/ui';
import type { DueTone } from './due';

/** El color de un plazo cuenta su estado y siempre va con su texto (ADR 0010): rojo, ámbar, verde o gris. */
export const toneText: Record<DueTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  success: 'text-success',
  neutral: 'text-ink-muted',
};

const toneDot: Record<DueTone, string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  success: 'bg-success',
  neutral: 'bg-ink-subtle',
};

/** El punto del semáforo; decorativo, el texto de al lado dice el estado. */
export function DueDot({ tone, className }: { tone: DueTone; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', toneDot[tone], className)} />;
}

const monthDay = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthDayYear = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** «20 oct»; con el año si no es el de hoy («20 oct 2027»). Ambas fechas son AAAA-MM-DD. */
export function shortDue(dueOn: string, today: string): string {
  const [year, month, day] = dueOn.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  return dueOn.slice(0, 4) === today.slice(0, 4) ? monthDay.format(date) : monthDayYear.format(date);
}
