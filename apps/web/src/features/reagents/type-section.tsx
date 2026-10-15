import { cn, sectionLabel } from '@platlab/ui';
import { Pill } from './filter-pill';
import type { MovementFilters } from './movement-filters';
import { typeOrder, typePlural } from './movement-text';

/** Tipo: cuatro pastillas con su número, en 2×2 y en orden fijo (no deben cambiar de sitio al marcarlas). */
export function TypeSection({
  selected,
  counts,
  onToggle,
}: {
  selected: readonly string[];
  counts: ReadonlyMap<string, number> | null;
  onToggle: (type: MovementFilters['types'][number]) => void;
}) {
  const first = typeOrder.find((type) => selected.includes(type)) ?? typeOrder[0];
  return (
    <fieldset className="min-w-0 border-t border-line px-2 pb-2.5 pt-1">
      <legend className={cn(sectionLabel, 'flex min-h-8 items-center px-0')}>Tipo</legend>
      <div className="grid grid-cols-2 gap-1">
        {typeOrder.map((type) => (
          <Pill
            key={type}
            type="checkbox"
            name="tipo"
            checked={selected.includes(type)}
            count={counts ? (counts.get(type) ?? 0) : undefined}
            toggleGroup={type === first ? 'type' : undefined}
            onChange={() => onToggle(type)}
          >
            {typePlural[type]}
          </Pill>
        ))}
      </div>
    </fieldset>
  );
}
