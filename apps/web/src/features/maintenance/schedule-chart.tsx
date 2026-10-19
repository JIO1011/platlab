import type { MaintenanceIndicators } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { useState, type KeyboardEvent } from 'react';
import { niceScale, stepIndex } from '../../app/chart-scale';
import { scheduleText, schedulePoints, scheduleTotals } from './indicator-text';

/**
 * «Programado frente a realizado» (Indicadores, M-01c): una barra por mes cuya altura es lo programado y cuya parte
 * llena, en el acento, es lo hecho. Es una sola serie: el título y la frase de abajo la nombran, sin leyenda. El mes
 * actual se rotula «en curso». Puntero y teclado (flechas, Inicio, Fin) muestran el mes; la lectura en texto y la tabla
 * lo dejan leer sin interactuar.
 */
export function ScheduleChart({ months }: { months: MaintenanceIndicators['months'] }) {
  const [active, setActive] = useState<number | null>(null);
  const points = schedulePoints(months);
  const totals = scheduleTotals(months);
  const { max, ticks } = niceScale(Math.max(...months.map((entry) => entry.due)));
  const current = active === null ? null : (points[active] ?? null);
  const label = 'Trabajos programados y hechos por mes';

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = stepIndex(event.key, active, points.length);
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  }

  return (
    <figure className="@container m-0">
      <figcaption className="text-[13px] text-ink-muted">Cada barra es lo programado en el mes; la parte llena, lo que ya se hizo.</figcaption>
      <div className="mt-5 flex gap-3">
        <div className="relative w-6 shrink-0 text-right text-[12px] tabular-nums text-ink-muted" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(tick / max) * 100}%` }}>
              {tick}
            </span>
          ))}
        </div>
        <div className="relative h-40 flex-1 lg:h-52">
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
            className="relative flex h-full items-end gap-1 rounded-[6px] outline-offset-4"
          >
            {points.map((point, index) => (
              // La columna entera es la zona de puntero: más grande que la barra.
              <div key={point.month} className="flex h-full flex-1 items-end justify-center" onPointerEnter={() => setActive(index)}>
                <span
                  className={cn(
                    'relative w-full max-w-5 overflow-hidden rounded-t-[4px] border border-ink-subtle bg-line-strong transition-opacity duration-150',
                    active !== null && active !== index && 'opacity-45',
                  )}
                  style={{ height: point.due === 0 ? 0 : `${Math.max(3, (point.due / max) * 100)}%` }}
                >
                  <span className="absolute inset-x-0 bottom-0 bg-action" style={{ height: `${(point.done / point.due) * 100}%` }} />
                </span>
              </div>
            ))}
            {current && active !== null ? (
              <div
                // En los extremos se ancla al borde del gráfico: centrada, la etiqueta sobresaldría.
                className={cn(
                  'pointer-events-none absolute bottom-full z-10 mb-4 whitespace-nowrap rounded-control bg-ink px-2.5 py-1.5 text-[12px] text-surface shadow-overlay',
                  active / points.length > 0.7 ? 'right-0' : active / points.length < 0.3 ? 'left-0' : '-translate-x-1/2',
                )}
                style={active / points.length >= 0.3 && active / points.length <= 0.7 ? { left: `${current.x}%` } : undefined}
              >
                <strong className="block font-semibold">{scheduleText(current)}</strong>
                <span className="opacity-80">
                  {current.long}
                  {current.current ? ' · en curso' : ''}
                </span>
              </div>
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
      <details className="mt-3 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer select-none items-center font-medium text-action sm:min-h-0">Ver datos</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">{label}</caption>
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
                  <th scope="row" className="py-1.5 pr-3 font-normal text-ink">
                    {point.long}
                    {point.current ? <span className="text-ink-muted"> · en curso</span> : null}
                  </th>
                  <td className="px-2 py-1.5 text-right tabular-nums text-ink">{point.due}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-ink">{point.done}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums text-ink">{point.onTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
