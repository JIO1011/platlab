// Prototipo R-01D: solo interfaz
import type { StockedProduct } from '@platlab/contracts';
import { Button, Sheet, normalizeDecimalInput, toast } from '@platlab/ui';
import { Boxes, CircleCheck, FlaskConical, Info, PackagePlus, Scale } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReceiptLocations } from '../queries';
import { BottlesFields } from './bottles-fields';
import { sampleOf } from './catalog-sample';
import { ControlledMark, isControlled } from './controlled';
import { FormSection, Reveal } from './form-section';
import { HazardGlyphs, HazardTags } from './hazards';
import { MoreFields } from './more-fields';
import { NewProductFields } from './new-product-fields';
import { ProductSearch } from './product-search';
import { pushRecent, readRemembered, writeRemembered } from './remembered';
import { knownDensity as densityOf, receiptWeight } from './weight';
import { WeightFields } from './weight-section';
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
} from './wizard-model';

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
const primary =
  'h-[44px] rounded-control bg-linear-to-r from-action to-action-deep px-5 text-sm font-bold shadow-md shadow-action/20 hover:from-action-hover hover:to-action-deep max-sm:flex-1 sm:h-10';
/** Lo que dura el despliegue de una sección (ms); el foco y el desplazamiento esperan a que termine. */
const REVEAL_MS = 220;

