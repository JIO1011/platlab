import { Badge } from '@platlab/ui';
import { PackageX, TriangleAlert } from 'lucide-react';
import { holdRows } from './request-hold-rows';
import type { RequestView } from './request-draft';
import { shortDateText } from './schedule-placement';

/**
 * Lo apartado en cada fecha programada (L-01d, ADR 0023): bajo el código, el área, la hora y el responsable de su bloque,
 * lo apartado por línea y, si no alcanza, «Falta». Va fuera de la hoja, como el historial: la hoja es lo que se imprime.
 */
export function RequestHolds({ request }: { request: RequestView }) {
  const blocks = request.blocks.filter((block) => block.holds.length > 0);
  if (blocks.length === 0) return null;
  return (
    <section aria-label="Lo apartado" className="grid gap-4 rounded-card bg-surface px-4 py-5 shadow-raised sm:px-5 print:hidden">
      <h2 className="text-lg font-semibold text-ink">Lo apartado</h2>
      <ul className="grid gap-4">
        {blocks.map((block) => {
          const rows = holdRows(request.lines, block);
          const short = rows.some((row) => row.missing !== null);
          return (
            <li key={block.date} className="grid gap-2">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold text-ink">{shortDateText(block.date)}</span>
                <span className="break-words text-ink-muted tabular-nums">
                  {block.code} · {block.areaName} · {block.startsAt}–{block.endsAt} · {block.responsibleName}
                </span>
                {short ? (
                  <Badge tone="warning">
                    <PackageX aria-hidden className="size-3.5" />
                    Falta apartar recursos
                  </Badge>
                ) : null}
              </p>
              <ul className="grid gap-1.5">
                {rows.map((row) => (
                  <li key={row.line} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink">
                    <span className="min-w-0 break-words tabular-nums">{row.text}</span>
                    {row.missing ? (
                      <Badge tone="warning">
                        <TriangleAlert aria-hidden className="size-3.5" />
                        {row.missing}
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
