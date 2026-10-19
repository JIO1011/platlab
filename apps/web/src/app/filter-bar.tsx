import { Button, OptionRow, Popover, PopoverContent, PopoverTrigger, cn } from '@platlab/ui';
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { rangeText, triggerText } from './filter-bar-text';
import { DateField, OptionsError, OptionsSkeleton } from './filter-group';

/** Un filtro de varias opciones: casillas en un menú. */
interface OptionsFilter {
  kind: 'options';
  id: string;
  /** Su nombre, el que dice el botón («Tipo»). */
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: readonly string[];
  onChange: (next: string[]) => void;
  /** Si las opciones ya llegaron. */
  state?: 'loading' | 'error' | 'ready';
  /** «las áreas»: lo que no se pudo cargar. */
  what?: string;
  /** Lo que se dice si no hay opciones. */
  empty?: string;
  onRetry?: () => void;
}

/** Un periodo: desde y hasta, con los dos extremos incluidos; puede faltar uno. */
interface PeriodFilter {
  kind: 'period';
  id: string;
  label: string;
  from: string | null;
  to: string | null;
  onChange: (change: { from: string | null; to: string | null }) => void;
}

export type BarFilter = OptionsFilter | PeriodFilter;

const toggle = (values: readonly string[], value: string): string[] => (values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]);

const isActive = (filter: BarFilter): boolean => (filter.kind === 'options' ? filter.selected.length > 0 : filter.from !== null || filter.to !== null);

/** Las casillas de un filtro de opciones, con su estado de carga, error o vacío. */
function OptionsBody({ filter }: { filter: OptionsFilter }) {
  const { state = 'ready', options, selected } = filter;
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{filter.label}</legend>
      <div className="max-h-72 overflow-y-auto">
        {state === 'loading' ? (
          <OptionsSkeleton rows={4} />
        ) : state === 'error' ? (
          <OptionsError what={filter.what ?? 'las opciones'} onRetry={() => filter.onRetry?.()} />
        ) : options.length === 0 ? (
          <p className="px-2 py-1.5 text-[13px] text-ink-subtle">{filter.empty ?? 'No hay opciones.'}</p>
        ) : (
          options.map((option) => (
            <OptionRow key={option.value} name={filter.id} checked={selected.includes(option.value)} onChange={() => filter.onChange(toggle(selected, option.value))}>
              {option.label}
            </OptionRow>
          ))
        )}
      </div>
    </fieldset>
  );
}

/**
 * Periodo: desde y hasta, por la fecha del trabajo y con los dos extremos incluidos; puede faltar uno. Sin atajos
 * («últimos 30 días» cambia con el día y un informe debe poder repetirse). Con el rango al revés no se aplica nada:
 * el aviso queda en el campo hasta corregirlo.
 */
function PeriodBody({ filter }: { filter: PeriodFilter }) {
  const errorId = useId();
  const { from, to, onChange } = filter;
  const [draft, setDraft] = useState({ from: from ?? '', to: to ?? '' });
  // Si otra cosa cambia el periodo (limpiar, atrás del navegador), los campos lo siguen.
  useEffect(() => setDraft({ from: from ?? '', to: to ?? '' }), [from, to]);
  const reversed = draft.from !== '' && draft.to !== '' && draft.from > draft.to;
  const edit = (next: { from: string; to: string }) => {
    setDraft(next);
    if (next.from !== '' && next.to !== '' && next.from > next.to) return;
    onChange({ from: next.from || null, to: next.to || null });
  };
  return (
    <fieldset className="grid min-w-0 gap-1.5 p-1.5">
      <legend className="sr-only">{filter.label}</legend>
      <DateField label="Desde" value={draft.from} onChange={(value) => edit({ ...draft, from: value })} errorId={reversed ? errorId : undefined} />
      <DateField label="Hasta" value={draft.to} onChange={(value) => edit({ ...draft, to: value })} />
      {reversed ? (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-danger">
          La fecha inicial es posterior a la final.
        </p>
      ) : null}
    </fieldset>
  );
}

/** El botón de un filtro: su nombre y, si hay algo elegido, lo elegido, con el acento de selección. */
function FilterTrigger({ filter }: { filter: BarFilter }) {
  const chosen =
    filter.kind === 'options'
      ? filter.selected.map((key) => filter.options.find((option) => option.value === key)?.label ?? key)
      : [rangeText(filter.from, filter.to)].filter((text): text is string => text !== null);
  const active = isActive(filter);
  return (
    <PopoverTrigger asChild>
      <Button
        className={cn(
          'h-11 gap-1.5 px-3.5 text-sm sm:h-9 sm:text-[13px]',
          active && 'border-action bg-action-soft text-action hover:bg-action-soft',
          '[&[data-state=open]_svg:last-child]:rotate-180',
        )}
      >
        <span className="max-w-[16rem] truncate">{triggerText(filter.label, chosen)}</span>
        <ChevronDown aria-hidden className="transition-transform duration-150 motion-reduce:transition-none" />
      </Button>
    </PopoverTrigger>
  );
}

/**
 * Barra de filtros horizontal sobre una lista (ADR 0021): un botón por filtro, cada uno con su menú, y «Limpiar»
 * cuando hay algo puesto. El botón dice lo elegido. Cada cambio se aplica al instante: quien la usa escribe la URL.
 * En pantallas angostas la barra se desliza en horizontal, con botones de 44 px, en lugar de partirse en filas.
 */
export function FilterBar({ label = 'Filtros', filters, onClear }: { label?: string; filters: readonly BarFilter[]; onClear: () => void }) {
  const anyActive = filters.some(isActive);
  return (
    <div role="group" aria-label={label} className="-mx-1 -my-1 flex items-center gap-2 overflow-x-auto px-1 py-1 sm:flex-wrap sm:overflow-visible">
      {filters.map((filter) => (
        <Popover key={filter.id}>
          <FilterTrigger filter={filter} />
          <PopoverContent>{filter.kind === 'options' ? <OptionsBody filter={filter} /> : <PeriodBody filter={filter} />}</PopoverContent>
        </Popover>
      ))}
      {anyActive ? (
        <Button variant="ghost" className="h-11 text-sm sm:h-9 sm:text-[13px]" onClick={onClear}>
          Limpiar
        </Button>
      ) : null}
    </div>
  );
}
