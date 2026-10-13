// Prototipo R-01D: solo interfaz
import type { StockedProduct } from '@platlab/contracts';
import { Button, Sheet, normalizeDecimalInput, toast } from '@platlab/ui';
import { CircleCheck, MapPin, PackagePlus, Scale, ShieldAlert, Tag } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { usePositions, useReceiptLocations } from '../queries';
import { checkCas } from './cas';
import { CostCenter } from './cost-center';
import { fieldGrid } from './filled';
import { Reveal, Section } from './form-section';
import { LabelFields } from './label-fields';
import { LocationPicker } from './location-picker';
import { pushRecent, readRemembered, writeRemembered } from './remembered';
import { SafetyFields } from './safety-fields';
import { knownDensity as densityOf, receiptWeight } from './weight';
import { WeightFields } from './weight-section';
import {
  casOptional,
  countOf,
  countValid,
  defaultAreas,
  emptyDraft,
  freeCodeIfTaken,
  newProductCode,
  nextCode,
  sampleBrands,
  takenSet,
  toPlaces,
  validateBottles,
  validateNew,
  type BottlesForm,
  type Draft,
  type Errors,
  type Place,
} from './wizard-model';

const initialForm: BottlesForm = {
  quantity: '',
  count: '1',
  code: null,
  placeId: '',
  noExpiry: false,
  expiresOn: '',
  brand: '',
  area: '',
  fullWeight: '',
  density: '',
};
const primary =
  'h-[44px] rounded-control bg-linear-to-r from-action to-action-deep px-5 text-sm font-bold shadow-md shadow-action/20 hover:from-action-hover hover:to-action-deep max-sm:flex-1 sm:h-10';

/**
 * «Ingresar reactivo» como un solo formulario de secciones planas (prototipo de R-01D, a la manera de
 * ReactiLab): «Datos de la etiqueta» al abrir; «Dónde se guarda», «Clasificación y seguridad» y
 * «Control por peso» se despliegan cuando el nombre tiene valor. No guarda nada: al confirmar cierra
 * y lo dice en un aviso.
 */
