import type { MaterialClass, MaterialsDashboard } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { classLabels } from '../text';

/** Una pieza por clase: el insumo con el acento del módulo y el reutilizable en pizarra; el color sigue a la clase. */
const fills: Partial<Record<MaterialClass, string>> = { consumable: 'bg-action', reusable_counted: 'bg-ink-muted', reusable_identified: 'bg-ink' };

/**
 * El catálogo por clase (ADR 0025): una barra segmentada con la parte de cada clase impresa en su pieza y, debajo, una
 * leyenda con los nombres y cuántos materiales son. Son dos o tres partes, así que no hace falta una dona.
 */
export function ClassSplit({ parts }: { parts: MaterialsDashboard['byClass'] }) {
  const total = parts.reduce((sum, part) => sum + part.materials, 0);
  if (total === 0) return <p className="text-sm text-ink-muted">Aún no hay materiales registrados.</p>;
  const shown = parts.filter((part) => part.materials > 0);
  return (
    <div className="grid gap-3">
      <div role="img" aria-label={shown.map((part) => `${classLabels[part.class]}: ${part.materials} de ${total}`).join('; ')} className="flex h-7 gap-0.5">
        {shown.map((part) => {
          const share = Math.round((part.materials * 100) / total);
          return (
            <span key={part.class} className={cn('flex min-w-0 items-center rounded px-2 text-[12px] font-semibold text-on-action', fills[part.class])} style={{ flex: `${part.materials} 1 0%` }}>
              {share >= 15 ? `${share} %` : null}
            </span>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-muted" aria-label="Leyenda">
        {shown.map((part) => (
          <li key={part.class} className="inline-flex items-center gap-2">
            <span aria-hidden className={cn('size-3 rounded-[4px]', fills[part.class])} />
            {classLabels[part.class]}
            <b className="font-semibold tabular-nums text-ink">{part.materials}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
