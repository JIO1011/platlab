import type { FaultStats } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { useState, type KeyboardEvent } from 'react';
import { stepIndex } from '../../app/chart-scale';
import { endLabelSides, faultCountsText, faultPlot, monthReading } from './fault-series';

/**
 * Las dos series: Reportados en el acento, con trazo continuo y punto lleno; Solucionados en tinta neutra, con trazo
 * discontinuo y punto hueco. La forma, no solo el color, las distingue. Solucionados se dibuja al frente: donde las
 * líneas coinciden, el trazo discontinuo deja ver el continuo de debajo. Y el aro hueco (12 px) rodea al punto lleno
 * (6 px) en los meses en que coinciden.
 */
const series = {
  reported: { name: 'Reportados', y: 'reportedY', stroke: 'stroke-action', dash: undefined, dot: 'size-[6px] bg-action' },
  resolved: { name: 'Solucionados', y: 'resolvedY', stroke: 'stroke-ink-muted', dash: '5 4', dot: 'size-[12px] border-2 border-ink-muted bg-surface' },
} as const;
type Series = keyof typeof series;

const lineOrder: Series[] = ['reported', 'resolved'];
/** Los puntos al revés: el aro hueco abajo y el punto lleno encima, para que no lo tape. */
const dotOrder: Series[] = ['resolved', 'reported'];
const legendOrder = lineOrder;

const centered = '-translate-x-1/2 translate-y-1/2';

function Dot({ name, className, style }: { name: Series; className?: string; style?: { left: string; bottom: string } }) {
  return <span aria-hidden className={cn('pointer-events-none absolute rounded-full', series[name].dot, className)} style={style} />;
}

/** Trazo corto con su punto: la clave de la leyenda, la misma marca que el gráfico. */
function LegendKey({ name }: { name: Series }) {
  return (
    <span aria-hidden className="relative block h-3 w-6 shrink-0">
      <svg viewBox="0 0 24 12" className="absolute inset-0 size-full">
        <line x1={0} x2={24} y1={6} y2={6} strokeWidth={2} strokeDasharray={series[name].dash} className={series[name].stroke} />
      </svg>
      <Dot name={name} className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    </span>
  );
}

/**
 * «Incidentes en 12 meses» (Resumen de Equipos, ADR 0019): reportados y solucionados por mes en dos líneas con un
 * punto por mes. Es la excepción a «Serie única» (DESIGN.md): comparar las dos es el dato, así que lleva leyenda y el
 * nombre al final de cada línea. Puntero y teclado (flechas, Inicio, Fin) muestran el mes; la tabla lo deja leer sin
 * interactuar. Las líneas son SVG sin proporción fija; los puntos y rótulos son HTML posicionado por porcentaje, para
 * que no se deformen con el ancho.
 */
export function FaultChart({ months }: { months: FaultStats['months'] }) {
  const [active, setActive] = useState<number | null>(null);
  const { max, ticks, points } = faultPlot(months);
  const current = active === null ? null : (points[active] ?? null);
  const first = points[0];
  const last = points[points.length - 1];
  const sides = last ? endLabelSides(last) : null;
  const label = `Incidentes reportados y solucionados por mes${first && last ? `, de ${first.long} a ${last.long}` : ''}`;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = stepIndex(event.key, active, points.length);
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  }

  return (
    <figure className="@container m-0">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-muted">
        {legendOrder.map((name) => (
          <li key={name} className="flex items-center gap-2">
            <LegendKey name={name} />
            {series[name].name}
          </li>
        ))}
      </ul>
      {/* A la izquierda, el eje; con ancho de sobra, a la derecha, el espacio del nombre de cada línea. */}
      <div className="mt-6 pl-9 @lg:pr-28">
        <div className="relative h-44">
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-full mr-3 translate-y-1/2 text-right text-[12px] tabular-nums text-ink-muted" style={{ bottom: `${(tick * 100) / max}%` }} aria-hidden>
              {tick}
            </span>
          ))}
          {ticks.map((tick) => (
            <span
              key={tick}
              className={cn('absolute inset-x-0 h-px', tick === 0 ? 'bg-line-strong' : 'bg-line')}
              style={{ bottom: `${(tick * 100) / max}%` }}
              aria-hidden
            />
          ))}
          {current ? <span className="absolute inset-y-0 w-px -translate-x-1/2 bg-line-strong" style={{ left: `${current.x}%` }} aria-hidden /> : null}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            {lineOrder.map((name) => (
              <polyline
                key={name}
                points={points.map((point) => `${point.x},${100 - point[series[name].y]}`).join(' ')}
                fill="none"
                strokeWidth={2}
                strokeDasharray={series[name].dash}
                strokeLinecap={series[name].dash ? 'butt' : 'round'}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className={series[name].stroke}
              />
            ))}
          </svg>
          {dotOrder.map((name) =>
            points.map((point) => (
              <Dot key={`${name}-${point.month}`} name={name} className={centered} style={{ left: `${point.x}%`, bottom: `${point[series[name].y]}%` }} />
            )),
          )}
          {last && sides
            ? legendOrder.map((name) => (
                <span
                  key={name}
                  className="pointer-events-none absolute left-full ml-2 hidden translate-y-1/2 whitespace-nowrap text-[13px] font-medium text-ink @lg:block"
                  // Arriba o abajo del último punto, para que dos líneas que terminan juntas no se pisen los nombres.
                  style={{ bottom: `calc(${last[series[name].y]}% ${sides[name] === 'above' ? '+' : '-'} 10px)` }}
                >
                  {series[name].name}
                </span>
              ))
            : null}
          <div
            role="group"
            aria-label={label}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
            className="absolute inset-0 flex rounded-[6px] outline-offset-4"
          >
            {/* La columna entera del mes es la zona de puntero: más grande que cualquier punto. */}
            {points.map((point, index) => (
              <div key={point.month} className="h-full flex-1" onPointerEnter={() => setActive(index)} />
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
                <span className="opacity-80">{current.long}</span>
              </div>
            ) : null}
          </div>
        </div>
        {/* Eje X: los 12 meses con el año bajo el primero y bajo cada enero; en ancho justo, uno sí y uno no, siempre con el actual y los del año. */}
        <div className="relative mt-2 h-9 text-[12px] leading-4 text-ink-muted" aria-hidden>
          {points.map((point, index) => (
            <span
              key={point.month}
              className={cn(
                'absolute top-0 -translate-x-1/2 whitespace-nowrap text-center',
                (points.length - 1 - index) % 2 === 1 && !point.year && '@max-md:hidden',
              )}
              style={{ left: `${point.x}%` }}
            >
              {point.short}
              {point.year ? <span className="block text-[11px] text-ink-subtle">{point.year}</span> : null}
            </span>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {current ? monthReading(current) : ''}
      </p>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">{series.reported.name}</th>
            <th scope="col">{series.resolved.name}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{point.long}</th>
              <td>{point.reported}</td>
              <td>{point.resolved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
