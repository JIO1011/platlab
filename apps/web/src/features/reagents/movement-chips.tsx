import type { OperationFacets } from '@platlab/contracts';
import { Button } from '@platlab/ui';
import { X } from 'lucide-react';
import type { MovementFilters } from './movement-filters';
import { activeGroups, chipText, filterGroups, type FilterGroupId } from './movement-text';

/**
 * Fichas de los filtros activos, sobre la lista (R-01C): una por grupo. Tocar la ficha abre ese grupo
 * en el panel (en el móvil, en el cajón); su × lo quita. «Limpiar» vuelve a Todo. El periodo por
 * omisión no lleva ficha. En el móvil se desplazan en horizontal.
 */
export function MovementChips({
  filters,
  facets,
  currentYear,
  onOpen,
  onRemove,
  onClear,
}: {
  filters: MovementFilters;
  facets: OperationFacets | undefined;
  currentYear: number;
  onOpen: (group: FilterGroupId) => void;
  onRemove: (group: FilterGroupId) => void;
  onClear: () => void;
}) {
  const groups = activeGroups(filters);
  if (groups.length === 0) return null;
  return (
    <ul aria-label="Filtros activos" className="-mx-4 mb-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 md:-mx-8 md:px-8 xl:mx-0 xl:flex-wrap xl:overflow-visible xl:px-0">
      {groups.map((group) => {
        const text = chipText(filters, group, facets, currentYear);
        const title = filterGroups.find((entry) => entry.id === group)?.title ?? '';
        return (
          <li key={group} className="inline-flex shrink-0 items-center rounded-full bg-action-soft text-sm font-medium text-action">
            <button
              type="button"
              onClick={() => onOpen(group)}
              className="inline-flex h-[44px] max-w-[16rem] items-center truncate rounded-l-full pl-3.5 pr-1.5 transition-colors hover:text-action-hover sm:h-8"
            >
              <span className="truncate">{text}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(group)}
              aria-label={`Quitar filtro de ${title.toLowerCase()}`}
              className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-r-full transition-colors hover:bg-action/10 sm:h-8 sm:w-7"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        );
      })}
      <li className="shrink-0">
        <Button variant="ghost" size="sm" className="h-[44px] sm:h-8" onClick={onClear}>
          Limpiar
        </Button>
      </li>
    </ul>
  );
}
