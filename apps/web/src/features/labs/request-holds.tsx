import { PackageX, TriangleAlert } from 'lucide-react';
import { holdRows } from './request-hold-rows';
import type { RequestView } from './request-draft';
import { Pill } from './request-status';
import { shortDateText } from './schedule-placement';
import { softCard } from './style';

/**
 * Lo apartado en cada fecha programada (L-01d, ADR 0023), como una línea de tiempo: por fecha, el área, la hora y el
 * responsable de su bloque, con su estado en texto («Apartado» o «Falta apartar recursos»), y debajo lo apartado por
 * línea y, si no alcanza, «Falta». Va fuera de la hoja, como el historial: la hoja es lo que se imprime.
 */
export function RequestHolds({ request }: { request: RequestView }) {
  const blocks = request.blocks.filter((block) => block.holds.length > 0);
  if (blocks.length === 0) return null;
  return (
    <section aria-label="Lo apartado" className={`${softCard} grid gap-6 p-6 sm:p-8 print:hidden`}>
      <h2 className="text-xl font-bold tracking-tight text-ink">Lo apartado</h2>
      <ul className="grid">
        {blocks.map((block) => {
          const rows = holdRows(request.lines, block);
          const short = rows.some((row) => row.missing !== null);
          return (
            <li key={block.date} className="relative grid gap-2.5 pb-7 pl-8 last:pb-0 before:absolute before:bottom-0 before:left-[5px] before:top-3 before:w-px before:bg-line-strong last:before:hidden">
              <span aria-hidden className={`absolute left-0 top-1.5 size-[11px] rounded-full ring-4 ring-surface ${short ? 'bg-warning' : 'bg-success'}`} />
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                <span className="font-semibold text-ink">{shortDateText(block.date)}</span>
                <span className="break-words text-ink-muted tabular-nums">
                  {block.code} · {block.areaName} · {block.startsAt}–{block.endsAt} · {block.responsibleName}
                </span>
                {short ? (
                  <Pill tone="warning" icon={<PackageX aria-hidden className="size-3.5" />}>
                    Falta apartar recursos
                  </Pill>
                ) : (
                  <Pill tone="success">Apartado</Pill>
                )}
              </p>
              <ul className="grid gap-1.5">
                {rows.map((row) => (
                  <li key={row.line} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink">
                    <span className="min-w-0 break-words tabular-nums">{row.text}</span>
                    {row.missing ? (
                      <Pill tone="warning" icon={<TriangleAlert aria-hidden className="size-3.5" />}>
                        {row.missing}
                      </Pill>
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
