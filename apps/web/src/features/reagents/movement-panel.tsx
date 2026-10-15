import type { OperationFacets } from '@platlab/contracts';
import { Input, Skeleton, cn, sectionLabel } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { FacetList, type FacetOption } from './facet-list';
import { fold } from './fold';
import type { MovementFilters, OperationQuery } from './movement-filters';
import {
  chosenText,
  countFormat,
  filterGroups,
  foldingGroups,
  noName,
  selectedCount,
  tight,
  typeOrder,
  typePlural,
  type FilterGroupId,
} from './movement-text';
import { useDebouncedValue } from './use-media-query';
import { useOperationFacets } from './queries';

export interface FocusRequest {
  group: FilterGroupId;
  nonce: number;
}

const toggle = (list: readonly string[], key: string): string[] => (list.includes(key) ? list.filter((item) => item !== key) : [...list, key]);

/** Pastilla de una opción (Período y Tipo): casilla o radio nativos dentro; la elegida se rellena con el acento (no solo cambia de matiz). */
function Pill({
  type,
  name,
  checked,
  onChange,
  count,
  toggleGroup,
  children,
}: {
  type: 'checkbox' | 'radio';
  name: string;
  checked: boolean;
  onChange: () => void;
  /** Cuántos movimientos tiene; sin dato mientras llegan los conteos. */
  count?: number | undefined;
  /** Marca la pastilla a la que lleva el foco una ficha de este grupo. */
  toggleGroup?: FilterGroupId | undefined;
  children: ReactNode;
}) {
  return (
    <label className="group relative inline-flex min-h-[44px] min-w-0 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-sunken has-[:checked]:border-action has-[:checked]:bg-action has-[:checked]:font-semibold has-[:checked]:text-on-action has-[:checked]:hover:bg-action-hover has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action sm:min-h-8">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        data-group-toggle={toggleGroup}
        className="absolute inset-0 m-0 size-full cursor-pointer opacity-0"
      />
      <span className="min-w-0 truncate">{children}</span>
      {count === undefined ? null : (
        <span className="ml-auto shrink-0 pl-1 tabular-nums text-ink-muted group-has-[:checked]:text-on-action">
          {countFormat.format(count)}
          <span className="sr-only"> movimientos</span>
        </span>
      )}
    </label>
  );
}

/** Un grupo plegable: `fieldset` con su rótulo como `legend`, fila con cuántos hay elegidos. Solo uno abierto a la vez. */
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
    <fieldset className="min-w-0 border-t border-line py-1">
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
          <span className="flex min-w-0 items-center gap-2">
            {marked > 0 ? <span className="whitespace-nowrap rounded-full bg-action-soft px-2 text-xs font-semibold tabular-nums text-action">{chosenText(marked)}</span> : null}
            <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-ink-muted transition-transform duration-150', open && 'rotate-180')} />
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
] as const;

/** Período: pastillas y, tras «Elegir fechas», desde–hasta. */
function PeriodSection({ period, onChange }: { period: MovementFilters['period']; onChange: (period: MovementFilters['period']) => void }) {
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

  const current = period.kind === 'range' ? 'range' : period.kind === 'days' ? String(period.days) : period.kind;
  const preset = (id: (typeof periodPresets)[number]['id']): MovementFilters['period'] =>
    id === 'all' ? { kind: 'all' } : id === 'month' ? { kind: 'month' } : { kind: 'days', days: Number(id) };
  // Un enlace puede traer otro número de días (hasta 90) o «mes anterior»: se muestra marcado y se puede cambiar.
  const odd = period.kind === 'days' && period.days !== 7 && period.days !== 30 ? `${period.days} días` : period.kind === 'previous-month' ? 'Mes anterior' : null;
  const fromId = useId();
  const toId = useId();
  const errorId = useId();
  const firstFocus = current === 'range' ? null : (periodPresets.find((option) => option.id === current)?.id ?? periodPresets[0].id);
  return (
    <fieldset className="min-w-0 px-2 pb-2.5 pt-1">
      <legend className={cn(sectionLabel, 'flex min-h-8 items-center px-0')}>Periodo</legend>
      <div className="flex flex-wrap gap-1">
        {periodPresets.map((option) => (
          <Pill
            key={option.id}
            type="radio"
            name={name}
            checked={current === option.id}
            toggleGroup={firstFocus === option.id ? 'period' : undefined}
            onChange={() => {
              setCustom(false);
              onChange(preset(option.id));
            }}
          >
            {option.label}
          </Pill>
        ))}
        {odd !== null ? (
          <Pill type="radio" name={name} checked onChange={() => undefined}>
            {odd}
          </Pill>
        ) : null}
      </div>
      <button
        type="button"
        data-group-toggle={current === 'range' ? 'period' : undefined}
        aria-expanded={custom}
        onClick={() => setCustom(!custom)}
        className="mt-1 inline-flex min-h-[44px] items-center gap-1 rounded-control text-[13px] font-medium text-action transition-colors hover:text-action-hover sm:min-h-8"
      >
        Elegir fechas
        <ChevronDown aria-hidden className={cn('size-3.5 transition-transform duration-150', custom && 'rotate-180')} />
      </button>
      {custom ? (
        <div className="grid gap-1.5 pt-0.5">
          {(
            [
              ['Desde', fromId, draft.from, (value: string) => editRange({ ...draft, from: value })],
              ['Hasta', toId, draft.to, (value: string) => editRange({ ...draft, to: value })],
            ] as const
          ).map(([label, id, value, edit]) => (
            <div key={label} className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-2">
              <label htmlFor={id} className="text-[13px] text-ink-muted">
                {label}
              </label>
              <Input
                id={id}
                type="date"
                value={value}
                aria-invalid={label === 'Desde' && reversed ? true : undefined}
                aria-describedby={label === 'Desde' && reversed ? errorId : undefined}
                onChange={(event) => edit(event.target.value)}
                className="h-[44px] min-w-0 px-2 text-[13px] sm:h-9"
              />
            </div>
          ))}
          {reversed ? (
            <p id={errorId} role="alert" className="text-[13px] font-medium text-danger">
              La fecha inicial es posterior a la final.
            </p>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}

/** Tipo: cuatro pastillas con su número, en 2×2 y en orden fijo (no deben cambiar de sitio al marcarlas). */
function TypeSection({
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
  const [productSearch, setProductSearch] = useState('');
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

  // Solo el nombre: el código no ayuda a elegir, aunque la búsqueda lo siga entendiendo.
  const asOption = (option: { id: string; name: string; code: string; count: number }): FacetOption => ({
    key: option.id,
    label: tight(option.name),
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
  const typeCounts = data ? new Map(data.types.map((entry) => [entry.value, entry.count])) : null;
  const loading = facets.isPending;

  const body = (group: (typeof foldingGroups)[number]): ReactNode => {
    switch (group) {
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
            options={responsibleOptions}
            selected={filters.responsibleIds}
            onToggle={(key) => onChange({ responsibleIds: toggle(filters.responsibleIds, key) })}
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
      <PeriodSection period={filters.period} onChange={(period) => onChange({ period })} />
      <TypeSection
        selected={filters.types}
        counts={typeCounts}
        onToggle={(type) => onChange({ types: toggle(filters.types, type) as MovementFilters['types'] })}
      />
      {foldingGroups.map((id) => (
        <FilterGroup
          key={id}
          id={id}
          title={filterGroups.find((group) => group.id === id)?.title ?? ''}
          marked={selectedCount(filters, id)}
          open={openGroup === id}
          onToggle={() => onToggleGroup(id)}
        >
          {body(id)}
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
