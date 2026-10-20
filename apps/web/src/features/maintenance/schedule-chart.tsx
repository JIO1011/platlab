import type { MaintenanceIndicators } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { ChartDataTable, ChartGrid, ChartLegend, ChartTooltip, ChartYAxis, MonthRowHeader, useChartCursor } from '../../app/bar-chart-parts';
import { niceScale } from '../../app/chart-scale';
import { scheduleText, schedulePoints, scheduleTotals } from './indicator-text';

/** Programado es el riel gris; Hecho, el relleno en el acento. */
const legend = [
  { name: 'Programado', fill: 'bg-line-strong' },
  { name: 'Hecho', fill: 'bg-action' },
];

/**
 * «Programado frente a realizado» (M-01c; Resumen, ADR 0021): una barra de tope redondeado por mes. Su riel gris es lo
 * programado y, encima, en el acento, lo hecho; una leyenda dice cuál es cuál. El mes actual se rotula «en curso».
 * Puntero y teclado (flechas, Inicio, Fin) muestran el mes; la lectura en texto y la tabla lo dejan leer sin interactuar.
 */
export function ScheduleChart({ months }: { months: MaintenanceIndicators['months'] }) {
  const points = schedulePoints(months);
  const { active, setActive, groupProps } = useChartCursor(points.length);
  const totals = scheduleTotals(months);
  const { max, ticks } = niceScale(Math.max(...months.map((entry) => entry.due)));
  const current = active === null ? null : (points[active] ?? null);
  const label = 'Trabajos programados y hechos por mes';

  return (
    <figure className="@container m-0">
      <figcaption className="sr-only">Cada barra es lo programado en el mes; la parte llena, lo que ya se hizo.</figcaption>
      <ChartLegend items={legend} />
      <div className="mt-5 flex gap-3">
        <ChartYAxis ticks={ticks} max={max} />
        <div className="relative h-40 flex-1 lg:h-52">
          <ChartGrid ticks={ticks} max={max} />
          <div role="group" aria-label={label} {...groupProps} className="relative flex h-full items-end gap-1 rounded-[6px] outline-offset-4">
            {points.map((point, index) => (
              // La columna entera es la zona de puntero: más grande que la barra.
              <div key={point.month} className="flex h-full flex-1 items-end justify-center" onPointerEnter={() => setActive(index)}>
                <span
                  className={cn(
                    'relative w-full max-w-6 overflow-hidden rounded-t-[8px] bg-line-strong transition-opacity duration-150',
                    active !== null && active !== index && 'opacity-45',
                  )}
                  style={{ height: point.due === 0 ? 0 : `${Math.max(3, (point.due / max) * 100)}%` }}
                >
                  <span className="absolute inset-x-0 bottom-0 bg-action" style={{ height: `${(point.done / point.due) * 100}%` }} />
                </span>
              </div>
            ))}
            {current && active !== null ? (
              <ChartTooltip index={active} count={points.length} x={current.x} className="mb-4">
                <strong className="block font-semibold">{scheduleText(current)}</strong>
                <span className="opacity-80">
                  {current.long}
                  {current.current ? ' · en curso' : ''}
                </span>
              </ChartTooltip>
            ) : null}
          </div>
        </div>
      </div>
      {/* Eje X: el año bajo el primer mes y bajo cada enero; el mes actual, «en curso». En ancho justo, uno sí y uno no. */}
      <div className="relative ml-9 mt-2 h-9 text-[12px] leading-4 text-ink-muted" aria-hidden>
        {points.map((point, index) => (
          <span
            key={point.month}
            className={cn(
              'absolute top-0 -translate-x-1/2 whitespace-nowrap text-center',
              !point.year && ((points.length - 1 - index) % 2 === 1 || points[index - 1]?.year || points[index + 1]?.year) && '@max-md:hidden',
            )}
            style={{ left: `${point.x}%` }}
          >
            {point.short}
            {point.year && !point.current ? <span className="block text-[11px] text-ink-subtle">{point.year}</span> : null}
          </span>
        ))}
        <span className="absolute right-0 top-4 whitespace-nowrap text-[11px] font-medium text-ink">en curso</span>
      </div>
      <p className="mt-3 text-sm text-ink">
        {scheduleText(totals)} <span className="text-ink-muted">en los 12 meses</span>
      </p>
      <p className="sr-only" aria-live="polite">
        {current ? `${current.long}: ${scheduleText(current)}` : ''}
      </p>
      <ChartDataTable label={label}>
        <thead>
          <tr className="border-b border-line text-ink-muted">
            <th scope="col" className="py-1.5 pr-3 font-medium">Mes</th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">Programados</th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">Hechos</th>
            <th scope="col" className="py-1.5 pl-2 text-right font-medium">A tiempo</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month} className="border-b border-line last:border-0">
              <MonthRowHeader long={point.long} current={point.current} />
              <td className="px-2 py-1.5 text-right tabular-nums text-ink">{point.due}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-ink">{point.done}</td>
              <td className="py-1.5 pl-2 text-right tabular-nums text-ink">{point.onTime}</td>
            </tr>
          ))}
        </tbody>
      </ChartDataTable>
    </figure>
  );
}
