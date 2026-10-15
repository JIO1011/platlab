import type { OperationFacets } from '@platlab/contracts';
import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { FacetGroups } from './facet-groups';
import { toggle, type MovementFilters, type OperationQuery } from './movement-filters';
import type { FilterGroupId } from './movement-text';
import { PeriodSection } from './period-section';
import { TypeSection } from './type-section';

export interface FocusRequest {
  group: FilterGroupId;
  nonce: number;
}

/**
 * Panel de filtros de Movimientos (R-01C, ADR 0014): Período y Tipo en pastillas y cinco grupos plegables,
 * de uno en uno, que se aplican al marcarlos, sin botón «Aplicar». El panel no se desplaza. Es el mismo
 * contenido en el panel de escritorio y en el cajón del móvil. Cada cambio escribe la URL (`onChange`);
 * los conteos llegan con las facetas de la API.
 */
export function MovementFilterPanel({
  workspaceId,
  filters,
  query,
  facets,
  openGroup,
  onToggleGroup,
  focusRequest,
  onFocusHandled,
  onChange,
}: {
  workspaceId: string;
  filters: MovementFilters;
  query: OperationQuery;
  facets: UseQueryResult<OperationFacets>;
  /** El grupo plegable abierto: solo uno a la vez. */
  openGroup: FilterGroupId | null;
  onToggleGroup: (group: FilterGroupId) => void;
  focusRequest: FocusRequest | null;
  onFocusHandled: () => void;
  onChange: (change: Partial<MovementFilters>) => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  // Tocar una ficha lleva aquí: el grupo se abre y su cabecera recibe el foco, cuando el panel ya existe.
  useEffect(() => {
    if (!focusRequest) return;
    const frame = window.requestAnimationFrame(() => {
      root.current?.querySelector<HTMLElement>(`[data-group-toggle="${focusRequest.group}"]`)?.focus();
      onFocusHandled();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusRequest, onFocusHandled]);

  const typeCounts = facets.data ? new Map(facets.data.types.map((entry) => [entry.value, entry.count])) : null;

  return (
    <div ref={root}>
      <PeriodSection period={filters.period} onChange={(period) => onChange({ period })} />
      <TypeSection selected={filters.types} counts={typeCounts} onToggle={(type) => onChange({ types: toggle(filters.types, type) })} />
      <FacetGroups
        workspaceId={workspaceId}
        filters={filters}
        query={query}
        facets={facets}
        openGroup={openGroup}
        onToggleGroup={onToggleGroup}
        onChange={onChange}
      />
    </div>
  );
}