export function IngressSheet({
  workspaceId,
  open,
  onOpenChange,
  products,
  productId,
  canCreate,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: StockedProduct[];
  productId: string | undefined;
  canCreate: boolean;
}) {
  const initial = productId ? products.find((product) => product.id === productId) : undefined;
  const [remembered, setRemembered] = useState(() => readRemembered(workspaceId));
  const [existing, setExisting] = useState<StockedProduct | null>(initial ?? null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [form, setForm] = useState<BottlesForm>({ ...initialForm, area: remembered.area });
  const [localPlaces, setLocalPlaces] = useState<Place[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const casRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const locations = useReceiptLocations(workspaceId, open);
  const places = useMemo(() => [...toPlaces(locations.data?.items ?? []), ...localPlaces], [locations.data, localPlaces]);
  // Códigos reales de los frascos cargados: los del reactivo elegido numeran el siguiente y todos detectan choques.
  const ofProduct = usePositions(workspaceId, existing?.id, undefined, open && existing !== null);
  const allPositions = usePositions(workspaceId, undefined, undefined, open);
  const productCodes = useMemo(() => (ofProduct.data?.pages ?? []).flatMap((page) => page.items.flatMap((item) => (item.container ? [item.container.code] : []))), [ofProduct.data]);
  const taken = useMemo(
    () => takenSet([...productCodes, ...(allPositions.data?.pages ?? []).flatMap((page) => page.items.flatMap((item) => (item.container ? [item.container.code] : [])))]),
    [productCodes, allPositions.data],
  );

  const patch = (next: Partial<BottlesForm>) => setForm((previous) => ({ ...previous, ...next }));
  const patchDraft = (next: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...next }));

  const unit = existing ? existing.baseUnit : draft.unit;
  const name = existing ? existing.name : draft.name.trim();
  const quantity = normalizeDecimalInput(form.quantity);
  const count = countOf(form.count);
  const suggested = existing ? (ofProduct.isPending ? '' : (nextCode(productCodes) ?? newProductCode(existing.name))) : newProductCode(name);
  const code = form.code ?? suggested;
  const freeCode = freeCodeIfTaken(code, countValid(count) ? count : 1, taken);
  const known = existing ? densityOf(existing.casNumber) : null;
  const weight = receiptWeight({ unit, quantity, full: normalizeDecimalInput(form.fullWeight), density: normalizeDecimalInput(form.density), knownDensity: known });
  const extraAreas = remembered.extraAreas;
  const brands = [...new Set([...remembered.brands, ...sampleBrands])];

  // Aparición progresiva: las demás secciones salen cuando el nombre tiene valor y ya no se esconden.
  if (name !== '' && !revealed) setRevealed(true);
  const showRest = revealed;

  const newIssues: Errors = existing ? {} : validateNew(draft);
  const casMissing = !existing && !casOptional(draft) && checkCas(draft.cas) === 'empty';
  const newMissing = existing ? 0 : [!draft.name.trim(), !draft.state, casMissing].filter(Boolean).length;
  const catalogIssue = !existing && !canCreate && name !== '';
  const bottleIssues = validateBottles(form, quantity, form.placeId);
  const missing = newMissing + Object.keys(bottleIssues).length;
  const otherIssues = Object.keys(newIssues).length - newMissing + (catalogIssue ? 1 : 0) + (weight.error ? 1 : 0) + (freeCode ? 1 : 0);

  // El choque de códigos se avisa al escribir, sin esperar a confirmar.
  const codeError: Errors = freeCode ? { code: `Ya existe; libre: ${freeCode}` } : {};
  const errors: Errors = attempted
    ? {
        ...codeError,
        ...newIssues,
        ...(catalogIssue ? { name: 'Elige un reactivo del catálogo; no puedes crear uno nuevo.' } : {}),
        ...bottleIssues,
        ...(weight.error ? { weight: weight.error } : {}),
      }
    : codeError;

  const pick = (product: StockedProduct) => {
    setExisting(product);
    requestAnimationFrame(() => quantityRef.current?.focus());
  };
  const changeName = (text: string) => {
    setExisting(null);
    patchDraft({ name: text });
  };
  const createPlace = (placeName: string, parentId: string | null): Place => {
    const place: Place = { id: `local-${Date.now()}-${localPlaces.length}`, name: placeName, parentId, local: true };
    setLocalPlaces((previous) => [...previous, place]);
    return place;
  };

  const focusFirstInvalid = () =>
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });

  const confirm = () => {
    if (missing > 0 || otherIssues > 0) {
      setAttempted(true);
      return focusFirstInvalid();
    }
    const place = places.find((entry) => entry.id === form.placeId);
    if (!place || !countValid(count)) return;
    const area = form.area.trim();
    const next = {
      recentProducts: existing ? pushRecent(remembered.recentProducts, existing.id, 5) : remembered.recentProducts,
      recentLocations: place.local ? remembered.recentLocations : pushRecent(remembered.recentLocations, place.id, 3),
      brands: form.brand.trim() ? pushRecent(remembered.brands, form.brand.trim(), 8) : remembered.brands,
      area,
      extraAreas: area && !defaultAreas.includes(area) && !extraAreas.includes(area) ? [...extraAreas, area] : extraAreas,
    };
    writeRemembered(workspaceId, next);
    setRemembered(next);
    onOpenChange(false);
    toast(`${count} ${count === 1 ? 'frasco de' : 'frascos de'} ${name} ${count === 1 ? 'ingresado' : 'ingresados'} · Vista previa: no se guardó`, {
      action: { label: 'Imprimir etiquetas', onClick: () => toast('Vista previa: aún no se imprime nada') },
    });
  };

  const bottlesLabel = countValid(count) ? `${count} ${count === 1 ? 'frasco' : 'frascos'}` : 'frascos';
  const status =
    missing > 0 ? (
      <span>{missing === 1 ? 'Falta 1 campo' : `Faltan ${missing} campos`} *</span>
    ) : otherIssues > 0 ? (
      <span>
        Revisa {otherIssues} {otherIssues === 1 ? 'dato' : 'datos'}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-success">
        <CircleCheck className="size-4" aria-hidden />
        Listo: {bottlesLabel}
      </span>
    );
  const footer = (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
      <p role="status" className="min-w-0 basis-full text-[13px] font-medium text-ink-muted sm:flex-1 sm:basis-0">
        {status}
      </p>
      <Button variant="ghost" className="h-[44px] sm:h-10" onClick={() => onOpenChange(false)}>
        Cancelar
      </Button>
      <Button type="submit" form="form-ingresar-reactivo" variant="primary" className={primary}>
        Ingresar {bottlesLabel}
      </Button>
    </div>
  );

  return (
    <Sheet
      wide
      compact
      initialFocus={initial ? quantityRef : nameRef}
      icon={PackagePlus}
      title="Ingresar reactivo"
      description="* Campos obligatorios"
      open={open}
      onOpenChange={onOpenChange}
      footer={footer}
    >
      <form
        id="form-ingresar-reactivo"
        ref={formRef}
        noValidate
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return;
          // Los campos con sugerencias eligen con Enter y no envían nada; el resto confirma.
          if (event.target.closest('[data-no-submit]')) event.preventDefault();
          // El campo de fecha no envía el formulario con Enter por sí solo.
          else if (event.target.type === 'date') {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          confirm();
        }}
      >
        <p className="sr-only" role="status">
          {showRest ? 'Se mostraron las secciones Dónde se guarda, Clasificación y seguridad, y Control por peso.' : ''}
        </p>
        <div className="flex flex-col">
          <Section icon={Tag} title="Datos de la etiqueta" divided={false}>
            <LabelFields
              existing={existing}
              products={products}
              recentIds={remembered.recentProducts}
              draft={draft}
              onDraft={patchDraft}
              onName={changeName}
              form={form}
              onForm={patch}
              code={code}
              brands={brands}
              errors={errors}
              canCreate={canCreate}
              nameRef={nameRef}
              casRef={casRef}
              quantityRef={quantityRef}
              onPick={pick}
              onCreate={() => requestAnimationFrame(() => casRef.current?.focus())}
            />
          </Section>

          {showRest ? (
            <>
              <Reveal instant={initial !== undefined}>
                <Section icon={MapPin} title="Dónde se guarda">
                  <div className={fieldGrid}>
                    <LocationPicker
                      className="sm:col-span-2"
                      places={places}
                      recentIds={remembered.recentLocations}
                      onChange={(placeId) => patch({ placeId })}
                      canCreate={canCreate}
                      onCreate={createPlace}
                      error={errors.placeId}
                    />
                    <CostCenter value={form.area} extras={extraAreas} onChange={(area) => patch({ area })} />
                  </div>
                </Section>
              </Reveal>
              <Reveal instant={initial !== undefined}>
                <Section icon={ShieldAlert} title="Clasificación y seguridad">
                  <SafetyFields existing={existing} draft={draft} onDraft={patchDraft} errors={errors} />
                </Section>
              </Reveal>
              <Reveal instant={initial !== undefined}>
                <Section icon={Scale} title="Control por peso" badge="Opcional">
                  <WeightFields
                    full={form.fullWeight}
                    onFull={(fullWeight) => patch({ fullWeight })}
                    density={form.density}
                    onDensity={(density) => patch({ density })}
                    knownDensity={known}
                    volume={unit === 'mL' || unit === 'L'}
                    result={attempted || !weight.error ? weight : { ...weight, error: null }}
                  />
                </Section>
              </Reveal>
            </>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}
