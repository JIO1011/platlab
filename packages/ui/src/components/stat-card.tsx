import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { IconChip, type IconChipProps } from './icon-chip';

const hintTones = {
  neutral: 'text-ink-muted',
  accent: 'text-action',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export interface StatCardProps {
  label: string;
  /** La cifra: un dato real del servidor, nunca decorativo. */
  value: ReactNode;
  /** Línea de estado bajo la cifra; su color es de estado solo si hay estado que decir. */
  hint?: string | undefined;
  hintTone?: keyof typeof hintTones;
  icon: LucideIcon;
  tone?: IconChipProps['tone'];
  /** Más bajo, para tableros que caben en una ventana (ADR 0012, 05-10-2026). */
  compact?: boolean;
  className?: string;
}

/**
 * Indicador al estilo ReactiLab (ADR 0010, 04-10-2026): etiqueta y cifra a la izquierda, icono de
 * color a la derecha y, debajo, una línea de estado. Es una pieza de presentación: si abre una
 * vista, quien la usa la envuelve en el enlace y le pone el `group` para la elevación al pasar.
 */
export function StatCard({ label, value, hint, hintTone = 'neutral', icon, tone = 'accent', compact = false, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex h-full items-start justify-between gap-3 rounded-card bg-surface shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo group-hover:shadow-float motion-safe:group-hover:-translate-y-1',
        compact ? 'p-4 lg:px-5' : 'p-4 sm:gap-4 sm:p-6',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <p className={cn('font-bold tracking-tight text-ink tabular-nums', compact ? 'mt-1 text-[1.75rem] leading-tight' : 'mt-2 text-3xl')}>
          {value}
        </p>
        {hint ? (
          <p className={cn('text-xs font-medium', compact ? 'mt-1' : 'mt-2', hintTones[hintTone], hintTone !== 'neutral' && 'font-bold')}>{hint}</p>
        ) : null}
      </div>
      <IconChip
        icon={icon}
        tone={tone}
        className={cn(
          compact ? 'size-10 rounded-xl [&>svg]:size-5' : 'size-10 rounded-xl sm:size-12 sm:rounded-2xl [&>svg]:size-5 sm:[&>svg]:size-6',
        )}
      />
    </div>
  );
}
