import { location, receiptRequest, receiptResponse, type StockedProduct } from '@platlab/contracts';
import { normalizeDecimalInput, toDecimalInput, toast } from '@platlab/ui';
import { CircleCheck, MapPin, PackagePlus, Scale, ShieldAlert, Tag } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { isApiError } from '../../../app/api';
import { ChoiceField } from '../choices';
import { commandErrorMessage, useCommand } from '../commands';
import { useAreas, useBrands, useCodeSuggestion, useProduct, useProductSearch, useReceiptLocations } from '../queries';
import { FormSheet, type SheetBaseProps } from '../sheets/shared';
import { useDebouncedValue } from '../use-media-query';
import { isVolume } from '../weight';
import { fieldLabel } from './filled';
import { Reveal, Section } from './form-section';
import { LabelFields } from './label-fields';
import { LocationPicker } from './location-picker';
import {
  casRequired,
  catalogFields,
  countOf,
  countValid,
  emptyBottles,
  emptyDraft,
  levelOneOf,
  receiptTare,
  seriesOf,
  toPlaces,
  validateBottles,
  validateDraft,
  type BottlesForm,
  type Draft,
  type Errors,
  type Place,
} from './model';
import { readRecents, rememberRecents } from './remembered';
import { SafetyFields } from './safety-fields';
import { WeightFields } from './weight-section';

const densityInput = (product: StockedProduct | undefined | null) => (product?.density ? toDecimalInput(product.density) : '');

/** Lo más largo que busca el servidor; un nombre más largo se busca por su principio. */
/** Obligatorios que pueden faltar: su nombre en el pie y el orden en que se ven en la hoja. */
const missingLabels = { name: 'Nombre', cas: 'CAS', quantity: 'Cantidad', placeId: 'Ubicación', state: 'Estado físico' } as const;
const missingOrder = ['name', 'cas', 'quantity', 'placeId', 'state'] as const;
const MAX_SEARCH = 100;
const MIN_SEARCH = 2;

/**
 * «Ingresar reactivo» (ADR 0015): un solo formulario por secciones, a la manera de ReactiLab. «Datos
 * de la etiqueta» al abrir; «Control por peso», «Dónde se guarda» y «Clasificación y seguridad» se
 * despliegan al escribir el nombre. Un reactivo del catálogo se elige por su nombre; uno nuevo y las
 * ubicaciones nuevas solo los crea quien administra el catálogo. El nombre se busca en el servidor
 * (todo el catálogo, no solo lo cargado); la lista cargada solo da los recientes. El servidor numera
 * los códigos, calcula la tara y decide; la ventana no anticipa existencias.
 */
