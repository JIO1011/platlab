import { product as productSchema, updateProductRequest, type ProductDetail } from '@platlab/contracts';
import { Field, Select, toast } from '@platlab/ui';
import { CircleCheck, PencilLine, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { commandErrorMessage, useCommand } from '../commands';
import { checkCas } from '../ingress/cas';
import { FilledInput, fieldGrid, fieldLabel, filled } from '../ingress/filled';
import { casRequired, catalogFields, draftOf, productUnits, validateDraft, type Draft, type Errors } from '../ingress/model';
import { SafetyFields } from '../ingress/safety-fields';
import { type SheetBaseProps, FormSheet } from './shared';

const unitOptions = productUnits.map((unit) => ({ value: unit, label: unit }));

/**
 * Editar la ficha (ADR 0015), solo con el permiso de catálogo: nombre, CAS, estado, peligros,
 * controlado, ficha de seguridad y densidad. La unidad cambia solo mientras el reactivo no tenga
 * movimientos. Se envían solo los campos que cambiaron.
 */
export function ProductSheet({ workspaceId, open, onOpenChange, product }: SheetBaseProps & { product: ProductDetail }) {
  const command = useCommand(workspaceId, `/products/${product.id}`, productSchema, 'PATCH');
  const [initial] = useState(() => draftOf(product));
  const [draft, setDraft] = useState<Draft>(initial);
  const [attempted, setAttempted] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const patchDraft = (next: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...next }));

  const before = catalogFields(initial);
  const after = catalogFields(draft);
  const changes = Object.fromEntries(
    Object.entries(after).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(before[key as keyof typeof before])),
  );
  // Como el servidor: el CAS obligatorio se exige solo si cambian el CAS o el estado.
  const issues: Errors = validateDraft(draft, { cas: 'casNumber' in changes || 'physicalState' in changes });
  const errors = attempted ? issues : {};
  const cas = checkCas(draft.cas);

  const submit = async () => {
    setGeneralError(null);
    if (Object.keys(issues).length > 0) return setAttempted(true);
    if (Object.keys(changes).length === 0) return onOpenChange(false);
    const parsed = updateProductRequest.safeParse(changes);
    if (!parsed.success) return setGeneralError(parsed.error.issues[0]?.message ?? 'Revisa los datos de la ficha.');
    try {
      const result = await command.mutateAsync(parsed.data);
      toast.success('Ficha actualizada', { description: result.name });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(commandErrorMessage(error));
    }
  };

  return (
    <FormSheet
      compact
      icon={PencilLine}
      title="Editar reactivo"
      description="* Campos obligatorios"
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Guardar cambios"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <div className="grid gap-4">
        <div className={fieldGrid}>
          <Field label="Nombre" required labelClassName={fieldLabel} error={errors.name} className="sm:col-span-2">
            <FilledInput autoComplete="off" value={draft.name} onChange={(event) => patchDraft({ name: event.target.value })} />
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
          <Field
            label="Unidad"
            labelClassName={fieldLabel}
            hint={product.unitEditable ? undefined : 'No cambia: el reactivo ya tiene movimientos.'}
          >
            <Select
              value={draft.unit}
              onValueChange={(unit) => patchDraft({ unit: productUnits.find((entry) => entry === unit) ?? draft.unit })}
              options={unitOptions}
              placeholder="Elige la unidad"
              disabled={!product.unitEditable}
              triggerClassName={filled}
            />
          </Field>
        </div>
        <SafetyFields existing={null} draft={draft} onDraft={patchDraft} errors={errors} withDensity />
      </div>
    </FormSheet>
  );
}
