// Prototipo R-01D: solo interfaz
import type { StockedProduct } from '@platlab/contracts';
import { Button, Sheet, normalizeDecimalInput, toast } from '@platlab/ui';
import { ArrowLeft, PackagePlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { formatDate } from '../../../app/format';
import { useReceiptLocations } from '../queries';
import { sampleOf } from './catalog-sample';
import { isControlled } from './controlled';
import { pushRecent, readRemembered, writeRemembered } from './remembered';
import { StepBottles } from './step-bottles';
import { StepDetails } from './step-details';
import { StepDone } from './step-done';
import { StepNew } from './step-new';
import { StepProduct } from './step-product';
import { knownDensity as densityOf, receiptWeight } from './weight';
import {
  countOf,
  countValid,
  emptyDraft,
  sampleBrands,
  toPlaces,
  validateBottles,
  validateNew,
  type BottlesForm,
  type Draft,
  type Errors,
  type Place,
  type Selection,
  type Step,
} from './wizard-model';
import { PreviewBar, PreviewPanel, type PreviewData } from './wizard-preview';
import { WizardProgress } from './wizard-progress';

const primary =
  'h-12 flex-1 rounded-2xl bg-linear-to-r from-action to-action-deep text-base font-bold shadow-lg shadow-action/25 hover:from-action-hover hover:to-action-deep max-sm:order-first max-sm:w-full max-sm:basis-full';
const initialForm: BottlesForm = {
  quantity: '',
  count: '1',
  placeId: '',
  noExpiry: false,
  expiresOn: '',
  brand: '',
  supplierLot: '',
  area: '',
  weightOpen: false,
  fullWeight: '',
  density: '',
};

/**
 * «Ingresar reactivo» como asistente (prototipo de R-01D): ¿qué reactivo llegó?, ¿cuántos frascos y
 * dónde?, ¿algo más? A la derecha, una vista previa viva de lo que se va a ingresar (en el móvil,
 * una barra al pie). No guarda nada: al terminar muestra el éxito y lo dice.
 */
export function WizardSheet({
  workspaceId,
  open,
  onOpenChange,
  products,
  productId,
  canCreate,
  base,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: StockedProduct[];
  productId: string | undefined;
  canCreate: boolean;
  base: string;
}) {
  const navigate = useNavigate();
  const initial = productId ? products.find((product) => product.id === productId) : undefined;
  const [remembered, setRemembered] = useState(() => readRemembered(workspaceId));
  const [step, setStep] = useState<Step>(initial ? 'bottles' : 'product');
  const [moved, setMoved] = useState<'forward' | 'back' | null>(null);
  const [selection, setSelection] = useState<Selection>(initial ? { kind: 'existing', product: initial } : null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [form, setForm] = useState<BottlesForm>({ ...initialForm, area: remembered.area });
  const [extraAreas, setExtraAreas] = useState(remembered.extraAreas);
  const [localPlaces, setLocalPlaces] = useState<Place[]>([]);
  const [attempted, setAttempted] = useState<Partial<Record<Step, boolean>>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [finished, setFinished] = useState<StockedProduct | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);
  const brandRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLFormElement>(null);

  const locations = useReceiptLocations(workspaceId, open);
  const places = useMemo(() => [...toPlaces(locations.data?.items ?? []), ...localPlaces], [locations.data, localPlaces]);
  const recentPlaces = remembered.recentLocations.flatMap((id) => places.filter((place) => place.id === id));
  const recentProducts = remembered.recentProducts.flatMap((id) => products.filter((product) => product.id === id));

  const patch = (next: Partial<BottlesForm>) => setForm((previous) => ({ ...previous, ...next }));
  const patchDraft = (next: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...next }));

  const existing = selection?.kind === 'existing' ? selection.product : null;
  const unit = existing ? existing.baseUnit : draft.unit;
  const quantity = normalizeDecimalInput(form.quantity);
  const count = countOf(form.count);
  const known = existing ? densityOf(existing.casNumber) : null;
  const weight = receiptWeight({ unit, quantity, full: normalizeDecimalInput(form.fullWeight), density: normalizeDecimalInput(form.density), knownDensity: known });
  const place = places.find((entry) => entry.id === form.placeId);
  const brandSuggestions = [...new Set([...remembered.brands, ...sampleBrands])].slice(0, 5);

  const preview: PreviewData = {
    name: existing ? existing.name : draft.name.trim(),
    controlled: existing ? isControlled(existing.code) : draft.controlled,
    hazards: existing ? sampleOf(existing.casNumber).hazards : draft.hazards,
    count,
    quantity: form.quantity,
    unit,
    placeName: place?.name ?? '',
    placeRoute: place?.route ?? '',
    expiry: form.noExpiry ? 'Caducidad sin confirmar' : form.expiresOn ? `Caduca ${formatDate(form.expiresOn)}` : '',
    brand: form.brand.trim(),
  };

  const newErrors = attempted.new ? validateNew(draft) : {};
  const bottleErrors = attempted.bottles ? validateBottles(form, quantity, place ? place.id : '') : {};
  const detailErrors: Errors = attempted.details && weight.error ? { weight: weight.error } : {};
  const errors: Errors = { ...newErrors, ...bottleErrors, ...detailErrors };
  const shownCount = Object.keys(step === 'new' ? newErrors : step === 'bottles' ? bottleErrors : step === 'details' ? detailErrors : {}).length;

  const go = (next: Step, direction: 'forward' | 'back') => {
    setMoved(direction);
    setStep(next);
  };

  // Tras cambiar de paso, el foco va al primer campo: nadie se queda en un botón que ya no existe.
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    const target = step === 'product' ? searchRef : step === 'new' ? nameRef : step === 'bottles' ? quantityRef : step === 'details' ? brandRef : null;
    requestAnimationFrame(() => target?.current?.focus());
  }, [step]);

  const failAt = (at: Step) => {
    setAttempted((previous) => ({ ...previous, [at]: true }));
    if (at === 'details') patch({ weightOpen: true });
    // El primer campo con error recibe el foco; los avisos ya dicen qué falta en cada uno.
    requestAnimationFrame(() => {
      const target = bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      (target?.getAttribute('role') === 'radiogroup' ? target.querySelector<HTMLElement>('input') : target)?.focus();
    });
  };

  const back = () => go(step === 'details' ? 'bottles' : step === 'bottles' ? (selection?.kind === 'new' ? 'new' : 'product') : 'product', 'back');
  const toPhase = (index: number) => {
    if (index === 0) go(selection?.kind === 'new' ? 'new' : 'product', 'back');
    else if (index === 1) go('bottles', 'back');
  };

  const continueNew = () => {
    if (Object.keys(validateNew(draft)).length > 0) return failAt('new');
    go('bottles', 'forward');
  };
  const toDetails = () => {
    if (Object.keys(validateBottles(form, quantity, place ? place.id : '')).length > 0) return failAt('bottles');
    go('details', 'forward');
  };
  const confirm = () => {
    if (Object.keys(validateBottles(form, quantity, place ? place.id : '')).length > 0) {
      if (step !== 'bottles') go('bottles', 'back');
      return failAt('bottles');
    }
    if (weight.error) {
      if (step !== 'details') go('details', 'forward');
      return failAt('details');
    }
    if (!place || !countValid(count)) return;
    const next = {
      recentProducts: existing ? pushRecent(remembered.recentProducts, existing.id, 5) : remembered.recentProducts,
      recentLocations: place.local ? remembered.recentLocations : pushRecent(remembered.recentLocations, place.id, 3),
      brands: form.brand.trim() ? pushRecent(remembered.brands, form.brand.trim(), 8) : remembered.brands,
      area: form.area,
      extraAreas,
    };
    writeRemembered(workspaceId, next);
    setRemembered(next);
    setFinished(existing);
    setSummary(`Ingresaste ${count} ${count === 1 ? 'frasco' : 'frascos'} de ${preview.name} en ${place.name}.`);
    go('done', 'forward');
  };

  const restart = () => {
    setSelection(null);
    setDraft(emptyDraft);
    setForm({ ...initialForm, area: remembered.area });
    setAttempted({});
    setPreviewOpen(false);
    setFinished(null);
    go('product', 'back');
  };

  const label = countValid(count) ? `Ingresar ${count} ${count === 1 ? 'frasco' : 'frascos'}` : 'Ingresar frascos';
  const onSubmit = () => {
    if (step === 'new') continueNew();
    else if (step === 'bottles' || step === 'details') confirm();
  };

  const stepClass = moved === null ? undefined : moved === 'forward' ? 'animate-step-forward' : 'animate-step-back';
  const barVisible = step !== 'done' && step !== 'product' && preview.name !== '';
  const footer =
    step === 'done' || step === 'product' ? undefined : (
      <div className="grid w-full gap-2">
        {barVisible ? <PreviewBar data={preview} open={previewOpen} onToggle={() => setPreviewOpen(!previewOpen)} /> : null}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="ghost" className="h-12 shrink-0 rounded-2xl px-4" onClick={back}>
            <ArrowLeft aria-hidden />
            Atrás
          </Button>
          {step === 'bottles' ? (
            <Button className="h-12 shrink-0 rounded-2xl px-4" onClick={toDetails}>
              Añadir detalles
            </Button>
          ) : null}
          <Button type="submit" form="form-ingresar-reactivo" variant="primary" className={primary}>
            {step === 'new' ? 'Continuar' : label}
          </Button>
        </div>
      </div>
    );

  return (
    <Sheet
      wide="xl"
      initialFocus={initial ? quantityRef : searchRef}
      icon={PackagePlus}
      title="Ingresar reactivo"
      description="Cuéntanos qué llegó y lo dejamos listo, paso a paso."
      open={open}
      onOpenChange={onOpenChange}
      footer={footer}
    >
      <form
        id="form-ingresar-reactivo"
        ref={bodyRef}
        noValidate
        onKeyDown={(event) => {
          // El campo de fecha no envía el formulario con Enter por sí solo.
          if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type === 'date') {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {step !== 'done' ? <WizardProgress step={step} onGo={toPhase} /> : null}
        {shownCount > 0 ? (
          <p role="alert" className="mb-4 rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
            Falta completar {shownCount} {shownCount === 1 ? 'dato' : 'datos'}: revisa lo marcado.
          </p>
        ) : null}
        {step === 'done' ? (
          <div className={stepClass}>
            <StepDone
              summary={summary}
              onPrint={() => toast('Vista previa: aún no se guarda nada')}
              onAnother={restart}
              onFicha={
                finished
                  ? () => {
                      onOpenChange(false);
                      void navigate(`${base}/inventario/${finished.id}`);
                    }
                  : null
              }
            />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:min-h-[28rem]">
            <div key={step} className={stepClass}>
              {step === 'product' ? (
                <StepProduct
                  products={products}
                  recents={recentProducts}
                  canCreate={canCreate}
                  selection={selection}
                  searchRef={searchRef}
                  onPick={(product) => {
                    setSelection({ kind: 'existing', product });
                    go('bottles', 'forward');
                  }}
                  onCreate={(name) => {
                    setSelection({ kind: 'new' });
                    patchDraft({ name });
                    go('new', 'forward');
                  }}
                  onKeep={() => go(selection?.kind === 'new' ? 'new' : 'bottles', 'forward')}
                />
              ) : null}
              {step === 'new' ? <StepNew draft={draft} onDraft={patchDraft} errors={errors} nameRef={nameRef} /> : null}
              {step === 'bottles' ? (
                <StepBottles
                  form={form}
                  onForm={patch}
                  unit={unit}
                  errors={errors}
                  places={places}
                  recentPlaces={recentPlaces}
                  canCreatePlace={canCreate}
                  onCreatePlace={(name, parentId) => {
                    const parent = places.find((entry) => entry.id === parentId);
                    const created: Place = { id: `local-${Date.now()}`, name, route: parent ? `${parent.route} › ${name}` : name, local: true };
                    setLocalPlaces((previous) => [...previous, created]);
                    patch({ placeId: created.id });
                  }}
                  quantityRef={quantityRef}
                  placeRef={placeRef}
                />
              ) : null}
              {step === 'details' ? (
                <StepDetails
                  form={form}
                  onForm={patch}
                  brandSuggestions={brandSuggestions}
                  areas={extraAreas}
                  onAddArea={(name) => setExtraAreas((previous) => (previous.includes(name) ? previous : [...previous, name]))}
                  knownDensity={known}
                  weight={attempted.details || !weight.error ? weight : { ...weight, error: null }}
                  brandRef={brandRef}
                />
              ) : null}
            </div>
            <PreviewPanel data={preview} />
          </div>
        )}
      </form>
    </Sheet>
  );
}
