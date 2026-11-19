import type { MaterialsDashboard } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { ChartDataTable, ChartGrid, ChartLegend, ChartTooltip, ChartYAxis, useChartCursor } from '../../../app/bar-chart-parts';
import { niceScale } from '../../../app/chart-scale';
import { weekLabel } from './change';

type Week = MaterialsDashboard['weekly'][number];

/** Las series, en orden fijo: el color sigue a la serie y nunca a su rango (azul, naranja, aqua). */
const series = [
  { key: 'issued', name: 'Salidas', fill: 'bg-chart-1', stroke: 'var(--color-chart-1)' },
  { key: 'lent', name: 'Vales de préstamo', fill: 'bg-chart-2', stroke: 'var(--color-chart-2)' },
  { key: 'received', name: 'Ingresos', fill: 'bg-chart-3', stroke: 'var(--color-chart-3)' },
] as const satisfies ReadonlyArray<{ key: keyof Week; name: string; fill: string; stroke: string }>;

/**
 * Movimientos por semana (ADR 0025): cuántas salidas, vales e ingresos hubo cada semana, en una sola escala porque son
 * cuentas. Líneas de 2 px; al pasar el puntero o con las flechas, una guía vertical y una ventana con las tres cifras de
 * esa semana; los extremos llevan su marcador. La tabla de «Ver datos» da lo mismo sin gráfico.
 */
export function FlowChart({ weeks }: { weeks: MaterialsDashboard['weekly'] }) {
  const count = weeks.length;
  const { active, setActive, groupProps } = useChartCursor(count);
  const { max, ticks } = niceScale(Math.max(0, ...weeks.flatMap((week) => series.map(({ key }) => week[key]))));
  const x = (index: number) => ((index + 0.5) / count) * 100;
  const y = (value: number) => 100 - (value / max) * 100;
  const empty = weeks.every((week) => series.every(({ key }) => week[key] === 0));

  if (empty) return <p className="rounded-panel bg-surface-sunken px-4 py-10 text-center text-sm text-ink-muted">Aún no hay movimientos en las últimas 8 semanas.</p>;

  return (
    <div className="grid gap-3">
      <ChartLegend items={series.map(({ name, fill }) => ({ name, fill }))} />
      <div className="flex gap-2">
        <div className="flex h-52 shrink-0">
          <ChartYAxis ticks={ticks} max={max} />
        </div>
        <div className="min-w-0 flex-1">
          <div role="group" aria-label="Movimientos por semana. Usa las flechas para recorrer las semanas." className="relative h-52 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action" {...groupProps}>
            <ChartGrid ticks={ticks} max={max} />
            <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              {series.map(({ key, stroke }) => (
                <polyline
                  key={key}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  points={weeks.map((week, index) => `${x(index)},${y(week[key])}`).join(' ')}
                />
              ))}
            </svg>
            {active === null ? null : <span aria-hidden className="absolute inset-y-0 w-px bg-line-strong" style={{ left: `${x(active)}%` }} />}
            {series.map(({ key, fill }) =>
              weeks.map((week, index) =>
                index === count - 1 || index === active ? (
                  <span
                    key={`${key}-${index}`}
                    aria-hidden
                    className={cn('absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-surface', fill)}
                    style={{ left: `${x(index)}%`, bottom: `${100 - y(week[key])}%` }}
                  />
                ) : null,
              ),
            )}
            {/* Una columna por semana: el área que atrapa el puntero es toda la columna, no el punto. */}
            <div className="absolute inset-0 flex">
              {weeks.map((week, index) => (
                <div key={week.week} className="h-full flex-1" onPointerEnter={() => setActive(index)} onPointerMove={() => setActive(index)} />
              ))}
            </div>
            {active === null ? null : (
              <ChartTooltip index={active} count={count} x={x(active)} className="mb-1">
                <p className="mb-1 font-semibold">Semana del {weekLabel(weeks[active]!.week)}</p>
                {series.map(({ key, name, stroke }) => (
                  <p key={key} className="flex items-center gap-2">
                    <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ backgroundColor: stroke }} />
                    <b className="tabular-nums">{weeks[active]![key]}</b>
                    <span className="opacity-80">{name.toLowerCase()}</span>
                  </p>
                ))}
              </ChartTooltip>
            )}
          </div>
          <div className="mt-1.5 flex text-[12px] text-ink-muted" aria-hidden>
            {weeks.map((week) => (
              <span key={week.week} className="flex-1 text-center tabular-nums">
                {weekLabel(week.week)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <ChartDataTable label="Movimientos por semana">
        <thead>
          <tr className="text-ink-muted">
            <th scope="col" className="py-1.5 pr-3 font-medium">
              Semana del
            </th>
            {series.map(({ key, name }) => (
              <th key={key} scope="col" className="py-1.5 pr-3 text-right font-medium">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {weeks.map((week) => (
            <tr key={week.week}>
              <th scope="row" className="py-1.5 pr-3 font-normal text-ink">
                {weekLabel(week.week)}
              </th>
              {series.map(({ key }) => (
                <td key={key} className="py-1.5 pr-3 text-right tabular-nums">
                  {week[key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </ChartDataTable>
    </div>
  );
}
