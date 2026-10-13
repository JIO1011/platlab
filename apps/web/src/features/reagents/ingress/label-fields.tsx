import type { StockedProduct } from '@platlab/contracts';
import { Field, Input, cn } from '@platlab/ui';
import { CircleCheck, Lock, Minus, Plus, TriangleAlert } from 'lucide-react';
import { useMemo, type RefObject } from 'react';
import { ControlledMark } from '../controlled';
import { HazardGlyphs } from '../hazards';
import { checkCas } from './cas';
import { Combobox, type ComboOption } from './combobox';
import { FilledInput, QuantityInput, fieldGrid, fieldLabel, filled } from './filled';
import { MAX_BOTTLES, casRequired, countOf, lastSuffix, productUnits, recentFirst, type BottlesForm, type Draft, type Errors } from './model';

const stepper =
  'inline-flex h-full w-[44px] shrink-0 items-center justify-center text-ink transition-colors duration-150 hover:bg-action-soft disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action sm:w-[36px]';

/**
 * «Datos de la etiqueta» (ADR 0015): lo que se copia del frasco. El nombre es el buscador del
 * catálogo: al elegir un reactivo existente, CAS y unidad vienen de su ficha en solo lectura; si no,
 * es un reactivo nuevo y se escriben. El código lo sugiere el servidor y los frascos se numeran a partir
 * de él; con más de uno, el campo muestra a la derecha dónde termina la numeración.
 */
