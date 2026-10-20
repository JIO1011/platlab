import { cn } from '@platlab/ui';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { stepIndex } from './chart-scale';

/**
 * Las piezas que comparten los gráficos de barras (Reactivos, Equipos, Mantenimiento). Cómo se dibuja cada barra y
 * su texto se quedan en cada gráfico: aquí solo lo que debe ser igual en todos, incluido el teclado.
 */

/**
 * La posición activa de un gráfico de `count` columnas. `groupProps` va en el grupo enfocable: flechas, Inicio y Fin
 * mueven la posición; salir con el foco o el puntero la limpia. `setActive` es para `onPointerEnter` de cada columna.
 */
export function useChartCursor(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const groupProps = {
    tabIndex: 0,
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      const next = stepIndex(event.key, active, count);
      if (next === null) return;
      event.preventDefault();
      setActive(next);
    },
    onBlur: () => setActive(null),
    onPointerLeave: () => setActive(null),
  };
  return { active, setActive, groupProps };
}

/** Leyenda con muestras de color: cada serie lleva su nombre en texto, el color nunca va solo. */
export function ChartLegend({ items }: { items: readonly { name: string; fill: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-muted" aria-label="Leyenda">
      {items.map((item) => (
        <li key={item.name} className="inline-flex items-center gap-2">
          <span aria-hidden className={cn('size-3 rounded-[4px]', item.fill)} />
          {item.name}
        </li>
      ))}
    </ul>
  );
}

/** Eje Y: pocas marcas enteras a la izquierda, cada una centrada sobre su línea de cuadrícula. */
export function ChartYAxis({ ticks, max }: { ticks: number[]; max: number }) {
  return (
    <div className="relative w-6 shrink-0 text-right text-[12px] tabular-nums text-ink-muted" aria-hidden>
      {ticks.map((tick) => (
        <span key={tick} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(tick / max) * 100}%` }}>
          {tick}
        </span>
      ))}
    </div>
  );
}

/** Líneas de cuadrícula finas detrás de las barras; la base (cero) es la más marcada. Va dentro del área relativa del gráfico. */
export function ChartGrid({ ticks, max }: { ticks: number[]; max: number }) {
  return (
    <>
      {ticks.map((tick) => (
        <span key={tick} className={cn('absolute inset-x-0 h-px', tick === 0 ? 'bg-line-strong' : 'bg-line')} style={{ bottom: `${(tick / max) * 100}%` }} aria-hidden />
      ))}
    </>
  );
}

/**
 * Etiqueta de la columna activa, sobre el gráfico. `x` es el centro de la columna en %; en los extremos se ancla al
 * borde: centrada, la etiqueta sobresaldría. `className` fija la separación vertical.
 */
export function ChartTooltip({ index, count, x, className, children }: { index: number; count: number; x: number; className: string; children: ReactNode }) {
  const ratio = index / count;
  const centered = ratio >= 0.3 && ratio <= 0.7;
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-full z-10 whitespace-nowrap rounded-control bg-ink px-2.5 py-1.5 text-[12px] text-surface shadow-overlay',
        ratio > 0.7 ? 'right-0' : ratio < 0.3 ? 'left-0' : '-translate-x-1/2',
        className,
      )}
      style={centered ? { left: `${x}%` } : undefined}
    >
      {children}
    </div>
  );
}

/** «Ver datos» de los gráficos por mes: la tabla se abre bajo el gráfico; `children` son su `thead` y su `tbody`. */
export function ChartDataTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer select-none items-center font-medium text-action sm:min-h-0">Ver datos</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <caption className="sr-only">{label}</caption>
          {children}
        </table>
      </div>
    </details>
  );
}

/** Encabezado de fila de esas tablas: el mes y, si es el actual, «en curso». */
export function MonthRowHeader({ long, current }: { long: string; current: boolean }) {
  return (
    <th scope="row" className="py-1.5 pr-3 font-normal text-ink">
      {long}
      {current ? <span className="text-ink-muted"> · en curso</span> : null}
    </th>
  );
}
