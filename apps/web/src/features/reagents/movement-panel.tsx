import type { OperationFacets } from '@platlab/contracts';
import { Field, Input, OptionRow, Skeleton, cn, sectionLabel } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { FacetList, type FacetOption } from './facet-list';
import { fold } from './fold';
import type { MovementFilters, OperationQuery } from './movement-filters';
import { filterGroups, noName, selectedCount, tight, typeOrder, typePlural, type FilterGroupId } from './movement-text';
import { useDebouncedValue } from './use-media-query';
import { useOperationFacets } from './queries';

export interface FocusRequest {
  group: FilterGroupId;
  nonce: number;
}

const toggle = (list: readonly string[], key: string): string[] => (list.includes(key) ? list.filter((item) => item !== key) : [...list, key]);

/** Un grupo del panel: `fieldset` con su rótulo como `legend`, plegable, con cuántos hay marcados. */
function FilterGroup({
  id,
  title,
  marked,
  open,
  onToggle,
  children,
}: {
  id: FilterGroupId;
  title: string;
  marked: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const bodyId = useId();
  return (
    <fieldset className="min-w-0 border-t border-line py-1.5 first:border-t-0">
      <legend className="w-full p-0">
        <button
          type="button"
          data-group-toggle={id}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-control px-2 text-left transition-colors hover:bg-surface-sunken sm:min-h-8"
        >
          <span className={sectionLabel}>{title}</span>
          <span className="flex items-center gap-2">
            {!open && marked > 0 ? (
              <span className="rounded-full bg-action-soft px-2 text-xs font-semibold tabular-nums text-action">
                {marked}
                <span className="sr-only"> marcados</span>
              </span>
            ) : null}
            <ChevronDown aria-hidden className={cn('size-4 text-ink-muted transition-transform duration-150', open && 'rotate-180')} />
          </span>
        </button>
      </legend>
      <div id={bodyId} hidden={!open} className="pb-1.5 pt-0.5">
        {/* Montado solo abierto: al abrir el grupo, lo marcado sube arriba. */}
        {open ? children : null}
      </div>
    </fieldset>
  );
}

const periodPresets = [
  { id: 'all', label: 'Todo' },
  { id: '7', label: '7 días' },
  { id: '30', label: '30 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'previous-month', label: 'Mes anterior' },
] as const;

function PeriodGroup({ period, onChange }: { period: MovementFilters['period']; onChange: (period: MovementFilters['period']) => void }) {
  const name = useId();
  const [custom, setCustom] = useState(period.kind === 'range');
  const [draft, setDraft] = useState({ from: period.kind === 'range' ? (period.from ?? '') : '', to: period.kind === 'range' ? (period.to ?? '') : '' });
  const previous = useRef(period.kind);
  // Si otra cosa cambia el periodo (la ficha, un enlace), los campos de fechas lo siguen.
  useEffect(() => {
    if (period.kind === 'range') {
      setCustom(true);
      setDraft({ from: period.from ?? '', to: period.to ?? '' });
    } else if (previous.current === 'range') {
      setCustom(false);
      setDraft({ from: '', to: '' });
    }
    previous.current = period.kind;
  }, [period]);

  const reversed = draft.from !== '' && draft.to !== '' && draft.from > draft.to;
  const editRange = (next: { from: string; to: string }) => {
    setDraft(next);
    // Con el rango al revés no se aplica nada: el aviso queda en el campo hasta corregirlo.
    if (next.from !== '' && next.to !== '' && next.from > next.to) return;
    onChange(next.from === '' && next.to === '' ? { kind: 'all' } : { kind: 'range', from: next.from || null, to: next.to || null });
  };

  const current = custom || period.kind === 'range' ? 'range' : period.kind === 'days' ? String(period.days) : period.kind;
  const preset = (id: (typeof periodPresets)[number]['id']): MovementFilters['period'] =>
    id === 'all' ? { kind: 'all' } : id === 'month' ? { kind: 'month' } : id === 'previous-month' ? { kind: 'previous-month' } : { kind: 'days', days: Number(id) };
  // Un enlace puede traer otro número de días (hasta 90): se muestra marcado y se puede cambiar.
  const odd = period.kind === 'days' && period.days !== 7 && period.days !== 30 && !custom ? period.days : null;
  return (
    <div>
      {periodPresets.map((option) => (
        <OptionRow
          key={option.id}
          type="radio"
          name={name}
          checked={current === option.id}
          onChange={() => {
            setCustom(false);
            onChange(preset(option.id));
          }}
        >
          {option.label}
        </OptionRow>
      ))}
      {odd !== null ? (
        <OptionRow type="radio" name={name} checked onChange={() => undefined}>
          {odd} días
        </OptionRow>
      ) : null}
      <OptionRow type="radio" name={name} checked={current === 'range'} onChange={() => setCustom(true)}>
        Desde–hasta
      </OptionRow>
      {current === 'range' ? (
        <div className="grid grid-cols-2 gap-2 px-2 pb-1 pt-1.5">
          <Field label="Desde" error={reversed ? 'La fecha inicial es posterior a la final.' : undefined} className="col-span-2 min-[400px]:col-span-1">
            <Input type="date" value={draft.from} onChange={(event) => editRange({ ...draft, from: event.target.value })} className="h-[44px] sm:h-9" />
          </Field>
          <Field label="Hasta" className="col-span-2 min-[400px]:col-span-1">
            <Input type="date" value={draft.to} onChange={(event) => editRange({ ...draft, to: event.target.value })} className="h-[44px] sm:h-9" />
          </Field>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Panel de filtros de Movimientos (R-01C): siete grupos que se aplican al marcarlos, sin botón
 * «Aplicar». Es el mismo contenido en el panel de escritorio y en el cajón del móvil. Cada cambio
 * escribe la URL (`onChange`); los conteos llegan con las facetas de la API.
 */
export function MovementFilterPanel({
  workspaceId,
  filters,
  query,
  facets,
  openGroups,
  onToggleGroup,
  focusRequest,
  onFocusHandled,
  onChange,
}: {
  workspaceId: string;
  filters: MovementFilters;
  query: OperationQuery;
  facets: UseQueryResult<OperationFacets>;
  openGroups: ReadonlySet<FilterGroupId>;
  onToggleGroup: (group: FilterGroupId) => void;
  focusRequest: FocusRequest | null;
  onFocusHandled: () => void;
  onChange: (change: Partial<MovementFilters>) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [productSearch, setProductSearch] = useState('');
  const [responsibleSearch, setResponsibleSearch] = useState('');
  const typedProduct = useDebouncedValue(productSearch.trim(), 250);
  const data = facets.data;
  // Con más de 300 reactivos la lista local es parcial: la búsqueda se hace en el servidor (productQuery).
  const remoteSearch = typedProduct !== '' && (data?.products.more ?? false);
  const searched = useOperationFacets(workspaceId, query, typedProduct, remoteSearch);

  // Tocar una ficha lleva aquí: el grupo se abre y su cabecera recibe el foco, cuando el panel ya existe.
  useEffect(() => {
    if (!focusRequest) return;
    const frame = window.requestAnimationFrame(() => {
      root.current?.querySelector<HTMLElement>(`[data-group-toggle="${focusRequest.group}"]`)?.focus();
      onFocusHandled();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusRequest, onFocusHandled]);

  const asOption = (option: { id: string; name: string; code: string; count: number }): FacetOption => ({
    key: option.id,
    label: tight(option.name),
    detail: option.code,
    count: option.count,
  });
  const needle = fold(typedProduct);
  const shownProducts: FacetOption[] =
    remoteSearch && searched.data
      ? searched.data.products.options.map(asOption)
      : (data?.products.options ?? [])
          .filter((option) => needle === '' || filters.productIds.includes(option.id) || fold(`${option.name} ${option.code}`).includes(needle))
          .map(asOption);
  const responsibleOptions: FacetOption[] = (data?.responsibles ?? []).map((option) => ({
    key: option.principalId,
    label: option.displayName ?? noName,
    count: option.count,
  }));
  const typedResponsible = fold(responsibleSearch.trim());
  const shownResponsibles = responsibleOptions.filter(
    (option) => typedResponsible === '' || filters.responsibleIds.includes(option.key) || fold(option.label).includes(typedResponsible),
  );
  const typeCounts = new Map((data?.types ?? []).map((entry) => [entry.value, entry.count]));
  const typeOptions: FacetOption[] = typeOrder.map((type) => ({ key: type, label: typePlural[type], count: typeCounts.get(type) ?? 0 }));
  const loading = facets.isPending;

  const body = (group: FilterGroupId): ReactNode => {
    switch (group) {
      case 'period':
        return <PeriodGroup period={filters.period} onChange={(period) => onChange({ period })} />;
      case 'type':
        return loading ? (
          <GroupSkeleton rows={4} />
        ) : (
          <FacetList
            name="tipo"
            fixedOrder
            options={typeOptions}
            selected={filters.types}
            onToggle={(key) => onChange({ types: toggle(filters.types, key) as MovementFilters['types'] })}
          />
        );
      case 'product':
        return loading ? (
          <GroupSkeleton rows={5} />
        ) : (
          <FacetList
            name="reactivo"
            options={shownProducts}
            selected={filters.productIds}
            onToggle={(key) => onChange({ productIds: toggle(filters.productIds, key) })}
            search={{ value: productSearch, onChange: setProductSearch, label: 'Buscar reactivo' }}
            loading={remoteSearch && searched.isFetching && !searched.data}
          />
        );
      case 'responsible':
        return loading ? (
          <GroupSkeleton rows={4} />
        ) : (
          <FacetList
            name="responsable"
            options={shownResponsibles}
            selected={filters.responsibleIds}
            onToggle={(key) => onChange({ responsibleIds: toggle(filters.responsibleIds, key) })}
            search={{ value: responsibleSearch, onChange: setResponsibleSearch, label: 'Buscar responsable' }}
          />
        );
      case 'destination':
        return loading ? (
          <GroupSkeleton rows={3} />
        ) : (
          <FacetList
            name="destino"
            options={(data?.destinations ?? []).map((option) => ({ key: option.value, label: option.value, count: option.count }))}
            selected={filters.destinations}
            onToggle={(key) => onChange({ destinations: toggle(filters.destinations, key) })}
          />
        );
      case 'reason':
        return loading ? (
          <GroupSkeleton rows={3} />
        ) : (
          <FacetList
            name="motivo"
            options={(data?.reasons ?? []).map((option) => ({ key: option.value, label: option.value, count: option.count }))}
            selected={filters.reasons}
            onToggle={(key) => onChange({ reasons: toggle(filters.reasons, key) })}
          />
        );
      case 'location':
        return loading ? (
          <GroupSkeleton rows={3} />
        ) : (
          <FacetList
            name="ubicacion"
            options={(data?.locations ?? []).map((option) => ({ key: option.id, label: `${option.code} · ${option.name}`, count: option.count }))}
            selected={filters.locationIds}
            onToggle={(key) => onChange({ locationIds: toggle(filters.locationIds, key) })}
          />
        );
    }
  };

  return (
    <div ref={root}>
      {filterGroups.map((group) => (
        <FilterGroup
          key={group.id}
          id={group.id}
          title={group.title}
          marked={selectedCount(filters, group.id)}
          open={openGroups.has(group.id)}
          onToggle={() => onToggleGroup(group.id)}
        >
          {body(group.id)}
        </FilterGroup>
      ))}
    </div>
  );
}

function GroupSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-2 px-2 py-1.5" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );
}
