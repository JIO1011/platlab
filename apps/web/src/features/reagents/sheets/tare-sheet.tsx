import { setTareRequest, tareResponse, type Position } from '@platlab/contracts';
import { Field, Input, Quantity, normalizeDecimalInput, toDecimalInput, toast } from '@platlab/ui';
import { Scale } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { commandErrorMessage, useCommand } from '../commands';
import { formatGrams, isPositiveQuantity, isVolume, tareOf } from '../weight';
import { fieldLabel } from '../ingress/filled';
import { type SheetBaseProps, validate, FormSheet } from './shared';

/**
 * Fijar tara (ADR 0015): con el frasco en la balanza, tara = peso − saldo pasado a gramos. En volumen
 * hace falta la densidad: viene la del frasco o la de la ficha, y se puede corregir. La tara que se ve
 * es una vista previa; la calcula el servidor y reemplaza la anterior.
 */
export function TareSheet({
  workspaceId,
  open,
  onOpenChange,
  position,
  productDensity,
}: SheetBaseProps & { position: Position; productDensity: string | null }) {
  const containerId = position.container?.id ?? '';
  const command = useCommand(workspaceId, `/containers/${containerId}/tare`, tareResponse, 'PUT');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const volume = isVolume(position.unit);
  const knownDensity = position.container?.density ?? productDensity;
  const form = useForm({ defaultValues: { grossWeight: '', density: knownDensity ? toDecimalInput(knownDensity) : '' } });
  const errors = form.formState.errors;
  const grossWeight = normalizeDecimalInput(form.watch('grossWeight'));
  const density = normalizeDecimalInput(form.watch('density'));
  const usable = isPositiveQuantity(grossWeight) && (!volume || isPositiveQuantity(density));
  const tare = usable ? tareOf(grossWeight, position.balance, position.unit, volume ? density : null) : null;
  const tooLight = tare !== null && (tare === '0' || tare.startsWith('-'));

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
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
      toast.success('Tara fijada', { description: `${position.container?.code ?? ''}: ${formatGrams(result.tare)}` });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      icon={Scale}
      title="Fijar tara"
      description="Pesa el frasco con su tapa y lo que contiene ahora. La tara reemplaza la anterior."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Fijar tara"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <div className="flex items-baseline justify-between rounded-control bg-surface-sunken px-3 py-2.5 text-sm">
        <span className="text-ink-muted">Saldo de {position.container?.code ?? 'este frasco'}</span>
        <Quantity value={position.balance} unit={position.unit} className="font-semibold text-ink" />
      </div>
      <Field
        label="Peso en balanza (g)"
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
            'El servidor calcula la tara con el saldo registrado.'
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
          <Input inputMode="decimal" autoComplete="off" className="tabular-nums" {...form.register('density')} />
        </Field>
      ) : null}
    </FormSheet>
  );
}
