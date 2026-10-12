// Prototipo R-01D: solo interfaz
import type { StockedProduct } from '@platlab/contracts';
import { Field, Input, Select, normalizeDecimalInput, sectionLabel, toast } from '@platlab/ui';
import { ArrowDownToLine, Minus, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { checkCas } from './cas';
import { CostCenter } from './cost-center';
import { emptyDraft, ProductPicker, type NewProductDraft, type ProductErrors, type Selection } from './product-picker';
import { readRemembered, writeRemembered } from './remembered';
import { knownDensity as densityOf, receiptWeight } from './weight';
import { WeightSection } from './weight-section';
import { useReceiptLocations } from '../queries';
import { FormSheet, type SheetBaseProps } from '../sheets/shared';

const decimal = /^\d{1,15}(\.\d{1,9})?$/;
const MAX_CONTAINERS = 50;

interface Bottles {
  quantity: string;
  count: string;
  locationId: string;
  expiresOn: string;
  noExpiry: boolean;
  brand: string;
  supplierLot: string;
  costCenter: string;
  invoice: string;
  weightOpen: boolean;
  fullWeight: string;
  density: string;
}

type Errors = ProductErrors & Partial<Record<'quantity' | 'count' | 'locationId' | 'weight', string>>;

const countOf = (text: string) => (/^\d{1,3}$/.test(text.trim()) ? Number(text.trim()) : null);

/**
 * «Ingresar reactivo» (prototipo de R-01D): elegir o crear el reactivo y dar de alta sus frascos en
 * una sola ventana. No guarda nada: al confirmar, se cierra y un aviso lo dice. Los datos nuevos
 * (peligros, ficha, centro de costo, peso) viven solo en el estado local.
 */
export function ReceiveSheet({
  workspaceId,
  open,
  onOpenChange,
  products,
  productId,
  canCreate,
}: SheetBaseProps & { products: StockedProduct[]; productId: string | undefined; canCreate: boolean }) {
  const remembered = useRef(readRemembered(workspaceId)).current;
  const initial = productId ? products.find((product) => product.id === productId) : undefined;
  const [selection, setSelection] = useState<Selection>(initial ? { kind: 'existing', product: initial } : null);
  const [draft, setDraft] = useState<NewProductDraft>(emptyDraft);
  const [bottles, setBottles] = useState<Bottles>({
    quantity: '',
    count: '1',
    locationId: remembered.locationId,
    expiresOn: '',
    noExpiry: false,
    brand: remembered.brand,
    supplierLot: '',
    costCenter: remembered.costCenter,
    invoice: '',
    weightOpen: false,
    fullWeight: '',
    density: '',
  });
  const [extraCenters, setExtraCenters] = useState(remembered.extraCenters);
  const [attempted, setAttempted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const casRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const locations = useReceiptLocations(workspaceId, open);
  const locationList = locations.data?.items ?? [];

  const patch = (next: Partial<Bottles>) => setBottles((previous) => ({ ...previous, ...next }));
  const patchDraft = (next: Partial<NewProductDraft>) => setDraft((previous) => ({ ...previous, ...next }));

  const existing = selection?.kind === 'existing' ? selection.product : null;
  const unit = existing ? existing.baseUnit : draft.unit;
  const quantity = normalizeDecimalInput(bottles.quantity);
  const count = countOf(bottles.count);
  const known = existing ? densityOf(existing.casNumber) : null;
  const weight = receiptWeight({
    unit,
    quantity,
    full: normalizeDecimalInput(bottles.fullWeight),
    density: normalizeDecimalInput(bottles.density),
    knownDensity: known,
  });
  // El lugar recordado puede no estar entre las ubicaciones de hoy: entonces cuenta como vacío.
  const locationId = locationList.some((entry) => entry.id === bottles.locationId) ? bottles.locationId : '';

  const errors = ((): Errors => {
    const found: Errors = {};
    if (selection === null) found.product = 'Elige un reactivo del catálogo o crea uno nuevo.';
    if (selection?.kind === 'new') {
      if (!draft.name.trim()) found.name = 'Escribe el nombre del reactivo.';
      if (!draft.unit) found.unit = 'Elige la unidad en que se mide.';
      if (!draft.state) found.state = 'Elige el estado físico.';
      if (checkCas(draft.cas) === 'invalid' || checkCas(draft.cas) === 'partial') found.cas = 'Revisa el CAS: no coincide su dígito de control.';
      if (draft.sds === 'digital' && draft.sdsUrl.trim() && !/^https?:\/\/\S+\.\S+/.test(draft.sdsUrl.trim())) {
        found.sdsUrl = 'Escribe el enlace completo, por ejemplo https://….';
      }
    }
    if (!quantity) found.quantity = 'Escribe la cantidad que trae cada frasco.';
    else if (!decimal.test(quantity) || /^0+(\.0+)?$/.test(quantity)) found.quantity = 'Escribe una cantidad mayor que cero, como 500 o 2,5.';
    if (count === null || count < 1 || count > MAX_CONTAINERS) found.count = 'Entre 1 y 50 frascos.';
    if (!locationId) found.locationId = 'Elige dónde se guarda.';
    if (weight.error) found.weight = weight.error;
    return found;
  })();
  const shown = attempted ? errors : {};
  const problems = Object.keys(errors).length;

  const submit = () => {
    if (problems > 0) {
      setAttempted(true);
      if (errors.weight) patch({ weightOpen: true });
      // Foco en el primer dato que falta: el aviso de arriba dice cuántos son.
      requestAnimationFrame(() => {
        const target = formRef.current?.closest('form')?.querySelector<HTMLElement>('[aria-invalid="true"]');
        (target?.getAttribute('role') === 'radiogroup' ? target.querySelector<HTMLElement>('input') : target)?.focus();
      });
      return;
    }
    writeRemembered(workspaceId, { locationId, brand: bottles.brand.trim(), costCenter: bottles.costCenter, extraCenters });
    toast('Vista previa: aún no se guarda nada');
    onOpenChange(false);
  };

  const label = count !== null && count >= 1 && count <= MAX_CONTAINERS ? `Ingresar ${count} ${count === 1 ? 'frasco' : 'frascos'}` : 'Ingresar frascos';
  const step = (delta: number) => patch({ count: String(Math.min(MAX_CONTAINERS, Math.max(1, (count ?? 1) + delta))) });
  const stepper = 'inline-flex size-[44px] shrink-0 items-center justify-center rounded-control border border-line-strong bg-surface text-ink transition-colors hover:bg-surface-sunken disabled:opacity-40 sm:size-10';

  return (
    <FormSheet
      wide
      sections
      initialFocus={initial ? quantityRef : searchRef}
      icon={ArrowDownToLine}
      title="Ingresar reactivo"
      description="Elige el reactivo y da de alta sus frascos en un solo paso."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={label}
      pending={false}
      generalError={attempted && problems > 0 ? `Falta completar ${problems} ${problems === 1 ? 'dato' : 'datos'}: revisa los campos marcados.` : null}
      onSubmit={submit}
    >
      <div ref={formRef}>
        <ProductPicker
          products={products}
          canCreate={canCreate}
          selection={selection}
          onSelect={(next, seed) => {
            setSelection(next);
            if (seed) patchDraft(seed);
          }}
          draft={draft}
          onDraft={patchDraft}
          errors={shown}
          searchRef={searchRef}
          casRef={casRef}
          quantityRef={quantityRef}
        />
      </div>

      <section aria-labelledby="ingreso-frascos" className="grid gap-4">
        <h3 id="ingreso-frascos" className={sectionLabel}>
          Frascos
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cantidad por frasco" error={shown.quantity}>
            <div className="relative">
              <Input
                ref={quantityRef}
                inputMode="decimal"
                autoComplete="off"
                placeholder="500"
                className="pr-12 tabular-nums max-sm:h-[44px]"
                value={bottles.quantity}
                onChange={(event) => patch({ quantity: event.target.value })}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">{unit}</span>
            </div>
          </Field>
          <Field label="N.º de frascos" error={shown.count} hint="De 1 a 50.">
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Un frasco menos" disabled={(count ?? 1) <= 1} onClick={() => step(-1)} className={stepper}>
                <Minus className="size-4" aria-hidden />
              </button>
              <Input
                inputMode="numeric"
                autoComplete="off"
                className="w-16 text-center font-semibold tabular-nums max-sm:h-[44px]"
                value={bottles.count}
                onChange={(event) => patch({ count: event.target.value })}
              />
              <button type="button" aria-label="Un frasco más" disabled={(count ?? 1) >= MAX_CONTAINERS} onClick={() => step(1)} className={stepper}>
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          </Field>
        </div>
        {count !== null && count >= 1 && count <= MAX_CONTAINERS ? (
          <p role="status" className="rounded-control bg-action-soft px-3 py-2.5 text-sm text-ink">
            {count === 1 ? 'Se creará 1 frasco con su código y su QR.' : `Se crearán ${count} frascos, cada uno con su código y su QR.`}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ubicación" error={shown.locationId}>
            <Select
              value={locationId || undefined}
              onValueChange={(value) => patch({ locationId: value })}
              options={locationList.map((entry) => ({ value: entry.id, label: entry.name, detail: entry.code }))}
              placeholder={locations.isPending ? 'Cargando…' : 'Elige dónde se guarda'}
              triggerClassName="max-sm:h-[44px]"
            />
          </Field>
          <Field label="Caducidad" optional hint={bottles.noExpiry ? 'Quedará como «caducidad sin confirmar».' : undefined}>
            <div className="grid gap-1">
              <Input
                type="date"
                disabled={bottles.noExpiry}
                className="max-sm:h-[44px]"
                value={bottles.expiresOn}
                onChange={(event) => patch({ expiresOn: event.target.value })}
              />
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-ink sm:min-h-8">
                <input
                  type="checkbox"
                  className="size-4 accent-action"
                  checked={bottles.noExpiry}
                  onChange={(event) => patch({ noExpiry: event.target.checked, expiresOn: event.target.checked ? '' : bottles.expiresOn })}
                />
                No indica
              </label>
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Marca" optional>
            <Input autoComplete="off" className="max-sm:h-[44px]" value={bottles.brand} onChange={(event) => patch({ brand: event.target.value })} />
          </Field>
          <Field label="Lote del fabricante" optional>
            <Input
              autoComplete="off"
              spellCheck={false}
              className="max-sm:h-[44px]"
              value={bottles.supplierLot}
              onChange={(event) => patch({ supplierLot: event.target.value })}
            />
          </Field>
        </div>

        <CostCenter
          value={bottles.costCenter}
          extras={extraCenters}
          onChange={(costCenter) => patch({ costCenter })}
          onAdd={(name) => setExtraCenters((previous) => (previous.includes(name) ? previous : [...previous, name]))}
        />

        <Field label="Factura u orden de compra" optional>
          <Input autoComplete="off" className="max-sm:h-[44px]" value={bottles.invoice} onChange={(event) => patch({ invoice: event.target.value })} />
        </Field>

        <WeightSection
          open={bottles.weightOpen}
          onToggle={() => patch({ weightOpen: !bottles.weightOpen })}
          full={bottles.fullWeight}
          onFull={(fullWeight) => patch({ fullWeight })}
          density={bottles.density}
          onDensity={(density) => patch({ density })}
          knownDensity={known}
          result={attempted || !weight.error ? weight : { ...weight, error: null }}
        />
      </section>
    </FormSheet>
  );
}
