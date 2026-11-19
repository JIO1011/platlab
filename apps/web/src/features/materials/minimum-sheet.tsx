import { setMaterialMinimumRequest } from '@platlab/contracts';
import { Field, Input, toast } from '@platlab/ui';
import { BellRing } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { materialsErrorMessage, useSetMinimum } from './commands';
import { normalizeQuantity } from './text';

/** «Mínimo» de un material (Administrador): bajo esta existencia el material avisa «Bajo mínimo». Vacío lo quita. */
export function MinimumSheet({
  workspaceId,
  open,
  onOpenChange,
  productId,
  name,
  unit,
  minimum,
}: SheetBaseProps & { productId: string; name: string; unit: string; minimum: string | null }) {
  const setMinimum = useSetMinimum(workspaceId, productId);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { minimum: minimum ?? '' } });

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const text = normalizeQuantity(form.getValues('minimum'));
    const payload = validate(setMaterialMinimumRequest, { minimum: text === '' ? null : text }, form);
    if (!payload) return;
    try {
      await setMinimum.mutateAsync(payload);
      toast.success(payload.minimum ? 'Mínimo fijado' : 'Mínimo quitado', { description: name });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(materialsErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={BellRing}
      title="Mínimo"
      description={`El material avisa «Bajo mínimo» cuando su existencia total baja de esta cantidad. ${name}.`}
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Guardar mínimo"
      pending={setMinimum.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty}
      focusFirst
    >
      <Field label={`Mínimo (${unit})`} optional hint="Déjalo vacío para quitar el aviso." error={form.formState.errors.minimum?.message}>
        <Input inputMode="decimal" autoComplete="off" className="h-11 sm:h-10" {...form.register('minimum')} />
      </Field>
    </FormSheet>
  );
}