export function IngressSheet({
  workspaceId,
  open,
  onOpenChange,
  products,
  productId,
  canCreate,
  canManageLists,
  base,
}: SheetBaseProps & {
  /** La lista ya cargada: de ella salen los recientes. */
  products: StockedProduct[];
  /** Desde la ficha: su reactivo viene elegido. */
  productId: string | undefined;
  /** Crear reactivos y ubicaciones: `reagents.catalog.manage`. */
  canCreate: boolean;
  canManageLists: boolean;
  base: string;
}) {
  const navigate = useNavigate();
  // La ficha ya cargó su reactivo: suele venir de la caché, así que está desde la primera vista.
  const preset = useProduct(workspaceId, productId ?? '', productId !== undefined).data;
  const [initial] = useState(preset);
  const [recents] = useState(() => readRecents(workspaceId));
  const [existing, setExisting] = useState<StockedProduct | null>(initial ?? null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [form, setForm] = useState<BottlesForm>(() => ({ ...emptyBottles, density: densityInput(initial) }));
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(initial !== undefined);
  // Si no estaba en caché, se elige al llegar, salvo que ya se haya escrito o elegido otro.
  const [presetPending, setPresetPending] = useState(productId !== undefined && initial === undefined);
  if (presetPending && preset) {
    setPresetPending(false);
    if (!existing && draft.name === '') {
      setExisting(preset);
      setForm((previous) => ({ ...previous, code: null, density: densityInput(preset) }));
    }
  }
  const [generalError, setGeneralError] = useState<string | null>(null);
  // Lo que respondió el servidor (nombre o código ocupado, ubicación no creada): se borra al cambiar los datos.
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const casRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const receipt = useCommand(workspaceId, '/receipts', receiptResponse);
  const createLocation = useCommand(workspaceId, '/locations', location);
  const locations = useReceiptLocations(workspaceId, open);
  const brands = useBrands(workspaceId, open);
  const areas = useAreas(workspaceId, open);
  const places = useMemo(() => toPlaces(locations.data?.items ?? []), [locations.data]);

  const unit = existing ? existing.baseUnit : draft.unit;
  const name = existing ? existing.name : draft.name.trim();
  const count = countOf(form.count);
  // El servidor sugiere la serie libre: la del reactivo elegido o una nueva a partir del nombre.
  const typedName = useDebouncedValue(name, 300);
  const suggestion = useCodeSuggestion(
    workspaceId,
    existing ? { productId: existing.id } : typedName ? { name: typedName } : null,
    countValid(count) ? count : 1,
    open && form.code === null,
  );
  const code = form.code ?? (name ? (suggestion.data?.codes[0] ?? '') : '');
  // El buscador: lo escrito, con espera breve. «Crear» espera a la respuesta de lo escrito, para no
  // ofrecerlo mientras llega un reactivo que ya se llama así.
  const typing = existing ? '' : name.slice(0, MAX_SEARCH);
  const term = existing ? '' : typedName.slice(0, MAX_SEARCH);
  const search = useProductSearch(workspaceId, term, open);
  const results = typing.length >= MIN_SEARCH ? (search.data?.items ?? []) : null;
  const searched = typing.length < MIN_SEARCH || (term === typing && (search.isError || (search.isSuccess && !search.isPlaceholderData)));
  const codes = seriesOf(code, count);
  const volume = isVolume(unit);
  // La densidad de un reactivo nuevo va a su ficha; la de uno existente, solo a estos frascos.
  const density = existing ? form.density : draft.density;
  const weight = receiptTare({
    unit,
    quantity: normalizeDecimalInput(form.quantity),
    grossWeight: normalizeDecimalInput(form.grossWeight),
    density: normalizeDecimalInput(density),
  });

  // Aparición progresiva: las demás secciones salen cuando el nombre tiene valor y ya no se esconden.
  if (name !== '' && !revealed) setRevealed(true);

  const creating = !existing && canCreate;
  const catalogIssues: Errors = existing
    ? {}
    : creating
      ? validateDraft(draft)
      : { name: name ? 'Elige un reactivo del catálogo: tu rol no crea reactivos nuevos.' : 'Elige un reactivo del catálogo.' };
  const issues: Errors = { ...catalogIssues, ...validateBottles(form, code), ...weight.errors, ...serverErrors };
  // Los obligatorios vacíos se cuentan como «faltan»; el resto de errores, como datos por revisar.
  const empty = new Set<keyof Errors>();
  if (!name || (!existing && !canCreate)) empty.add('name');
  if (creating && !draft.state) empty.add('state');
  if (creating && casRequired(draft.state) && !draft.cas.trim()) empty.add('cas');
  if (!form.quantity.trim()) empty.add('quantity');
  if (!form.placeId) empty.add('placeId');
  // Lo que falta, con su nombre y en el orden en que se ve la hoja.
  const missingFields = missingOrder.filter((key) => empty.has(key));
  const missing = missingFields.length;
  const toReview = (Object.keys(issues) as Array<keyof Errors>).filter((key) => issues[key] && !empty.has(key)).length;
  const errors = attempted ? issues : serverErrors;

  const patch = (next: Partial<BottlesForm>) => {
    setForm((previous) => ({ ...previous, ...next }));
    setServerErrors({});
  };
  const patchDraft = (next: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...next }));

  const pick = (product: StockedProduct) => {
    setExisting(product);
    patch({ code: null, density: densityInput(product) });
    requestAnimationFrame(() => quantityRef.current?.focus());
  };
  const changeName = (text: string) => {
    setExisting(null);
    patchDraft({ name: text });
    setServerErrors({});
  };

  const createPlace = async (placeName: string, parentId: string | null): Promise<Place | null> => {
    try {
      const created = await createLocation.mutateAsync({ name: placeName, parentId });
      setServerErrors({});
      return { id: created.id, name: created.name, parentId: created.parentId };
    } catch (error) {
      setServerErrors({ placeId: commandErrorMessage(error) });
      return null;
    }
  };

  const confirm = async () => {
    setGeneralError(null);
    if (missing > 0 || toReview > 0) {
      setAttempted(true);
      requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const grossWeight = normalizeDecimalInput(form.grossWeight);
    const parsed = receiptRequest.safeParse({
      ...(existing ? { productId: existing.id } : { newProduct: catalogFields(draft) }),
      brand: form.brand.trim() || null,
      expiresOn: !form.noExpiry && form.expiresOn ? form.expiresOn : null,
      quantity: normalizeDecimalInput(form.quantity),
      unit,
      codes,
      area: form.area.trim() || null,
      locationId: form.placeId,
      // Uno nuevo pesa con la densidad de su ficha; uno existente, con la escrita para estos frascos.
      weight: weight.tare ? { grossWeight, density: existing && volume ? normalizeDecimalInput(density) : null } : null,
    });
    if (!parsed.success) {
      setGeneralError(parsed.error.issues[0]?.message ?? 'Revisa los datos del ingreso.');
      return;
    }
    try {
      const result = await receipt.mutateAsync(parsed.data);
      rememberRecents(workspaceId, { productId: result.product.id, locationId: levelOneOf(places, form.placeId) });
      const received = result.containers;
      toast.success(received.length === 1 ? 'Frasco ingresado' : `${received.length} frascos ingresados`, {
        description: `${result.product.name} · ${received.map((container) => container.code).join(', ')}`,
        // Las etiquetas con QR de los frascos recién ingresados, a un clic (ADR 0012, entrega 4).
        action: {
          label: 'Imprimir etiquetas',
          onClick: () =>
            navigate(`${base}/inventario/${result.product.id}/etiquetas?frascos=${received.map((container) => container.containerId).join(',')}`),
        },
      });
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error, 'NAME_TAKEN')) setServerErrors({ name: error.message });
      else if (isApiError(error, 'CODE_TAKEN')) {
        setServerErrors({ code: commandErrorMessage(error) });
        if (form.code === null) void suggestion.refetch();
      } else setGeneralError(commandErrorMessage(error));
    }
  };

  /** Lleva el foco al primer campo que falta: la etiqueta apunta a su control. */
  const focusMissing = () => {
    const first = missingFields[0];
    if (!first) return;
    const wanted = missingLabels[first];
    const label = Array.from(bodyRef.current?.querySelectorAll('label') ?? []).find((node) => node.textContent?.trim().startsWith(wanted));
    const target = label?.htmlFor ? document.getElementById(label.htmlFor) : null;
    target?.focus();
  };
  const bottlesLabel = countValid(count) ? `${count} ${count === 1 ? 'frasco' : 'frascos'}` : 'frascos';
  const status =
    missing > 0 ? (
      missing > 2 ? (
        <button
          type="button"
          onClick={focusMissing}
          className="-my-2 inline-flex min-h-[44px] items-center rounded-[6px] font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:text-action hover:decoration-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-0 sm:py-2"
        >
          Faltan {missing} campos
        </button>
      ) : (
        <span>
          {missing === 1 ? 'Falta' : 'Faltan'}: {missingFields.map((key) => missingLabels[key]).join(', ')}
        </span>
      )
    ) : toReview > 0 ? (
      <span>
        Revisa {toReview} {toReview === 1 ? 'dato' : 'datos'}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-success">
        <CircleCheck className="size-4" aria-hidden />
        Listo: {bottlesLabel}
      </span>
    );

  return (
    <FormSheet
      flush
      wide
      fullWidthSubmit
      icon={PackagePlus}
      submitIcon={PackagePlus}
      title="Ingresar reactivo"
      description="* Campos obligatorios"
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={`Ingresar ${bottlesLabel}`}
      submitDisabled={missing > 0}
      pending={receipt.isPending}
      generalError={generalError}
      status={status}
      initialFocus={initial ? quantityRef : nameRef}
      onSubmit={() => void confirm()}
    >
      <div ref={bodyRef} className="flex flex-col">
        <p className="sr-only" role="status">
          {revealed ? 'Se mostraron las secciones Control por peso, Dónde se guarda y Clasificación y seguridad.' : ''}
        </p>
        <Section icon={Tag} title="Datos de la etiqueta" divided={false}>
          <LabelFields
            existing={existing}
            products={products}
            results={results}
            recentIds={recents.products}
            draft={draft}
            onDraft={patchDraft}
            onName={changeName}
            form={form}
            onForm={patch}
            code={code}
            codes={codes}
            brands={brands.data?.items ?? []}
            errors={errors}
            canCreate={canCreate && searched}
            nameRef={nameRef}
            casRef={casRef}
            quantityRef={quantityRef}
            onPick={pick}
            onCreate={() => requestAnimationFrame(() => casRef.current?.focus())}
          />
        </Section>

        {revealed ? (
          <>
            <Reveal instant={initial !== undefined}>
              <Section icon={Scale} title="Control por peso" badge="Opcional">
                <WeightFields
                  grossWeight={form.grossWeight}
                  onGrossWeight={(grossWeight) => patch({ grossWeight })}
                  density={density}
                  onDensity={(value) => (existing ? patch({ density: value }) : patchDraft({ density: value }))}
                  volume={volume}
                  tare={weight.tare}
                  errors={errors}
                />
              </Section>
            </Reveal>
            <Reveal instant={initial !== undefined}>
              <Section icon={MapPin} title="Dónde se guarda">
                <div className="grid gap-3">
                  <ChoiceField
                    workspaceId={workspaceId}
                    label="Área o departamento"
                    labelClassName={fieldLabel}
                    options={areas.data?.items ?? []}
                    loading={areas.isPending}
                    value={form.area}
                    onChange={(area) => patch({ area })}
                    canAdd={canManageLists}
                    addPath="/areas"
                    addBody={(entry) => ({ name: entry })}
                    addLabel="Nueva área"
                  />
                  <LocationPicker
                    places={places}
                    recentIds={recents.locations}
                    onChange={(placeId) => patch({ placeId })}
                    canCreate={canCreate}
                    onCreate={createPlace}
                    error={errors.placeId}
                  />
                </div>
              </Section>
            </Reveal>
            {existing || canCreate ? (
              <Reveal instant={initial !== undefined}>
                <Section icon={ShieldAlert} title="Clasificación y seguridad">
                  <SafetyFields existing={existing} draft={draft} onDraft={patchDraft} errors={errors} />
                </Section>
              </Reveal>
            ) : null}
          </>
        ) : null}
      </div>
    </FormSheet>
  );
}