/**
 * «Ingresar reactivo» como un solo formulario compacto (prototipo de R-01D, a la manera de
 * ReactiLab): «Reactivo» al abrir; «Frascos» se despliega al tener reactivo; «Más datos» y
 * «Control por peso» (opcionales, plegados) aparecen al completar lo obligatorio. No guarda nada:
 * al confirmar cierra y lo dice en un aviso.
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
  const [selection, setSelection] = useState<Selection>(initial ? { kind: 'existing', product: initial } : null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [form, setForm] = useState<BottlesForm>({ ...initialForm, area: remembered.area });
  const [extraAreas, setExtraAreas] = useState(remembered.extraAreas);
  const [localPlaces, setLocalPlaces] = useState<Place[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [productOpen, setProductOpen] = useState(!initial);
  const [bottlesOpen, setBottlesOpen] = useState(true);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreLatched, setMoreLatched] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);
  const bottlesRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const locations = useReceiptLocations(workspaceId, open);
  const places = useMemo(() => [...toPlaces(locations.data?.items ?? []), ...localPlaces], [locations.data, localPlaces]);
  const recentPlaces = remembered.recentLocations.flatMap((id) => places.filter((place) => place.id === id));
  const recentProducts = remembered.recentProducts.flatMap((id) => products.filter((product) => product.id === id));

  const patch = (next: Partial<BottlesForm>) => setForm((previous) => ({ ...previous, ...next }));
  const patchDraft = (next: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...next }));

  const existing = selection?.kind === 'existing' ? selection.product : null;
  const unit = existing ? existing.baseUnit : draft.unit;
  const name = existing ? existing.name : draft.name.trim();
  const quantity = normalizeDecimalInput(form.quantity);
  const count = countOf(form.count);
  const known = existing ? densityOf(existing.casNumber) : null;
  const weight = receiptWeight({ unit, quantity, full: normalizeDecimalInput(form.fullWeight), density: normalizeDecimalInput(form.density), knownDensity: known });
  const place = places.find((entry) => entry.id === form.placeId);
  const brandSuggestions = [...new Set([...remembered.brands, ...sampleBrands])].slice(0, 5);

  const newIssues = selection?.kind === 'new' ? validateNew(draft) : {};
  const productMissing = selection === null ? 1 : existing ? 0 : [!draft.name.trim(), !draft.unit, !draft.state].filter(Boolean).length;
  const bottleIssues = validateBottles(form, quantity, place ? place.id : '');
  const missing = productMissing + Object.keys(bottleIssues).length;
  const otherIssues = (selection?.kind === 'new' ? Object.keys(newIssues).length - productMissing : 0) + (weight.error ? 1 : 0);

  // Aparición progresiva: «Frascos» con reactivo; las opcionales, una vez completo lo obligatorio.
  const showBottles = existing !== null || (selection?.kind === 'new' && productMissing === 0);
  if (showBottles && Object.keys(bottleIssues).length === 0 && !moreLatched) setMoreLatched(true);
  const showMore = showBottles && moreLatched;

  const errors: Errors = attempted ? { ...newIssues, ...bottleIssues, ...(weight.error ? { weight: weight.error } : {}) } : {};
  const searchError = attempted && selection === null ? 'Elige un reactivo o créalo si no está en el catálogo.' : undefined;

  // Al desplegarse «Frascos» se lleva a la vista y, si se eligió un reactivo existente, recibe el foco.
  // Con un reactivo nuevo el foco no se mueve solo: cambiaría el contexto mientras se eligen opciones.
  const wasShown = useRef(showBottles);
  useEffect(() => {
    if (showBottles && !wasShown.current) {
      const timer = window.setTimeout(() => {
        if (existing) quantityRef.current?.focus({ preventScroll: true });
        const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        bottlesRef.current?.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
      }, REVEAL_MS);
      wasShown.current = showBottles;
      return () => window.clearTimeout(timer);
    }
    wasShown.current = showBottles;
    return undefined;
  }, [showBottles, existing]);

  const pick = (product: StockedProduct) => {
    setSelection({ kind: 'existing', product });
    setProductOpen(false);
  };
  const create = (text: string) => {
    setSelection({ kind: 'new' });
    patchDraft({ name: text });
    setProductOpen(true);
    requestAnimationFrame(() => nameRef.current?.focus());
  };
  const change = () => {
    setSelection(null);
    setDraft(emptyDraft);
    setMoreLatched(false);
    setProductOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const focusFirstInvalid = () =>
    requestAnimationFrame(() => {
      const target = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      (target?.getAttribute('role') === 'radiogroup' ? target.querySelector<HTMLElement>('input') : target)?.focus();
    });

  const confirm = () => {
    const productBlocked = productMissing > 0 || Object.keys(newIssues).length > 0;
    if (productBlocked || Object.keys(bottleIssues).length > 0 || weight.error) {
      setAttempted(true);
      if (Object.keys(bottleIssues).length > 0) setBottlesOpen(true);
      if (productBlocked) setProductOpen(true);
      else if (Object.keys(bottleIssues).length === 0 && weight.error) patch({ weightOpen: true });
      return focusFirstInvalid();
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
    onOpenChange(false);
    toast(`${count} ${count === 1 ? 'frasco de' : 'frascos de'} ${name} ${count === 1 ? 'ingresado' : 'ingresados'} · Vista previa: no se guardó`, {
      action: { label: 'Imprimir etiquetas', onClick: () => toast('Vista previa: aún no se imprime nada') },
    });
  };

  const bottlesLabel = countValid(count) ? `${count} ${count === 1 ? 'frasco' : 'frascos'}` : 'frascos';
  const status =
    missing > 0 ? (
      <span>
        {missing === 1 ? 'Falta 1 campo' : `Faltan ${missing} campos`} *
      </span>
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
      initialFocus={initial ? quantityRef : searchRef}
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
          // Buscar, nombrar y marcar peligros no envía nada: solo el resto de campos confirma con Enter.
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
          {showBottles ? 'Se abrió la sección Frascos.' : ''}
          {showMore ? ' Hay secciones opcionales: Más datos y Control por peso.' : ''}
        </p>
        <div className="flex flex-col">
          <FormSection
            icon={FlaskConical}
            title="Reactivo"
            required
            open={productOpen}
            onToggle={() => setProductOpen(!productOpen)}
            summary={
              selection === null ? null : (
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-ink">{name || 'Reactivo nuevo'}</span>
                  {existing && isControlled(existing.code) ? <ControlledMark /> : null}
                  {selection.kind === 'new' && draft.controlled ? <ControlledMark /> : null}
                  <span className="truncate">
                    {existing ? `${existing.casNumber ?? 'sin CAS'} · ${existing.baseUnit}` : [draft.cas.trim(), draft.unit].filter(Boolean).join(' · ')}
                  </span>
                  <HazardGlyphs ids={existing ? sampleOf(existing.casNumber).hazards : draft.hazards} />
                </span>
              )
            }
            actions={
              selection === null ? undefined : (
                <Button size="sm" variant="ghost" className="shrink-0 bg-surface max-sm:h-[44px]" onClick={change}>
                  Cambiar
                </Button>
              )
            }
          >
            <div data-no-submit="">
              {selection === null ? (
                <ProductSearch products={products} recents={recentProducts} canCreate={canCreate} searchRef={searchRef} error={searchError} onPick={pick} onCreate={create} />
              ) : existing ? (
                <div className="grid gap-2">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink">
                    <span className="font-semibold">{existing.name}</span>
                    {isControlled(existing.code) ? <ControlledMark withText /> : null}
                    <span className="text-[13px] text-ink-muted">
                      {existing.casNumber ?? 'sin CAS'} · {existing.baseUnit}
                    </span>
                  </p>
                  <HazardTags ids={sampleOf(existing.casNumber).hazards} />
                </div>
              ) : (
                <NewProductFields
                  draft={draft}
                  onDraft={patchDraft}
                  errors={errors}
                  nameRef={nameRef}
                  securityOpen={securityOpen}
                  onSecurityToggle={() => setSecurityOpen(!securityOpen)}
                />
              )}
            </div>
          </FormSection>

          {showBottles ? (
            <div ref={bottlesRef}>
              <Reveal instant={initial !== undefined}>
                <FormSection
                  icon={Boxes}
                  title="Frascos"
                  required
                  open={bottlesOpen}
                  onToggle={() => setBottlesOpen(!bottlesOpen)}
                  summary={countValid(count) ? `${count} ${count === 1 ? 'frasco' : 'frascos'} de ${form.quantity.trim() || '…'} ${unit}` : undefined}
                >
                  <BottlesFields
                    form={form}
                    onForm={patch}
                    unit={unit}
                    name={name}
                    errors={errors}
                    places={places}
                    recentPlaces={recentPlaces}
                    canCreatePlace={canCreate}
                    onCreatePlace={(placeName, parentId) => {
                      const parent = places.find((entry) => entry.id === parentId);
                      const created: Place = { id: `local-${Date.now()}`, name: placeName, route: parent ? `${parent.route} › ${placeName}` : placeName, local: true };
                      setLocalPlaces((previous) => [...previous, created]);
                      patch({ placeId: created.id });
                    }}
                    quantityRef={quantityRef}
                    placeRef={placeRef}
                  />
                </FormSection>
              </Reveal>
            </div>
          ) : null}

          {showMore ? (
            <>
              <Reveal>
                <FormSection icon={Info} title="Más datos" optional open={moreOpen} onToggle={() => setMoreOpen(!moreOpen)} summary="Marca, lote y área o departamento">
                  <MoreFields form={form} onForm={patch} brandSuggestions={brandSuggestions} areas={extraAreas} onAddArea={(area) => setExtraAreas((previous) => (previous.includes(area) ? previous : [...previous, area]))} />
                </FormSection>
              </Reveal>
              <Reveal>
                <FormSection
                  icon={Scale}
                  title="Control por peso"
                  optional
                  open={form.weightOpen}
                  onToggle={() => patch({ weightOpen: !form.weightOpen })}
                  summary="Peso lleno y densidad para la tara"
                >
                  <WeightFields
                    full={form.fullWeight}
                    onFull={(fullWeight) => patch({ fullWeight })}
                    density={form.density}
                    onDensity={(density) => patch({ density })}
                    knownDensity={known}
                    result={attempted || !weight.error ? weight : { ...weight, error: null }}
                  />
                </FormSection>
              </Reveal>
            </>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}
