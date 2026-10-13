// Prototipo R-01D: solo interfaz
import type { StockedProduct } from '@platlab/contracts';
import { Plus, Search } from 'lucide-react';
import { cn } from '@platlab/ui';
import { useId, useMemo, useState, type KeyboardEvent, type RefObject } from 'react';
import { sampleOf } from './catalog-sample';
import { ControlledMark, isControlled } from './controlled';
import { HazardGlyphs } from './hazards';
import { fold, type Selection } from './wizard-model';

const MAX_RESULTS = 6;

/**
 * Paso 1, «¿Qué reactivo llegó?»: buscador grande sobre el catálogo real, con los últimos elegidos
 * como fichas. Enter elige la opción activa (la primera al empezar); un reactivo existente pasa
 * directo al paso 2 y «Es un reactivo nuevo» abre el paso 1b.
 */
export function StepProduct({
  products,
  recents,
  canCreate,
  selection,
  searchRef,
  onPick,
  onCreate,
  onKeep,
}: {
  products: StockedProduct[];
  recents: StockedProduct[];
  canCreate: boolean;
  selection: Selection;
  searchRef: RefObject<HTMLInputElement | null>;
  onPick: (product: StockedProduct) => void;
  onCreate: (name: string) => void;
  /** Volver con algo ya elegido: seguir con ello. */
  onKeep: () => void;
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

  const keptName = selection?.kind === 'existing' ? selection.product.name : selection?.kind === 'new' ? 'un reactivo nuevo' : null;

  return (
    <div className="grid grid-cols-1 gap-5">
      <header className="grid gap-1">
        <h3 className="text-2xl font-bold tracking-tight text-ink">¿Qué reactivo llegó?</h3>
        <p className="text-sm text-ink-muted">Búscalo por nombre o por CAS. Si no está en el catálogo, lo creamos en un momento.</p>
      </header>

      {keptName ? (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-action-soft px-3 py-2 text-sm text-ink">
          <span>
            Elegiste <strong className="font-semibold">{keptName}</strong>.
          </span>
          <button type="button" onClick={onKeep} className="min-h-[44px] rounded-[6px] px-2 font-medium text-action hover:underline sm:min-h-8">
            Seguir con este
          </button>
        </p>
      ) : null}

      <div className="grid gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            ref={searchRef}
            role="combobox"
            aria-label="Nombre o CAS del reactivo"
            aria-expanded={text !== ''}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={total > 0 ? `${listId}-${activeIndex}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder="Etanol, 64-17-5…"
            className="h-14 w-full rounded-panel border border-line-strong bg-surface pl-12 pr-4 text-lg text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-subtle hover:border-ink-subtle focus-visible:border-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action/20"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
        </div>

        <ul
          id={listId}
          role="listbox"
          aria-label="Resultados del catálogo"
          hidden={text === ''}
          className="overflow-hidden rounded-panel border border-line bg-surface p-1 shadow-raised"
        >
          {matches.map((product, index) => (
            <li
              key={product.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseMove={() => setActive(index)}
              onClick={() => choose(index)}
              className={cn('flex min-h-[52px] cursor-pointer flex-wrap items-center gap-x-3 gap-y-0.5 rounded-control px-3 py-2', index === activeIndex && 'bg-action-soft')}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
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
              className={cn('flex min-h-[52px] cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-[15px] font-medium text-action', matches.length === activeIndex && 'bg-action-soft')}
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 break-words">Es un reactivo nuevo: «{text}»</span>
            </li>
          ) : null}
        </ul>
        {total === 0 && text !== '' ? (
          <p className="px-1 text-sm text-ink-muted">Ningún reactivo del catálogo coincide con «{text}».</p>
        ) : null}
        <p className="sr-only" role="status">
          {text === '' ? '' : `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}`}
        </p>
      </div>

      {text === '' && recents.length > 0 ? (
        <section aria-label="Recientes" className="grid gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Recientes</h4>
          <ul className="flex flex-wrap gap-2">
            {recents.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onPick(product)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors duration-150 hover:border-line-strong hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-9"
                >
                  {product.name}
                  {isControlled(product.code) ? <ControlledMark /> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
