// Prototipo R-01D: solo interfaz
import type { StockedProduct } from '@platlab/contracts';
import { Button, Field, Input, cn, sectionLabel } from '@platlab/ui';
import { CircleCheck, FileText, Plus, Search } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent, type RefObject } from 'react';
import { sampleOf, sdsText, type SdsKind } from './catalog-sample';
import { checkCas } from './cas';
import { HazardPicker, HazardTags } from './hazards';
import { RadioPills } from './radio-pills';

/** Reactivo nuevo tal como se escribe en la ventana (nada de esto se guarda en el prototipo). */
export interface NewProductDraft {
  name: string;
  cas: string;
  unit: string;
  state: string;
  hazards: string[];
  sds: SdsKind | '';
  sdsUrl: string;
}

export const emptyDraft: NewProductDraft = { name: '', cas: '', unit: '', state: '', hazards: [], sds: '', sdsUrl: '' };

export type Selection = { kind: 'existing'; product: StockedProduct } | { kind: 'new' } | null;

export type ProductErrors = Partial<Record<'product' | 'name' | 'unit' | 'state' | 'cas' | 'sdsUrl', string>>;

const units = ['g', 'kg', 'mL', 'L'].map((value) => ({ value, label: value }));
const states = [
  { value: 'solid', label: 'Sólido' },
  { value: 'liquid', label: 'Líquido' },
  { value: 'aqueous', label: 'Acuoso' },
  { value: 'mixture', label: 'Mezcla' },
  { value: 'gas', label: 'Gas' },
];
const sdsOptions: Array<{ value: SdsKind; label: string }> = [
  { value: 'digital', label: 'Digital' },
  { value: 'physical', label: 'Solo en físico' },
  { value: 'none', label: 'No tiene' },
];

/** Sin tildes y en minúsculas, para que «acido» encuentre «Ácido». */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const MAX_RESULTS = 6;

/**
 * Paso 1 de «Ingresar reactivo»: buscar en el catálogo real por nombre o CAS, o crear uno nuevo
 * sin salir de la ventana. Buscador con patrón de combobox: Enter elige la opción activa (la
 * primera al empezar), flechas la mueven.
 */
