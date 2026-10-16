import type { StockedProduct } from '@platlab/contracts';
import { PackagePlus, ShieldAlert, Tag } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useBrands, useReceiptLocations } from '../queries';
import { FormSheet, type SheetBaseProps } from '../../../app/form-sheet';
import { BottlesStepper } from './bottles-stepper';
import { Section } from '../../../app/form-section';
import { IngressStatus } from './ingress-status';
import { LabelFields } from './label-fields';
import { toPlaces } from '../../../app/places';
import { bottlesLabelOf } from './model';
import { readRecents } from './remembered';
import { reviewIngress } from './review';
import { SafetyFields } from './safety-fields';
import { StorageSection } from './storage-section';
import { useIngressEntry } from './use-ingress-entry';
import { useIngressLookup } from './use-ingress-lookup';
import { useIngressSubmit } from './use-ingress-submit';
import { WeightSection } from './weight-section';

/**
 * «Nuevo reactivo» (ADR 0015, ajuste del 13-10-2026; «Ingresar frascos» desde la ficha): un solo
 * formulario por secciones, cada una en su marco y todas visibles desde el inicio. En escritorio, hoja
 * ancha de dos columnas: «Datos de la etiqueta», «Control por peso» y «Dónde se guarda» a la izquierda
 * y «Clasificación y seguridad» en una tarjeta fija a la derecha; en el móvil, una columna con la
 * tarjeta al final. Un reactivo del catálogo se elige por su nombre; uno nuevo y las
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
  const [recents] = useState(() => readRecents(workspaceId));
  const entry = useIngressEntry(workspaceId, productId);
  const { initial, existing, draft, form, patch, patchDraft } = entry;
  const lookup = useIngressLookup(workspaceId, open, entry);
  const review = reviewIngress({ entry, canCreate, code: lookup.code });
  const nameRef = useRef<HTMLInputElement>(null);
  const casRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLInputElement>(null);

  const locations = useReceiptLocations(workspaceId, open);
  const brands = useBrands(workspaceId, open);
  const places = useMemo(() => toPlaces(locations.data?.items ?? []), [locations.data]);
  const submit = useIngressSubmit({ workspaceId, base, entry, lookup, review, places, bodyRef, countRef, onDone: () => onOpenChange(false) });
  const errors = submit.attempted ? review.issues : entry.serverErrors;
  const bottlesLabel = bottlesLabelOf(lookup.count);

  const pick = (product: StockedProduct) => {
    entry.choose(product);
    requestAnimationFrame(() => quantityRef.current?.focus());
  };

  return (
    <FormSheet
      flush
      wide="xl"
      fullWidthSubmit
      icon={PackagePlus}
      submitIcon={PackagePlus}
      title={productId ? 'Ingresar frascos' : 'Nuevo reactivo'}
      description="* Campos obligatorios"
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={`Ingresar ${bottlesLabel}`}
      submitDisabled={review.missingFields.length > 0}
      submitLead={<BottlesStepper value={form.count} onChange={(next) => patch({ count: next })} error={errors.count} inputRef={countRef} />}
      pending={submit.pending}
      generalError={submit.generalError}
      status={<IngressStatus missingFields={review.missingFields} toReview={review.toReview} bottlesLabel={bottlesLabel} bodyRef={bodyRef} />}
      initialFocus={initial ? quantityRef : nameRef}
      onSubmit={() => void submit.confirm()}
    >
      <div ref={bodyRef} className="grid gap-5 px-3 py-4 sm:px-5 sm:py-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid min-w-0 content-start gap-5">
          <Section icon={Tag} title="Datos de la etiqueta">
            <LabelFields
              existing={existing}
              products={products}
              results={lookup.results}
              recentIds={recents.products}
              draft={draft}
              onDraft={patchDraft}
              onName={entry.changeName}
              form={form}
              onForm={patch}
              code={lookup.code}
              codes={lookup.codes}
              brands={brands.data?.items ?? []}
              errors={errors}
              canCreate={canCreate && lookup.searched}
              nameRef={nameRef}
              casRef={casRef}
              quantityRef={quantityRef}
              onPick={pick}
              onCreate={() => requestAnimationFrame(() => casRef.current?.focus())}
            />
          </Section>

          <StorageSection
            workspaceId={workspaceId}
            open={open}
            area={form.area}
            onArea={(area) => patch({ area })}
            places={places}
            recentIds={recents.locations}
            canCreate={canCreate}
            canManageLists={canManageLists}
            error={errors.placeId}
            onPlace={(placeId) => patch({ placeId })}
            onServerErrors={entry.setServerErrors}
          />

          <WeightSection
            grossWeight={form.grossWeight}
            onGrossWeight={(grossWeight) => patch({ grossWeight })}
            density={entry.density}
            onDensity={entry.setDensity}
            volume={review.volume}
            tare={review.weight.tare}
            errors={errors}
          />
        </div>

        <Section card icon={ShieldAlert} title="Clasificación y seguridad">
          {existing || canCreate ? (
            <SafetyFields existing={existing} draft={draft} onDraft={patchDraft} errors={errors} compact />
          ) : (
            <p className="text-sm text-ink-muted">Elige un reactivo del catálogo: su clasificación y su ficha de seguridad vienen de allí.</p>
          )}
        </Section>
      </div>
    </FormSheet>
  );
}
