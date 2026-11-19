import type { MaterialsSummary } from '@platlab/contracts';
import { Skeleton } from '@platlab/ui';

/**
 * La franja de cifras sobre la lista (ADR 0025), en una sola línea con divisores: cuántos materiales hay, cuántos piden
 * reposición, cuántas áreas tienen material y cuántos préstamos están abiertos. Sin tarjetas: la lista manda.
 */
export function InventoryStats({ summary, areas }: { summary: MaterialsSummary | undefined; areas: number | undefined }) {
  const stats = [
    { label: 'Materiales', value: summary?.materials },
    { label: 'Bajo mínimo', value: summary?.belowMinimum, warn: (summary?.belowMinimum ?? 0) > 0 },
    { label: 'Áreas con material', value: areas },
    { label: 'Préstamos abiertos', value: summary?.openLoans },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card bg-line shadow-raised sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-surface px-4 py-3 sm:px-5">
          <dt className="text-[13px] font-medium text-ink-muted">{stat.label}</dt>
          <dd className={`mt-0.5 text-2xl font-bold tabular-nums tracking-tight ${stat.warn ? 'text-warning' : 'text-ink'}`}>
            {stat.value === undefined ? <Skeleton className="mt-1 h-7 w-10" /> : stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
