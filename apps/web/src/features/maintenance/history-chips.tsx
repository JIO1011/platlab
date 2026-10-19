import { Button } from '@platlab/ui';
import { X } from 'lucide-react';
import type { HistoryFilters } from './history-filters';
import type { ActiveFilter } from './history-text';

/**
 * Fichas de los filtros activos, sobre la lista: una por valor, con su × para quitarla, y «Limpiar» para volver a
 * todo el historial. Sin filtros no se dibuja nada.
 */
export function HistoryChips({
  filters,
  onRemove,
  onClear,
}: {
  filters: ActiveFilter[];
  onRemove: (change: Partial<HistoryFilters>) => void;
  onClear: () => void;
}) {
  if (filters.length === 0) return null;
  return (
    <ul aria-label="Filtros activos" className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <li key={filter.key} className="inline-flex max-w-full items-center rounded-full bg-action-soft text-sm font-medium text-action">
          <span className="min-w-0 truncate py-1 pl-3.5 pr-1" title={`${filter.group}: ${filter.label}`}>
            <span className="font-normal">{filter.group}:</span> {filter.label}
          </span>
          <button
            type="button"
            onClick={() => onRemove(filter.remove)}
            aria-label={`Quitar filtro ${filter.group.toLowerCase()}: ${filter.label}`}
            className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full transition-colors hover:bg-action/10 sm:h-8 sm:w-8"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </li>
      ))}
      <li>
        <Button variant="ghost" size="sm" className="h-[44px] sm:h-8" onClick={onClear}>
          Limpiar
        </Button>
      </li>
    </ul>
  );
}
