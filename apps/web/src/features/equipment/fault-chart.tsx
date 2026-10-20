import type { FaultStats } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { ChartDataTable, ChartGrid, ChartLegend, ChartTooltip, ChartYAxis, MonthRowHeader, useChartCursor } from '../../app/bar-chart-parts';
import { faultCountsText, faultPlot, monthReading } from './fault-series';

/**
 * Las dos series, una junto a la otra en cada mes: Reportados en el acento, Solucionados en `success`. Cada una va
 * siempre en su lugar (Reportados a la izquierda) y la leyenda las nombra con texto: el color nunca va solo.
 */
const series = {
  reported: { name: 'Reportados', y: 'reportedY', fill: 'bg-action' },
  resolved: { name: 'Solucionados', y: 'resolvedY', fill: 'bg-success' },
} as const;
const order = ['reported', 'resolved'] as const;

/** Un valor en cero no desaparece: queda una raya de 2 px sobre la base, que dice «se midió y fue cero». */
const barHeight = (value: number, percent: number) => (value === 0 ? '2px' : `${Math.max(3, percent)}%`);

/**
 * «Incidentes en 12 meses» (Resumen de Equipos, ADR 0019, 0021): reportados y solucionados por mes en barras
 * agrupadas, de tope redondeado y con el cero visible. Es la excepción a «Serie única» (DESIGN.md): comparar las dos
 * es el dato, así que lleva leyenda. El eje X rotula el mes actual «en curso». Puntero y teclado (flechas, Inicio,
 * Fin) muestran el mes y lo dicen en una lectura `aria-live`; «Ver datos» abre la tabla con los 12 meses.
 */
export function FaultChart({ months }: { months: FaultStats['months'] }) {
  const { max, ticks, points } = faultPlot(months);
  const { active, setActive, groupProps } = useChartCursor(points.length);
  const current = active === null ? null : (points[active] ?? null);
  const first = points[0];
  const last = points[points.length - 1];
  const label = `Incidentes reportados y solucionados por mes${first && last ? `, de ${first.long} a ${last.long}` : ''}`;
  // Con enero justo antes o en el mes actual, el año de enero y «en curso» se pisarían: «en curso» baja a otra fila.
  const stacked = Boolean(last?.year || points[points.length - 2]?.year);

  return (
    <figure className="@container m-0">
      <figcaption className="sr-only">Cada mes tiene dos barras: los incidentes reportados y los solucionados.</figcaption>
      <ChartLegend items={order.map((name) => series[name])} />
      <div className="mt-5 flex gap-3">
        <ChartYAxis ticks={ticks} max={max} />
        <div className="relative h-44 flex-1">
          <ChartGrid ticks={ticks} max={max} />
          <div role="group" aria-label={label} {...groupProps} className="relative flex h-full items-end rounded-[6px] outline-offset-4">
            {points.map((point, index) => (
              // La columna entera del mes es la zona de puntero: más grande que cualquier barra.
              <div
                key={point.month}
                className={cn(
                  'flex h-full flex-1 items-end justify-center gap-[2px] px-[3px] transition-opacity duration-150 motion-reduce:transition-none',
                  active !== null && active !== index && 'opacity-45',
                )}
                onPointerEnter={() => setActive(index)}
              >
                {order.map((name) => (
                  <span
                    key={name}
                    aria-hidden
                    className={cn('w-full max-w-4 flex-1 rounded-t-[4px]', series[name].fill)}
                    style={{ height: barHeight(point[name], point[series[name].y]) }}
                  />
                ))}
              </div>
            ))}
            {current && active !== null ? (
              <ChartTooltip index={active} count={points.length} x={current.x} className="mb-2">
                <strong className="block font-semibold">{faultCountsText(current.reported, current.resolved)}</strong>
                <span className="opacity-80">
                  {current.long}
                  {current.current ? ' · en curso' : ''}
                </span>
              </ChartTooltip>
            ) : null}
          </div>
        </div>
      </div>
      {/* Eje X: el mes corto, el año bajo el primero y bajo cada enero y «en curso» bajo el actual. En ancho justo, uno sí y uno no. */}
      <div className={cn('relative ml-9 mt-2 text-[12px] leading-4 text-ink-muted', stacked ? 'h-[3.25rem]' : 'h-9')} aria-hidden>
        {points.map((point, index) => (
          <span
            key={point.month}
            className={cn(
              'absolute top-0 -translate-x-1/2 whitespace-nowrap text-center',
              !point.year && !point.current && ((points.length - 1 - index) % 2 === 1 || points[index - 1]?.year || points[index + 1]?.year) && '@max-md:hidden',
            )}
            style={{ left: `${point.x}%` }}
          >
            {point.short}
            {point.year ? <span className="block text-[11px] text-ink-subtle">{point.year}</span> : null}
          </span>
        ))}
        <span className={cn('absolute right-0 whitespace-nowrap text-[11px] font-medium text-ink', stacked ? 'top-8' : 'top-4')}>en curso</span>
      </div>
      <p className="sr-only" aria-live="polite">
        {current ? monthReading(current) : ''}
      </p>
      <ChartDataTable label={label}>
        <thead>
          <tr className="border-b border-line text-ink-muted">
            <th scope="col" className="py-1.5 pr-3 font-medium">Mes</th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">{series.reported.name}</th>
            <th scope="col" className="py-1.5 pl-2 text-right font-medium">{series.resolved.name}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month} className="border-b border-line last:border-0">
              <MonthRowHeader long={point.long} current={point.current} />
              <td className="px-2 py-1.5 text-right tabular-nums text-ink">{point.reported}</td>
              <td className="py-1.5 pl-2 text-right tabular-nums text-ink">{point.resolved}</td>
            </tr>
          ))}
        </tbody>
      </ChartDataTable>
    </figure>
  );
}
