import { setTareRequest, tareResponse, type Position } from '@platlab/contracts';
import { Field, Input, normalizeDecimalInput, toDecimalInput, toast } from '@platlab/ui';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { commandErrorMessage, useCommand } from '../commands';
import { formatGrams, isPositiveQuantity, isVolume, tareOf } from '../weight';
import { fieldLabel } from '../ingress/filled';
import { validate } from './shared';

/**
 * Activar la balanza de un frasco (ADR 0015): con el frasco en la balanza, tara = peso − saldo pasado a
 * gramos. En volumen hace falta la densidad: viene la del frasco o la de la ficha, y se puede corregir. La
 * tara que se ve es una vista previa; la calcula el servidor y reemplaza la anterior. Vive dentro de la
 * ventana de Ajustar (`AdjustmentSheet`), que le presta su botón de envío.
 */
export function useTareForm({
  workspaceId,
  position,
  productDensity,
  onDone,
}: {
  workspaceId: string;
  position: Position | undefined;
  productDensity: string | null;
  onDone: () => void;
}) {
  const containerId = position?.container?.id ?? '';
  const command = useCommand(workspaceId, `/containers/${containerId}/tare`, tareResponse, 'PUT');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { grossWeight: '', density: '' } });
  const volume = position ? isVolume(position.unit) : false;
  const knownDensity = position?.container?.density ?? productDensity;
  const grossWeight = normalizeDecimalInput(form.watch('grossWeight'));
  const density = normalizeDecimalInput(form.watch('density'));
  const usable = isPositiveQuantity(grossWeight) && (!volume || isPositiveQuantity(density));
  const tare = position && usable ? tareOf(grossWeight, position.balance, position.unit, volume ? density : null) : null;
  const tooLight = tare !== null && (tare === '0' || tare.startsWith('-'));

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    if (!position) return;
    if (volume && !values.density.trim()) {
      form.setError('density', { message: 'Escribe la densidad en g/mL, como 1,19.' });
      return;
    }
    const payload = validate(
      setTareRequest,
      {
        grossWeight: normalizeDecimalInput(values.grossWeight),
        density: volume ? normalizeDecimalInput(values.density) : null,
      },
      form,
    );
    if (!payload) return;
    try {
      const result = await command.mutateAsync(payload);
      toast.success('Balanza activada', { description: `${position.container?.code ?? ''}: ${formatGrams(result.tare)}` });
      onDone();
    } catch (error) {
      setGeneralError(commandErrorMessage(error));
    }
  });

  return { form, submit, pending: command.isPending, generalError, tare, tooLight, volume, knownDensity };
}

/** Los campos de activar la balanza: el peso del frasco ahora y, en volumen, la densidad. */
export function TareFields({ tareForm }: { tareForm: ReturnType<typeof useTareForm> }) {
  const { form, tare, tooLight, volume, knownDensity } = tareForm;
  const errors = form.formState.errors;
  // La densidad conocida (la del frasco o la de la ficha) llega puesta, y se puede corregir.
  useEffect(() => {
    if (knownDensity && !form.getValues('density')) form.setValue('density', toDecimalInput(knownDensity));
  }, [form, knownDensity]);
  return (
    <div className="grid grid-cols-1 gap-4">
      <p className="text-center text-sm text-ink-muted">Pesa el frasco ahora; desde ahí podrás comprobarlo con la balanza.</p>
      <Field
        label="Peso del frasco ahora (g)"
        className="text-center"
        labelClassName={fieldLabel}
        error={errors.grossWeight?.message}
        hint={
          tooLight ? (
            <span className="font-medium text-danger">El peso debe superar el de su contenido.</span>
          ) : tare ? (
            <span role="status">
              Tara calculada: <span className="font-medium tabular-nums text-ink">{formatGrams(tare)}</span>
            </span>
          ) : (
            'Con su tapa y lo que contiene. El servidor calcula la tara con el saldo registrado.'
          )
        }
      >
        <div className="relative mx-auto w-full max-w-xs">
          <Input
            inputMode="decimal"
            autoComplete="off"
            className="h-14 rounded-none border-0 border-b-2 border-line-strong bg-transparent px-14 text-center text-4xl font-bold tabular-nums focus-visible:ring-0 aria-[invalid=true]:ring-0"
            {...form.register('grossWeight')}
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xl text-ink-muted">g</span>
        </div>
      </Field>
      {volume ? (
        <Field
          label="Densidad (g/mL)"
          error={errors.density?.message}
          hint={knownDensity ? 'La del frasco o la de la ficha; corrígela si el rótulo dice otra.' : 'Del rótulo o la ficha de seguridad.'}
        >
          <Input
            inputMode="decimal"
            autoComplete="off"
            className="tabular-nums"
            {...form.register('density')}
          />
        </Field>
      ) : null}
    </div>
  );
}
