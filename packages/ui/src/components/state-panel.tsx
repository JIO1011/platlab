import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface StatePanelProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'warning' | 'danger';
  className?: string;
}

const toneStyles = {
  neutral: 'bg-surface-sunken text-ink-muted',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

/** Vacío, error, sin permiso o módulo no disponible: cada uno dice qué pasa y qué se puede hacer. */
export function StatePanel({ icon: Icon, title, description, action, tone = 'neutral', className }: StatePanelProps) {
  return (
    <div className={cn('mx-auto flex max-w-md flex-col items-center px-6 py-14 text-center', className)}>
      <span className={cn('mb-4 inline-flex size-11 items-center justify-center rounded-full', toneStyles[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <div className="mt-1.5 text-sm leading-relaxed text-ink-muted">{description}</div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
