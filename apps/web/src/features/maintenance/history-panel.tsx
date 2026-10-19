import type { MaintenanceAreaList, ProviderList, WorkKind, WorkResult } from '@platlab/contracts';
import { OptionRow, cn, sectionLabel } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import { DateField, FilterGroup, OptionsError, OptionsSkeleton, type ChosenOption } from '../../app/filter-group';
import { INTERNAL, type HistoryFilters } from './history-filters';
import { kindLabels, resultLabels } from './work-text';

export type HistoryGroupId = 'kind' | 'result' | 'area' | 'provider';

const toggle = <T,>(values: readonly T[], value: T): T[] =>
  values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];

const kindOptions = (Object.keys(kindLabels) as WorkKind[]).map((value) => ({ value, label: kindLabels[value] }));
const resultOptions = (Object.keys(resultLabels) as WorkResult[]).map((value) => ({ value, label: resultLabels[value] }));




/**
 * Periodo: desde y hasta, por la fecha del trabajo y con los dos extremos incluidos; puede faltar uno. Sin atajos
 * («últimos 30 días» cambia con el día y un informe debe poder repetirse). Con el rango al revés no se aplica nada:
 * el aviso queda en el campo hasta corregirlo.
 */
function PeriodSection({ from, to, onChange }: { from: string | null; to: string | null; onChange: (change: { from: string | null; to: string | null }) => void }) {
  const errorId = useId();
  const [draft, setDraft] = useState({ from: from ?? '', to: to ?? '' });
  // Si otra cosa cambia el periodo (limpiar, quitar la ficha, atrás del navegador), los campos lo siguen.
  useEffect(() => setDraft({ from: from ?? '', to: to ?? '' }), [from, to]);
  const reversed = draft.from !== '' && draft.to !== '' && draft.from > draft.to;
  const edit = (next: { from: string; to: string }) => {
    setDraft(next);
    if (next.from !== '' && next.to !== '' && next.from > next.to) return;
    onChange({ from: next.from || null, to: next.to || null });
  };
  return (
    <fieldset className="min-w-0 px-2 pb-2.5 pt-1">
      <legend className={cn(sectionLabel, 'flex min-h-8 items-center px-0')}>Periodo</legend>
      <div className="grid gap-1.5 pt-0.5">
        <DateField label="Desde" value={draft.from} onChange={(value) => edit({ ...draft, from: value })} errorId={reversed ? errorId : undefined} />
        <DateField label="Hasta" value={draft.to} onChange={(value) => edit({ ...draft, to: value })} />
        {reversed ? (
          <p id={errorId} role="alert" className="text-[13px] font-medium text-danger">
            La fecha inicial es posterior a la final.
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}

/** Un grupo plegable de casillas; `state` dice si las opciones ya llegaron. */
function OptionGroup({
  id,
  title,
  name,
  options,
  selected,
  open,
  onToggle,
  onChange,
  state = 'ready',
  what = '',
  empty = '',
  onRetry,
}: {
  id: HistoryGroupId;
  title: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: readonly string[];
  open: boolean;
  onToggle: () => void;
  onChange: (next: string[]) => void;
  state?: 'loading' | 'error' | 'ready';
  /** «las áreas»: lo que no se pudo cargar. */
  what?: string;
  /** Lo que se dice si no hay opciones. */
  empty?: string;
  onRetry?: () => void;
}) {
  const chosen: ChosenOption[] = selected.map((key) => ({ key, label: options.find((option) => option.value === key)?.label ?? key }));
  return (
    <FilterGroup id={id} title={title} marked={selected.length} chosen={chosen} open={open} onToggle={onToggle} onRemove={(key) => onChange(selected.filter((value) => value !== key))}>
      {state === 'loading' ? (
        <OptionsSkeleton rows={4} />
      ) : state === 'error' ? (
        <OptionsError what={what} onRetry={() => onRetry?.()} />
      ) : options.length === 0 ? (
        <p className="px-2 py-1.5 text-[13px] text-ink-subtle">{empty}</p>
      ) : (
        options.map((option) => (
          <OptionRow key={option.value} name={name} checked={selected.includes(option.value)} onChange={() => onChange(toggle(selected, option.value))}>
            {option.label}
          </OptionRow>
        ))
      )}
    </FilterGroup>
  );
}

const queryState = (query: UseQueryResult<unknown>) => (query.isPending ? 'loading' : query.isError ? 'error' : 'ready');

/**
 * Panel de filtros del Historial (M-01d), con el lenguaje del de Movimientos y el Informe de equipos: el periodo
 * a la vista y cuatro grupos plegables de uno en uno, que se aplican al marcarlos y escriben la URL. Es el mismo
 * contenido en el panel de escritorio y en el cajón del móvil.
 */
export function HistoryFilterPanel({
  filters,
  areas,
  providers,
  openGroup,
  onToggleGroup,
  onChange,
}: {
  filters: HistoryFilters;
  areas: UseQueryResult<MaintenanceAreaList>;
  providers: UseQueryResult<ProviderList>;
  /** El grupo plegable abierto: solo uno a la vez. */
  openGroup: HistoryGroupId | null;
  onToggleGroup: (group: HistoryGroupId) => void;
  onChange: (change: Partial<HistoryFilters>) => void;
}) {
  const areaOptions = (areas.data?.items ?? []).map((area) => ({ value: area.id, label: area.name }));
  // «Interno» primero: es el trabajo sin proveedor.
  const providerOptions = [{ value: INTERNAL, label: 'Interno' }, ...(providers.data?.items ?? []).map((provider) => ({ value: provider.id, label: provider.name }))];
  return (
    <div>
      <PeriodSection from={filters.from} to={filters.to} onChange={onChange} />
      <OptionGroup
        id="kind"
        title="Tipo de trabajo"
        name="tipo"
        options={kindOptions}
        selected={filters.kinds}
        open={openGroup === 'kind'}
        onToggle={() => onToggleGroup('kind')}
        onChange={(kinds) => onChange({ kinds: kinds as WorkKind[] })}
      />
      <OptionGroup
        id="result"
        title="Resultado"
        name="resultado"
        options={resultOptions}
        selected={filters.results}
        open={openGroup === 'result'}
        onToggle={() => onToggleGroup('result')}
        onChange={(results) => onChange({ results: results as WorkResult[] })}
      />
      <OptionGroup
        id="area"
        title="Área"
        name="area"
        options={areaOptions}
        selected={filters.areas}
        open={openGroup === 'area'}
        onToggle={() => onToggleGroup('area')}
        onChange={(next) => onChange({ areas: next })}
        state={queryState(areas)}
        what="las áreas"
        empty="Aún no hay equipos con área."
        onRetry={() => void areas.refetch()}
      />
      <OptionGroup
        id="provider"
        title="Quién lo hizo"
        name="proveedor"
        options={providerOptions}
        selected={filters.providers}
        open={openGroup === 'provider'}
        onToggle={() => onToggleGroup('provider')}
        onChange={(next) => onChange({ providers: next })}
        // «Interno» está siempre: solo los proveedores esperan.
        state={providers.isError ? 'error' : 'ready'}
        what="los proveedores"
        onRetry={() => void providers.refetch()}
      />
    </div>
  );
}
