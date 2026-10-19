import { cn } from '@platlab/ui';
import { CircleAlert } from 'lucide-react';
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

const tonePill: Record<DueTone, string> = {
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
  neutral: 'bg-surface-sunken text-ink-muted',
};

/** El plazo en una pastilla: siempre con su texto y, solo en lo crítico (vencido o No conforme), un icono (ADR 0021). */
export function DuePill({ tone, children }: { tone: DueTone; children: string }) {
  return (
    <span title={children} className={cn('inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold leading-5', tonePill[tone])}>
      {tone === 'danger' ? <CircleAlert aria-hidden className="size-3.5 shrink-0" /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
