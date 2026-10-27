import { cn } from '@platlab/ui';
import { Check, Minus, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { resourceRows, type ResourceRow } from './request-detail';
import type { RequestView } from './request-draft';
import { Pill } from './request-status';
import { softCard } from './style';

const tones: Record<ResourceRow['tone'], { bar: string; icon: LucideIcon }> = {
  success: { bar: 'bg-success', icon: Check },
  warning: { bar: 'bg-warning', icon: TriangleAlert },
  neutral: { bar: 'bg-ink-subtle', icon: Minus },
};

/** Cuánto de lo pedido cubre lo disponible: el color y el texto de la fila cuentan el estado; la barra, la medida. */
function CoverageBar({ row }: { row: ResourceRow }) {
  if (row.percent === null) return <span aria-hidden className="h-2 rounded-full border border-dashed border-line-strong" />;
  return (
    <span role="img" aria-label={`Cubre el ${row.percent} % de lo pedido`} className="h-2 overflow-hidden rounded-full bg-ink/10">
      <span className={cn('block h-full rounded-full transition-[width] duration-300', tones[row.tone].bar)} style={{ width: row.percent === 0 ? '4px' : `${row.percent}%` }} />
    </span>
  );
}

const columns = 'sm:grid sm:grid-cols-[minmax(0,1.5fr)_5.5rem_minmax(0,1.3fr)_7.5rem] sm:items-center sm:gap-x-4';

/**
 * «Recursos» de una solicitud recibida: una tabla Recurso / Pedido / Disponible / Estado, con una barra de lo disponible
 * frente a lo pedido (o de lo apartado, si ya está programada) y el estado en una pastilla con texto. En el móvil, cada
 * fila es un bloque con sus rótulos.
 */
export function ResourcesCard({ request }: { request: RequestView }) {
  const id = useId();
  const rows = resourceRows(request);
  return (
    <section aria-labelledby={id} className={cn(softCard, 'grid gap-4 p-5 sm:p-6 print:hidden')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="text-lg font-bold tracking-tight text-ink">
          Recursos
        </h2>
        <p className="text-sm text-ink-muted">Las cantidades son por fecha.</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No pidió reactivos, equipos ni materiales.</p>
      ) : (
        <div role="table" aria-label="Recursos pedidos" className="grid">
          <div role="row" className={cn(columns, 'hidden border-b border-line pb-2 text-[13px] font-semibold text-ink-muted')}>
            <span role="columnheader">Recurso</span>
            <span role="columnheader">Pedido</span>
            <span role="columnheader">Disponible</span>
            <span role="columnheader">Estado</span>
          </div>
          {rows.map((row) => {
            const { icon: Icon } = tones[row.tone];
            return (
              <div key={row.line} role="row" className={cn(columns, 'grid gap-x-4 gap-y-2 border-b border-line py-3 last:border-b-0 last:pb-0 sm:py-3.5')}>
                <span role="cell" className="flex min-w-0 items-start justify-between gap-3 sm:block">
                  <span className="min-w-0 break-words text-sm font-semibold text-ink">{row.name}</span>
                  <span className="sm:hidden">
                    <Pill tone={row.tone} icon={<Icon aria-hidden className="size-3.5" />}>
                      {row.status}
                    </Pill>
                  </span>
                </span>
                <span role="cell" className="text-sm text-ink tabular-nums">
                  <span className="text-ink-muted sm:hidden">Pedido: </span>
                  {row.requested}
                </span>
                <span role="cell" className="grid gap-1.5 text-sm text-ink tabular-nums">
                  <span>
                    <span className="text-ink-muted sm:hidden">{row.held ? 'Apartado: ' : 'Disponible: '}</span>
                    {row.available ?? <span className="text-ink-muted">—</span>}
                    {row.held ? <span className="max-sm:hidden text-ink-muted"> apartado</span> : null}
                  </span>
                  <CoverageBar row={row} />
                </span>
                <span role="cell" className="max-sm:hidden">
                  <Pill tone={row.tone} icon={<Icon aria-hidden className="size-3.5" />}>
                    {row.status}
                  </Pill>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
