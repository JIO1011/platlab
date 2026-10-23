import { Popover, PopoverContent, PopoverTrigger, cn } from '@platlab/ui';
import { ChevronDown } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { ComboOption } from '../../app/combobox';
import { fold } from '../../app/fold';
import { bare } from './request-cells';

const MAX_RESULTS = 8;

/**
 * El buscador del catálogo de una celda de Recursos. La tabla de Recursos se desliza de lado en pantallas angostas y recorta
 * lo que se sale de ella, así que la lista vive en un panel aparte (no dentro de la celda). La celda muestra lo elegido; al
 * abrirla se busca por nombre o código y se elige con el ratón, el dedo o el teclado (flechas y Enter).
 */
export function CatalogPicker({
  label,
  value,
  options,
  placeholder,
  invalid,
  onPick,
}: {
  /** Nombre accesible de la celda. */
  label: string;
  /** Lo elegido, o vacío. */
  value: string;
  options: readonly ComboOption[];
  placeholder: string;
  invalid: boolean;
  onPick: (option: ComboOption) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const needle = fold(query.trim());
  const matches = useMemo(
    () => (needle === '' ? options : options.filter((option) => fold(`${option.label} ${option.keywords ?? ''}`).includes(needle))).slice(0, MAX_RESULTS),
    [options, needle],
  );
  const current = Math.min(active, Math.max(matches.length - 1, 0));

  const choose = (option: ComboOption) => {
    onPick(option);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (matches.length > 0) setActive((current + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = matches[current];
      if (option) choose(option);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setQuery('');
        setActive(0);
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} aria-invalid={invalid || undefined} aria-haspopup="listbox" className={cn(bare, 'flex items-center justify-between gap-1 text-left')}>
          <span className={cn('min-w-0 break-words', value === '' && 'text-ink-subtle')}>{value || placeholder}</span>
          <ChevronDown className="size-3.5 shrink-0 text-ink-subtle print:hidden" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1.5">
        <input
          role="combobox"
          aria-label={`Buscar: ${label}`}
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={matches[current] ? `${listId}-${current}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="mb-1 h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action/20 sm:h-9"
        />
        <ul id={listId} role="listbox" aria-label={label} className="max-h-64 overflow-y-auto">
          {matches.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === current}
              onMouseMove={() => setActive(index)}
              onClick={() => choose(option)}
              className={cn('flex min-h-11 cursor-pointer flex-col justify-center rounded-[8px] px-2.5 py-1 text-sm sm:min-h-9', index === current && 'bg-action-soft')}
            >
              <span className="break-words text-ink">{option.label}</span>
              {option.detail ? <span className="text-[13px] text-ink-muted">{option.detail}</span> : null}
            </li>
          ))}
          {matches.length === 0 ? (
            <li role="option" aria-disabled="true" aria-selected={false} className="px-2.5 py-2 text-[13px] text-ink-muted">
              Sin coincidencias
            </li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
