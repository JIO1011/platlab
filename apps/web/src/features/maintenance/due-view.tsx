import { cn } from '@platlab/ui';
import { dueText, type DueTone } from './due';

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

/** El plazo con su estado en palabras, para que el color nunca vaya solo: «Atrasado · hace 3 días», «Vence hoy», «en 12 días». */
export function dueStatus(dueOn: string, today: string): string {
  const text = dueText(dueOn, today);
  return dueOn < today ? `Atrasado · ${text}` : text;
}
