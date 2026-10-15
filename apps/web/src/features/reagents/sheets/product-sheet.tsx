import { product as productSchema, updateProductRequest, type ProductDetail } from '@platlab/contracts';
import { Field, toast } from '@platlab/ui';
import { CircleCheck, PencilLine, Save, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { isApiError } from '../../../app/api';
import { commandErrorMessage, useCommand, useUploadSafetySheet } from '../commands';
import { checkCas } from '../ingress/cas';
import { FilledInput, fieldGrid, fieldLabel } from '../ingress/filled';
import { casRequired, catalogFields, draftOf, productUnits, sdsFileOf, validateDraft, type Draft, type Errors } from '../ingress/model';
import { SafetyFields } from '../ingress/safety-fields';
import { PillField } from '../pills';
import { warnSheetNotUploaded } from '../sds';
import { type SheetBaseProps, FormSheet } from './shared';

/** Las unidades admitidas y, si es otra (un reactivo anterior: mg, u…), también la suya, para mostrarla. */
const unitOptions = (unit: string) =>
  (productUnits.some((entry) => entry === unit) ? productUnits : [unit, ...productUnits]).map((entry) => ({ value: entry, label: entry }));

/**
 * Editar la ficha (ADR 0015), solo con el permiso de catálogo: nombre, CAS, estado, peligros,
 * controlado, ficha de seguridad (enlace o PDF, ADR 0017) y densidad. La unidad cambia solo mientras el reactivo no tenga
 * movimientos. Se envían solo los campos que cambiaron: la unidad, solo si se eligió otra.
 */
export function ProductSheet({ workspaceId, open, onOpenChange, product }: SheetBaseProps & { product: ProductDetail }) {
  const command = useCommand(workspaceId, `/products/${product.id}`, productSchema, 'PATCH');
  const uploadSheet = useUploadSafetySheet(workspaceId);
  const [initial] = useState(() => draftOf(product));
  const [draft, setDraft] = useState<Draft>(initial);
  const [attempted, setAttempted] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  // El servidor responde que el nombre ya es de otro reactivo: se muestra en «Nombre» hasta cambiarlo.
  const [nameTaken, setNameTaken] = useState<string | null>(null);
  const patchDraft = (next: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...next }));

  const before = catalogFields(initial);
  const after = catalogFields(draft);
  const changes = Object.fromEntries(
    Object.entries(after).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(before[key as keyof typeof before])),
  );
  // Como el servidor: el CAS obligatorio se exige solo si cambian el CAS o el estado.
  const issues: Errors = validateDraft(draft, { cas: 'casNumber' in changes || 'physicalState' in changes });
  const errors: Errors = { ...(attempted ? issues : {}), ...(nameTaken ? { name: nameTaken } : {}) };
  const cas = checkCas(draft.cas);

  const submit = async () => {
    setGeneralError(null);
    if (Object.keys(issues).length > 0) return setAttempted(true);
    const sheet = sdsFileOf(draft);
    const hasChanges = Object.keys(changes).length > 0;
    if (!hasChanges && !sheet) return onOpenChange(false);
    const parsed = hasChanges ? updateProductRequest.safeParse(changes) : null;
    if (parsed && !parsed.success) return setGeneralError(parsed.error.issues[0]?.message ?? 'Revisa los datos de la ficha.');
    try {
      const saved = parsed ? await command.mutateAsync(parsed.data) : product;
      if (sheet) {
        const upload = uploadSheet.mutateAsync({ productId: product.id, file: sheet });
        // Con datos ya guardados, un fallo del PDF solo se avisa; sin ellos, el error se queda en la hoja.
        await (parsed ? upload.catch(warnSheetNotUploaded) : upload);
      }
      toast.success('Ficha actualizada', { description: saved.name });
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error, 'NAME_TAKEN')) setNameTaken(error.message);
      else setGeneralError(commandErrorMessage(error));
    }
  };

  return (
    <FormSheet
      sections
      wide
      fullWidthSubmit
      submitIcon={Save}
      icon={PencilLine}
      title="Editar reactivo"
      description="* Campos obligatorios"
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Guardar cambios"
      pending={command.isPending || uploadSheet.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <div className="grid gap-4">
        <div className={fieldGrid}>
          <Field label="Nombre" required labelClassName={fieldLabel} error={errors.name} className="sm:col-span-2">
            <FilledInput
              autoComplete="off"
              value={draft.name}
              onChange={(event) => {
                patchDraft({ name: event.target.value });
                setNameTaken(null);
              }}
            />
          </Field>
          <Field label="CAS" required={casRequired(draft.state)} labelClassName={fieldLabel} error={errors.cas}>
            <div className="relative">
              <FilledInput
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                placeholder="7647-14-5"
                className="pr-9 tabular-nums"
                aria-invalid={cas === 'invalid' || errors.cas ? true : undefined}
                value={draft.cas}
                onChange={(event) => patchDraft({ cas: event.target.value })}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                {cas === 'valid' ? (
                  <CircleCheck className="size-4 text-success" role="img" aria-label="CAS válido" />
                ) : cas === 'invalid' ? (
                  <TriangleAlert className="size-4 text-danger" role="img" aria-label="CAS no válido: revisa el dígito de control" />
                ) : null}
              </span>
            </div>
          </Field>
          <PillField
            label="Unidad"
            labelClassName={fieldLabel}
            size="sm"
            value={draft.unit}
            options={unitOptions(initial.unit)}
            onChange={(unit) => patchDraft({ unit })}
            disabled={!product.unitEditable}
            hint={product.unitEditable ? undefined : 'No cambia: el reactivo ya tiene movimientos.'}
          />
        </div>
        <SafetyFields existing={null} sdsFileUrl={product.sdsFileUrl} draft={draft} onDraft={patchDraft} errors={errors} withDensity />
      </div>
    </FormSheet>
  );
}
