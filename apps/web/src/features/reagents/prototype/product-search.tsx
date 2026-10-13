// Prototipo R-01D: solo interfaz
import type { StockedProduct } from '@platlab/contracts';
import { Plus, Search } from 'lucide-react';
import { cn } from '@platlab/ui';
import { useId, useMemo, useState, type KeyboardEvent, type RefObject } from 'react';
import { sampleOf } from './catalog-sample';
import { ControlledMark, isControlled } from './controlled';
import { HazardGlyphs } from './hazards';
import { fold } from './wizard-model';

const MAX_RESULTS = 5;

/**
 * Buscador compacto de «Reactivo» sobre el catálogo real, con los últimos elegidos como fichas.
 * Enter elige la opción activa (la primera al empezar); un reactivo existente pliega la sección en
 * su resumen y «Es un reactivo nuevo» abre los campos del reactivo.
 */
export function ProductSearch({
  products,
  recents,
  canCreate,
  searchRef,
  error,
  onPick,
  onCreate,
}: {
  products: StockedProduct[];
  recents: StockedProduct[];
  canCreate: boolean;
  searchRef: RefObject<HTMLInputElement | null>;
  error?: string | undefined;
  onPick: (product: StockedProduct) => void;
  onCreate: (name: string) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const text = query.trim();

  const matches = useMemo(() => {
    const needle = fold(text);
    if (!needle) return [];
    return products
      .filter((product) => fold(product.name).includes(needle) || fold(product.code).includes(needle) || (product.casNumber ?? '').includes(needle))
      .slice(0, MAX_RESULTS);
  }, [products, text]);
  const offerNew = canCreate && text !== '';
  const total = matches.length + (offerNew ? 1 : 0);
  const activeIndex = Math.min(active, Math.max(total - 1, 0));

  const choose = (index: number) => {
    const product = matches[index];
    if (product) onPick(product);
    else if (offerNew) onCreate(text);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (total > 0) setActive((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + total) % total);
    } else if (event.key === 'Enter') {
      // Enter elige; dentro del formulario no debe enviar nada.
      event.preventDefault();
      if (total > 0) choose(activeIndex);
    }
  };

  const row = 'flex min-h-[44px] cursor-pointer flex-wrap items-center gap-x-3 gap-y-0.5 rounded-[8px] px-2.5 py-1 sm:min-h-10';
  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          ref={searchRef}
          role="combobox"
          aria-label="Nombre o CAS del reactivo"
          aria-required
          aria-expanded={text !== ''}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={total > 0 ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${listId}-error` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Nombre o CAS…"
          className="h-[44px] w-full rounded-control border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-subtle hover:border-ink-subtle focus-visible:border-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action/20 aria-[invalid=true]:border-danger sm:h-9"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {error ? (
        <p id={`${listId}-error`} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}

      <ul id={listId} role="listbox" aria-label="Resultados del catálogo" hidden={text === ''} className="rounded-control border border-line bg-surface p-1">
        {matches.map((product, index) => (
          <li
            key={product.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            onMouseMove={() => setActive(index)}
            onClick={() => choose(index)}
            className={cn(row, index === activeIndex && 'bg-action-soft')}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                {product.name}
                {isControlled(product.code) ? <ControlledMark /> : null}
              </span>
              <span className="text-[13px] text-ink-muted">
                {product.casNumber ?? 'sin CAS'} · {product.baseUnit}
              </span>
            </span>
            <HazardGlyphs ids={sampleOf(product.casNumber).hazards} />
          </li>
        ))}
        {offerNew ? (
          <li
            id={`${listId}-${matches.length}`}
            role="option"
            aria-selected={matches.length === activeIndex}
            onMouseMove={() => setActive(matches.length)}
            onClick={() => choose(matches.length)}
            className={cn(row, 'flex-nowrap gap-2 text-sm font-medium text-action', matches.length === activeIndex && 'bg-action-soft')}
          >
            <Plus className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 break-words">Es un reactivo nuevo: «{text}»</span>
          </li>
        ) : null}
      </ul>
      {total === 0 && text !== '' ? <p className="px-1 text-[13px] text-ink-muted">Ningún reactivo del catálogo coincide con «{text}».</p> : null}
      <p className="sr-only" role="status">
        {text === '' ? '' : `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}`}
      </p>

      {text === '' && recents.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span id={`${listId}-recents`} className="text-xs font-semibold text-ink-muted">
            Recientes
          </span>
          <ul aria-labelledby={`${listId}-recents`} className="flex flex-wrap gap-1.5">
            {recents.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onPick(product)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-medium text-ink transition-colors duration-150 hover:border-line-strong hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-8"
                >
                  {product.name}
                  {isControlled(product.code) ? <ControlledMark /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
