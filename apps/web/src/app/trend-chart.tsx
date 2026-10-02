import type { HomeTrend } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { useState, type KeyboardEvent } from 'react';

type Point = HomeTrend['points'][number];

const total = (points: Point[]) => points.reduce((sum, point) => sum + point.value, 0);

/** «jue 1 oct»: los puntos son fechas civiles del espacio, sin hora ni zona que convertir. */
function formatDay(date: string, style: 'short' | 'long' = 'short'): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: 'UTC',
    weekday: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
  }).format(new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)));
}

/** Escala entera y limpia: 0, la mitad si es entera y el máximo (1, 2, 3, 4, 5, 10, 15…). */
function scale(points: Point[]): { max: number; ticks: number[] } {
  const peak = Math.max(1, ...points.map((point) => point.value));
  const max = peak <= 5 ? peak : Math.ceil(peak / 5) * 5;
  const ticks = max % 2 === 0 ? [0, max / 2, max] : [0, max];
  return { max, ticks };
}

const countLabel = (value: number, unit: { one: string; many: string }) => `${value} ${value === 1 ? unit.one : unit.many}`;

/**
 * Minigráfico de una tarjeta de Inicio (ADR 0011): sin interacción, porque toda la tarjeta es
 * un enlace. La cifra en texto que lo acompaña es la lectura accesible; el dibujo es decorativo.
 */
export function Sparkline({ points, className }: { points: Point[]; className?: string }) {
  const { max } = scale(points);
  return (
    <div className={cn('flex h-12 items-end gap-[2px] border-b border-line', className)} aria-hidden>
      {points.map((point) => (
        <span
          key={point.date}
          className="max-w-6 flex-1 rounded-t-[4px] bg-action"
          style={{ height: point.value === 0 ? 0 : `${Math.max(8, (point.value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Gráfico de barras del Resumen de un módulo (ADR 0011). Una sola serie: el título la nombra y
 * no hay leyenda. Puntero y teclado (flechas, Inicio, Fin) muestran el mismo dato; la tabla lo
 * deja disponible sin interactuar.
 */
export function TrendChart({
  title,
  points,
  unit,
}: {
  title: string;
  points: Point[];
  unit: { one: string; many: string };
}) {
  const [active, setActive] = useState<number | null>(null);
  const { max, ticks } = scale(points);
  const current = active === null ? null : points[active];
  const peak = points.reduce<Point | null>((best, point) => (best === null || point.value > best.value ? point : best), null);
  const summary = `${title}: ${countLabel(total(points), unit)} en total${
    peak && peak.value > 0 ? `; el día con más, ${formatDay(peak.date, 'long')}, con ${peak.value}` : ''
  }.`;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = points.length - 1;
    const next =
      event.key === 'ArrowRight' ? Math.min(last, (active ?? -1) + 1)
      : event.key === 'ArrowLeft' ? Math.max(0, (active ?? points.length) - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  }

  return (
    <figure className="m-0">
      <div className="flex gap-3">
        {/* Eje Y: pocas marcas enteras; las líneas guía son finas y quedan detrás de las barras. */}
        <div className="relative w-6 shrink-0 text-right text-[12px] tabular-nums text-ink-muted" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(tick / max) * 100}%` }}>
              {tick}
            </span>
          ))}
        </div>
        <div className="relative h-40 flex-1 lg:h-56">
          {ticks.map((tick) => (
            <span
              key={tick}
              className={cn('absolute inset-x-0 h-px', tick === 0 ? 'bg-line-strong' : 'bg-line')}
              style={{ bottom: `${(tick / max) * 100}%` }}
              aria-hidden
            />
          ))}
          <div
            role="group"
            aria-label={summary}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
            className="relative flex h-full items-end gap-[2px] rounded-[6px] outline-offset-4"
          >
            {points.map((point, index) => (
              // La columna entera es la zona de puntero: más grande que la barra.
              <div
                key={point.date}
                className="flex h-full flex-1 items-end justify-center"
                onPointerEnter={() => setActive(index)}
              >
                <span
                  className={cn(
                    'w-full max-w-6 rounded-t-[4px] bg-action transition-opacity duration-150',
                    active !== null && active !== index && 'opacity-45',
                  )}
                  style={{ height: point.value === 0 ? 0 : `${Math.max(3, (point.value / max) * 100)}%` }}
                />
              </div>
            ))}
            {current && active !== null ? (
              <div
                className="pointer-events-none absolute bottom-full z-10 mb-4 -translate-x-1/2 whitespace-nowrap rounded-control bg-ink px-2.5 py-1.5 text-[12px] text-surface shadow-overlay"
                style={{ left: `${((active + 0.5) / points.length) * 100}%` }}
              >
                <strong className="font-semibold">{countLabel(current.value, unit)}</strong>
                <span className="ml-1.5 opacity-80">{formatDay(current.date)}</span>
              </div>
            ) : null}
          </div>
          <p className="sr-only" aria-live="polite">
            {current ? `${formatDay(current.date, 'long')}: ${countLabel(current.value, unit)}` : ''}
          </p>
        </div>
      </div>
      {/* Eje X: primer día y hoy; con ancho suficiente (consulta de contenedor), también cada semana. */}
      <div className="@container mt-2 pl-9" aria-hidden>
        <div className="relative h-4 text-[12px] text-ink-muted">
          {points.map((point, index) =>
            index === 0 || index === points.length - 1 || (index >= 4 && (points.length - 1 - index) % 7 === 0) ? (
              <span
                key={point.date}
                className={cn(
                  'absolute top-0 whitespace-nowrap',
                  index === 0 ? 'left-0' : index === points.length - 1 ? 'right-0' : 'hidden -translate-x-1/2 @lg:block',
                )}
                style={index === 0 || index === points.length - 1 ? undefined : { left: `${((index + 0.5) / points.length) * 100}%` }}
              >
                {index === points.length - 1 ? 'Hoy' : formatDay(point.date)}
              </span>
            ) : null,
          )}
        </div>
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer select-none font-medium text-action">Ver los datos en tabla</summary>
        <table className="mt-3 w-full text-left text-[13px]">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b border-line text-ink-muted">
              <th scope="col" className="py-1.5 font-medium">Fecha</th>
              <th scope="col" className="py-1.5 text-right font-medium">{unit.many[0]?.toUpperCase() + unit.many.slice(1)}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date} className="border-b border-line last:border-0">
                <td className="py-1.5 text-ink">{formatDay(point.date, 'long')}</td>
                <td className="py-1.5 text-right tabular-nums text-ink">{point.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
