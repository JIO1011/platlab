import { cn } from '@platlab/ui';
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react';
import { Sparkline } from '../../../app/trend-chart';
import { changePercent } from './change';

/** Qué dirección es buena: subir las salidas no es bueno ni malo; subir las bajas es malo. */
type Good = 'up' | 'down' | 'neutral';

function Delta({ current, previous, good, days }: { current: number; previous: number; good: Good; days: number }) {
  const change = changePercent(current, previous);
  const direction = change === null ? 'up' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;
  const better = direction === 'flat' || good === 'neutral' ? null : direction === good;
  const tone = better === null ? 'text-ink-muted' : better ? 'text-success' : 'text-danger';
  const text = change === null ? 'Nuevo' : change === 0 ? 'Sin cambio' : `${Math.abs(change)} %`;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-muted">
      <span className={cn('inline-flex items-center gap-0.5 font-semibold tabular-nums', tone)}>
        <Icon className="size-3.5" aria-hidden />
        {text}
      </span>
      <span>frente a los {days} d anteriores</span>
    </p>
  );
}

/**
 * Una cifra del tablero (ADR 0025): el valor del periodo, su cambio frente al periodo anterior (con flecha y texto: el
 * color nunca va solo) y, si hay serie, su minigráfico por semana. El icono es decorativo.
 */
export function KpiTile({
  label,
  icon: Icon,
  current,
  previous,
  good,
  days,
  spark,
}: {
  label: string;
  icon: LucideIcon;
  current: number;
  previous: number;
  good: Good;
  days: number;
  spark?: { date: string; value: number }[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-card bg-surface p-4 shadow-raised">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-muted">{label}</p>
        <span aria-hidden className="inline-flex size-8 items-center justify-center rounded-full bg-action-soft text-action">
          <Icon className="size-4" />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-metric-sm tabular-nums text-ink">{current}</p>
        {spark ? <Sparkline points={spark} className="h-9 w-20 shrink-0" /> : null}
      </div>
      <Delta current={current} previous={previous} good={good} days={days} />
    </div>
  );
}