export function LabelFields({
  existing,
  products,
  recentIds,
  draft,
  onDraft,
  onName,
  form,
  onForm,
  code,
  codes,
  brands,
  errors,
  canCreate,
  nameRef,
  casRef,
  quantityRef,
  onPick,
  onCreate,
}: {
  existing: StockedProduct | null;
  products: StockedProduct[];
  recentIds: string[];
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  /** Escribir el nombre deja de ser un reactivo elegido del catálogo. */
  onName: (name: string) => void;
  form: BottlesForm;
  onForm: (patch: Partial<BottlesForm>) => void;
  /** Código del primer frasco: el sugerido o el escrito. */
  code: string;
  /** La serie que se registrará. */
  codes: string[];
  brands: string[];
  errors: Errors;
  canCreate: boolean;
  nameRef: RefObject<HTMLInputElement | null>;
  casRef: RefObject<HTMLInputElement | null>;
  quantityRef: RefObject<HTMLInputElement | null>;
  onPick: (product: StockedProduct) => void;
  onCreate: () => void;
}) {
  const productOptions = useMemo<ComboOption[]>(
    () =>
      recentFirst(products, recentIds).map((product) => ({
        id: product.id,
        label: product.name,
        keywords: `${product.code} ${product.casNumber ?? ''}`,
        detail: `${product.casNumber ?? 'Sin CAS'} · ${product.baseUnit}`,
        trailing: (
          <span className="flex shrink-0 items-center gap-1.5">
            {product.controlled ? <ControlledMark /> : null}
            <HazardGlyphs ids={product.hazards} />
          </span>
        ),
      })),
    [products, recentIds],
  );
  const brandOptions = useMemo<ComboOption[]>(() => brands.map((brand) => ({ id: brand, label: brand })), [brands]);

  const cas = checkCas(draft.cas);
  const count = countOf(form.count);
  const step = (delta: number) => onForm({ count: String(Math.min(MAX_BOTTLES, Math.max(1, (count ?? 1) + delta))) });
  const last = lastSuffix(codes);

  return (
    <div className={fieldGrid}>
      <Field label="Nombre" required labelClassName={fieldLabel} error={errors.name}>
        <Combobox
          inputRef={nameRef}
          value={existing ? existing.name : draft.name}
          onChange={onName}
          options={productOptions}
          onPick={(option) => {
            const product = products.find((entry) => entry.id === option.id);
            if (product) onPick(product);
          }}
          canCreate={canCreate}
          onCreate={onCreate}
          placeholder="Nombre del reactivo"
        />
      </Field>

      <Field label="CAS" required={!existing && casRequired(draft.state)} labelClassName={fieldLabel} error={errors.cas}>
        {/* El estado va dentro del campo, sin texto debajo: ✓ válido, ⚠ dígito de control erróneo, 🔒 del catálogo. */}
        <div className="relative">
          <FilledInput
            ref={casRef}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder={existing ? 'Sin CAS' : '7647-14-5'}
            className="pr-9 tabular-nums"
            readOnly={existing !== null}
            aria-invalid={cas === 'invalid' || errors.cas ? true : undefined}
            value={existing ? (existing.casNumber ?? '') : draft.cas}
            onChange={(event) => onDraft({ cas: event.target.value })}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            {existing ? (
              <Lock className="size-4 text-ink-subtle" role="img" aria-label="Del catálogo" />
            ) : cas === 'valid' ? (
              <CircleCheck className="size-4 text-success" role="img" aria-label="CAS válido" />
            ) : cas === 'invalid' ? (
              <TriangleAlert className="size-4 text-danger" role="img" aria-label="CAS no válido: revisa el dígito de control" />
            ) : null}
          </span>
        </div>
      </Field>

      <Field label="Marca" labelClassName={fieldLabel}>
        <Combobox
          value={form.brand}
          onChange={(brand) => onForm({ brand })}
          options={brandOptions}
          onPick={(option) => onForm({ brand: option.label })}
        />
      </Field>

      <Field label="Código" labelClassName={fieldLabel} error={errors.code}>
        <div className="relative">
          <FilledInput
            autoComplete="off"
            spellCheck={false}
            className={cn('tabular-nums', last && 'pr-16')}
            value={code}
            onChange={(event) => onForm({ code: event.target.value })}
          />
          {last ? (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm tabular-nums text-ink-subtle">
              → {last}
            </span>
          ) : null}
        </div>
      </Field>

      <Field label="Cantidad" required labelClassName={fieldLabel} error={errors.quantity}>
        <QuantityInput
          inputRef={quantityRef}
          unit={existing ? existing.baseUnit : draft.unit}
          {...(existing ? {} : { units: productUnits, onUnit: (unit: string) => onDraft({ unit: productUnits.find((entry) => entry === unit) ?? 'g' }) })}
          placeholder="500"
          value={form.quantity}
          onChange={(event) => onForm({ quantity: event.target.value })}
        />
      </Field>

      <Field label="Frascos" required labelClassName={fieldLabel} error={errors.count}>
        <div className={cn(filled, 'flex w-fit items-stretch overflow-hidden rounded-control border bg-surface-sunken focus-within:border-action has-[[aria-invalid=true]]:border-danger')}>
          <button type="button" aria-label="Un frasco menos" disabled={(count ?? 1) <= 1} onClick={() => step(-1)} className={stepper}>
            <Minus className="size-4" aria-hidden />
          </button>
          <Input
            inputMode="numeric"
            autoComplete="off"
            className="h-full w-12 rounded-none border-0 bg-transparent px-0 text-center font-bold tabular-nums hover:border-0 focus-visible:ring-0 aria-[invalid=true]:ring-0"
            value={form.count}
            onChange={(event) => onForm({ count: event.target.value })}
          />
          <button type="button" aria-label="Un frasco más" disabled={(count ?? 1) >= MAX_BOTTLES} onClick={() => step(1)} className={stepper}>
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      </Field>

      <Field label="Caducidad" labelClassName={fieldLabel} hint={form.noExpiry ? 'Quedará como «caducidad sin confirmar».' : undefined}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <FilledInput
            type="date"
            disabled={form.noExpiry}
            className="w-40"
            value={form.expiresOn}
            onChange={(event) => onForm({ expiresOn: event.target.value })}
          />
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[13px] font-medium text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-action sm:min-h-[36px]">
            <input
              type="checkbox"
              aria-label="La etiqueta no indica la caducidad"
              className="size-4 accent-action"
              checked={form.noExpiry}
              onChange={(event) => onForm({ noExpiry: event.target.checked, expiresOn: event.target.checked ? '' : form.expiresOn })}
            />
            No indica
          </label>
        </div>
      </Field>
    </div>
  );
}
