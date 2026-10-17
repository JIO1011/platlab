import { Button } from '@platlab/ui';
import { X } from 'lucide-react';

export interface ActiveFilter {
  key: string;
  /** El grupo al que pertenece («Estado»): va delante y en el nombre del botón que la quita. */
  group: string;
  label: string;
  onRemove: () => void;
}

/**
 * Fichas de los filtros activos, sobre la lista: una por valor, con su × para quitarla, y «Quitar
 * filtros» para volver a todo el inventario. Sin filtros no se dibuja nada.
 */
export function AssetChips({ filters, onClear }: { filters: ActiveFilter[]; onClear: () => void }) {
  if (filters.length === 0) return null;
  return (
    <ul aria-label="Filtros activos" className="mb-4 flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <li key={filter.key} className="inline-flex max-w-full items-center rounded-full bg-action-soft text-sm font-medium text-action">
          <span className="min-w-0 truncate py-1 pl-3.5 pr-1" title={`${filter.group}: ${filter.label}`}>
            <span className="font-normal">{filter.group}:</span> {filter.label}
          </span>
          <button
            type="button"
            onClick={filter.onRemove}
            aria-label={`Quitar filtro ${filter.group.toLowerCase()}: ${filter.label}`}
            className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full transition-colors hover:bg-action/10 sm:h-8 sm:w-8"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </li>
      ))}
      <li>
        <Button variant="ghost" size="sm" className="h-[44px] sm:h-8" onClick={onClear}>
          Quitar filtros
        </Button>
      </li>
    </ul>
  );
}
