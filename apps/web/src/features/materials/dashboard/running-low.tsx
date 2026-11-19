import type { MaterialsDashboard } from '@platlab/contracts';
import { cn, Quantity } from '@platlab/ui';
import { CircleCheck, Clock, TriangleAlert } from 'lucide-react';

/** Hasta 7 días es urgente; hasta 14, hay que pedir ya. Más, solo se vigila. */
function Urgency({ days }: { days: number }) {
  const [Icon, tone] = days <= 7 ? ([TriangleAlert, 'bg-danger-soft text-danger'] as const) : days <= 14 ? ([Clock, 'bg-warning-soft text-warning'] as const) : ([CircleCheck, 'bg-surface-sunken text-ink-muted'] as const);
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold tabular-nums', tone)}>
      <Icon className="size-3.5" aria-hidden />~{days === 1 ? '1 día' : `${days} días`}
    </span>
  );
}

/**
 * Lo que se acaba pronto (ADR 0025): los insumos cuya existencia, al ritmo de los últimos 30 días, alcanza para pocos
 * días. Avisa antes que «Bajo mínimo», que solo mira una cifra fija.
 */
export function RunningLow({ rows }: { rows: MaterialsDashboard['runningLow'] }) {
  if (rows.length === 0) return <p className="py-4 text-sm text-ink-muted">Ningún insumo se acaba en los próximos 90 días al ritmo actual.</p>;
  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.productId} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{row.name}</p>
            <p className="text-[13px] text-ink-muted">
              <Quantity value={row.balance} unit={row.baseUnit} /> · gasta <Quantity value={row.dailyUse} unit={row.baseUnit} /> al día
            </p>
          </div>
          <Urgency days={row.daysLeft} />
        </li>
      ))}
    </ul>
  );
}
