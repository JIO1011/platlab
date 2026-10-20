import type { FaultStats } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { useState, type KeyboardEvent } from 'react';
import { stepIndex } from '../../app/chart-scale';
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
  const [active, setActive] = useState<number | null>(null);
  const { max, ticks, points } = faultPlot(months);
  const current = active === null ? null : (points[active] ?? null);
  const first = points[0];
  const last = points[points.length - 1];
  const label = `Incidentes reportados y solucionados por mes${first && last ? `, de ${first.long} a ${last.long}` : ''}`;
  // Con enero justo antes o en el mes actual, el año de enero y «en curso» se pisarían: «en curso» baja a otra fila.
  const stacked = Boolean(last?.year || points[points.length - 2]?.year);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = stepIndex(event.key, active, points.length);
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  }

  return (
    <figure className="@container m-0">
      <figcaption className="sr-only">Cada mes tiene dos barras: los incidentes reportados y los solucionados.</figcaption>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-muted" aria-label="Leyenda">
        {order.map((name) => (
          <li key={name} className="inline-flex items-center gap-2">
            <span aria-hidden className={cn('size-3 rounded-[4px]', series[name].fill)} />
            {series[name].name}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex gap-3">
        <div className="relative w-6 shrink-0 text-right text-[12px] tabular-nums text-ink-muted" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(tick / max) * 100}%` }}>
              {tick}
            </span>
          ))}
        </div>
        <div className="relative h-44 flex-1">
          {ticks.map((tick) => (
            <span key={tick} className={cn('absolute inset-x-0 h-px', tick === 0 ? 'bg-line-strong' : 'bg-line')} style={{ bottom: `${(tick / max) * 100}%` }} aria-hidden />
          ))}
          <div
            role="group"
            aria-label={label}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
            className="relative flex h-full items-end rounded-[6px] outline-offset-4"
          >
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
              <div
                // En los extremos se ancla al borde del gráfico: centrada, la etiqueta sobresaldría.
                className={cn(
                  'pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-control bg-ink px-2.5 py-1.5 text-[12px] text-surface shadow-overlay',
                  active / points.length > 0.7 ? 'right-0' : active / points.length < 0.3 ? 'left-0' : '-translate-x-1/2',
                )}
                style={active / points.length >= 0.3 && active / points.length <= 0.7 ? { left: `${current.x}%` } : undefined}
              >
                <strong className="block font-semibold">{faultCountsText(current.reported, current.resolved)}</strong>
                <span className="opacity-80">
                  {current.long}
                  {current.current ? ' · en curso' : ''}
                </span>
              </div>
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
      <details className="mt-3 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer select-none items-center font-medium text-action sm:min-h-0">Ver datos</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">{label}</caption>
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
                  <th scope="row" className="py-1.5 pr-3 font-normal text-ink">
                    {point.long}
                    {point.current ? <span className="text-ink-muted"> · en curso</span> : null}
                  </th>
                  <td className="px-2 py-1.5 text-right tabular-nums text-ink">{point.reported}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums text-ink">{point.resolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