export function ProductPicker({
  products,
  canCreate,
  selection,
  onSelect,
  draft,
  onDraft,
  errors,
  searchRef,
  casRef,
  quantityRef,
}: {
  products: StockedProduct[];
  canCreate: boolean;
  selection: Selection;
  onSelect: (selection: Selection, draft?: Partial<NewProductDraft>) => void;
  draft: NewProductDraft;
  onDraft: (patch: Partial<NewProductDraft>) => void;
  errors: ProductErrors;
  searchRef: RefObject<HTMLInputElement | null>;
  casRef: RefObject<HTMLInputElement | null>;
  quantityRef: RefObject<HTMLInputElement | null>;
}) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [casTouched, setCasTouched] = useState(false);
  const text = query.trim();

  const matches = useMemo(() => {
    const needle = fold(text);
    if (!needle) return [];
    return products
      .filter((product) => fold(product.name).includes(needle) || fold(product.code).includes(needle) || (product.casNumber ?? '').includes(needle))
      .slice(0, MAX_RESULTS);
  }, [products, text]);
  const canOfferNew = canCreate && text !== '';
  const total = matches.length + (canOfferNew ? 1 : 0);
  const activeIndex = Math.min(active, Math.max(total - 1, 0));

  const choose = (index: number) => {
    const product = matches[index];
    if (product) {
      onSelect({ kind: 'existing', product });
      setQuery('');
      // La cantidad es lo siguiente que se pide.
      requestAnimationFrame(() => quantityRef.current?.focus());
    } else if (canOfferNew) {
      onSelect({ kind: 'new' }, { name: text });
      setQuery('');
      requestAnimationFrame(() => casRef.current?.focus());
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (total > 0) setActive((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + total) % total);
    } else if (event.key === 'Enter') {
      // Dentro del formulario, Enter enviaría el ingreso: aquí solo elige.
      event.preventDefault();
      if (total > 0) choose(activeIndex);
    }
  };

  const cas = checkCas(draft.cas);
  const casMessage =
    cas === 'valid' ? 'valid' : cas === 'invalid' || (cas === 'partial' && casTouched) ? 'invalid' : null;

  return (
    <section aria-labelledby="ingreso-reactivo" className="grid gap-4">
      <h3 id="ingreso-reactivo" className={sectionLabel}>
        Reactivo
      </h3>

      {selection === null ? (
        <div className="grid gap-1.5">
          <Field label="Nombre o CAS" error={errors.product}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <Input
                ref={searchRef}
                role="combobox"
                aria-expanded={text !== ''}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={total > 0 ? `${listId}-${activeIndex}` : undefined}
                autoComplete="off"
                spellCheck={false}
                placeholder="Etanol, 64-17-5…"
                className="pl-9 max-sm:h-[44px]"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
              />
            </div>
          </Field>
          <ul
            id={listId}
            role="listbox"
            aria-label="Resultados del catálogo"
            hidden={text === ''}
            className="overflow-hidden rounded-control border border-line bg-surface p-1 shadow-raised"
          >
            {matches.map((product, index) => (
              <li
                key={product.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseMove={() => setActive(index)}
                onClick={() => choose(index)}
                className={cn(
                  'flex min-h-[44px] cursor-pointer flex-wrap items-baseline gap-x-2 rounded-[8px] px-3 py-2 text-sm sm:min-h-10',
                  index === activeIndex && 'bg-action-soft',
                )}
              >
                <span className="font-medium text-ink">{product.name}</span>
                <span className="text-[13px] text-ink-muted">
                  {product.casNumber ?? 'sin CAS'} · {product.baseUnit}
                </span>
              </li>
            ))}
            {canOfferNew ? (
              <li
                id={`${listId}-${matches.length}`}
                role="option"
                aria-selected={matches.length === activeIndex}
                onMouseMove={() => setActive(matches.length)}
                onClick={() => choose(matches.length)}
                className={cn(
                  'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium text-action sm:min-h-10',
                  matches.length === activeIndex && 'bg-action-soft',
                )}
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">Crear «{text}» como reactivo nuevo</span>
              </li>
            ) : null}
          </ul>
          {total === 0 && text !== '' ? <p className="px-1 text-sm text-ink-muted">Ningún reactivo coincide con «{text}».</p> : null}
          <p className="sr-only" role="status">
            {text === '' ? '' : `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}`}
          </p>
        </div>
      ) : null}

      {selection?.kind === 'existing' ? <ExistingCard product={selection.product} onChange={() => {
        onSelect(null);
        requestAnimationFrame(() => searchRef.current?.focus());
      }} /> : null}

      {selection?.kind === 'new' ? (
        <div className="grid gap-4 rounded-panel bg-surface-sunken/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Reactivo nuevo</p>
            <Button
              size="sm"
              variant="ghost"
              className="max-sm:h-[44px]"
              onClick={() => {
                onSelect(null);
                requestAnimationFrame(() => searchRef.current?.focus());
              }}
            >
              Cambiar
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-[3fr_2fr]">
            <Field label="Nombre" error={errors.name}>
              <Input autoComplete="off" className="max-sm:h-[44px]" value={draft.name} onChange={(event) => onDraft({ name: event.target.value })} />
            </Field>
            <Field
              label="CAS"
              optional
              error={errors.cas}
              hint={
                casMessage === 'valid' ? (
                  <span className="inline-flex items-center gap-1 font-medium text-success">
                    <CircleCheck className="size-3.5" aria-hidden />
                    CAS válido
                  </span>
                ) : casMessage === 'invalid' ? (
                  <span className="font-medium text-danger">Revisa el CAS</span>
                ) : (
                  'Por ejemplo, 7647-14-5.'
                )
              }
            >
              <Input
                ref={casRef}
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                className="tabular-nums max-sm:h-[44px]"
                value={draft.cas}
                onBlur={() => setCasTouched(true)}
                onChange={(event) => onDraft({ cas: event.target.value })}
              />
            </Field>
          </div>
          <RadioPills legend="Unidad" value={draft.unit} options={units} onChange={(unit) => onDraft({ unit })} error={errors.unit} />
          <RadioPills legend="Estado físico" value={draft.state} options={states} onChange={(state) => onDraft({ state })} error={errors.state} />
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm font-medium text-ink">
              Peligros <span className="font-normal text-ink-subtle">(opcional)</span>
            </legend>
            <HazardPicker value={draft.hazards} onChange={(next) => onDraft({ hazards: next })} />
          </fieldset>
          <RadioPills<SdsKind>
            legend="Ficha de seguridad"
            optional
            value={draft.sds}
            options={sdsOptions}
            onChange={(sds) => onDraft({ sds })}
          />
          {draft.sds === 'digital' ? (
            <Field label="Enlace a la ficha" optional error={errors.sdsUrl} hint="El PDF se podrá subir más adelante.">
              <Input
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://"
                className="max-sm:h-[44px]"
                value={draft.sdsUrl}
                onChange={(event) => onDraft({ sdsUrl: event.target.value })}
              />
            </Field>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** Tarjeta compacta del reactivo elegido: lo que hace falta para confirmar que es el correcto. */
function ExistingCard({ product, onChange }: { product: StockedProduct; onChange: () => void }) {
  const sample = sampleOf(product.casNumber);
  return (
    <div className="grid gap-3 rounded-panel bg-surface-sunken/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight text-ink">{product.name}</p>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            <span className="tabular-nums">CAS {product.casNumber ?? 'sin indicar'}</span> · unidad {product.baseUnit}
          </p>
        </div>
        <Button size="sm" variant="secondary" className="shrink-0 max-sm:h-[44px]" onClick={onChange}>
          Cambiar
        </Button>
      </div>
      <HazardTags ids={sample.hazards} />
      <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
        <FileText className="size-3.5" aria-hidden />
        Ficha de seguridad: <span className="font-medium text-ink">{sdsText(sample.sds)}</span>
      </p>
    </div>
  );
}
