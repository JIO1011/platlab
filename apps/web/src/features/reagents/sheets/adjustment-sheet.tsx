import { adjustmentRequest, movementResponse, type Position } from '@platlab/contracts';
import { Field, Input, Quantity, Select, formatDecimal, sectionLabel, normalizeDecimalInput, toast } from '@platlab/ui';
import { Scale } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { isApiError } from '../../../app/api';
import { useReasons } from '../../../app/queries';
import { ChoiceField } from '../choices';
import { commandErrorMessage, useCommand } from '../commands';
import { type SheetBaseProps, validate, FormSheet, QuantityPreview, positionOption, byProductThenExpiry } from './shared';

export function AdjustmentSheet({
  workspaceId,
  open,
  onOpenChange,
  positions,
  positionId,
  canManageLists,
}: SheetBaseProps & { positions: Position[]; positionId: string | undefined; canManageLists: boolean }) {
  const command = useCommand(workspaceId, '/adjustments', movementResponse);
  const reasons = useReasons(workspaceId, 'adjustment', open);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { positionId: positionId ?? '', direction: 'decrease' as 'increase' | 'decrease', quantity: '', reason: '' },
  });
  const position = positions.find((p) => p.id === form.watch('positionId'));
  const direction = form.watch('direction');
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    const magnitude = normalizeDecimalInput(values.quantity);
    const payload = validate(
      adjustmentRequest,
      {
        positionId: values.positionId,
        quantity: values.direction === 'decrease' ? `-${magnitude}` : magnitude,
        unit: position?.unit ?? '',
        reason: values.reason.trim(),
      },
      form,
    );
    if (!payload) return;
    try {
      const result = await command.mutateAsync(payload);
      toast.success('Ajuste registrado', {
        description: `Quedan ${formatDecimal(result.balance)} ${result.unit} en el frasco`,
      });
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error, 'INSUFFICIENT_STOCK')) form.setError('quantity', { message: 'El ajuste dejaría el saldo por debajo de cero.' });
      else setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      sections
      icon={Scale}
      title="Ajustar existencias"
      description="Corrige el saldo tras un conteo con otro movimiento; el historial no se edita."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Registrar ajuste"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <div className="grid grid-cols-1 gap-3">
        <Field label="Frasco" error={errors.positionId?.message}>
          <Controller
            control={form.control}
            name="positionId"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                options={[...positions].sort(byProductThenExpiry).map(positionOption)}
                placeholder="Elige reactivo, frasco y ubicación"
              />
            )}
          />
        </Field>
        {position ? (
          <div className="flex items-baseline justify-between rounded-control bg-surface-sunken px-3 py-2.5 text-sm">
            <span className="text-ink-muted">Saldo registrado</span>
            <Quantity value={position.balance} unit={position.unit} className="font-semibold text-ink" />
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4">
        <fieldset className="grid gap-1.5">
          <legend className="text-sm font-medium text-ink">El conteo</legend>
          <div className="grid grid-cols-2 gap-1 rounded-control bg-surface-sunken p-1">
            {(
              [
                ['decrease', 'Dio menos'],
                ['increase', 'Dio más'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="cursor-pointer rounded-[6px] px-3 py-1.5 text-center text-sm font-medium text-ink-muted transition-colors has-checked:bg-surface has-checked:text-ink has-checked:shadow-raised has-focus-visible:outline-2 has-focus-visible:outline-action"
              >
                <input type="radio" value={value} className="sr-only" {...form.register('direction')} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          label="Diferencia"
          className="text-center"
          labelClassName={sectionLabel}
          error={errors.quantity?.message}
          hint={<QuantityPreview raw={form.watch('quantity')} unit={position?.unit} sign={direction === 'decrease' ? '-' : ''} />}
        >
          <div className="relative mx-auto w-full max-w-xs">
            <Input
              inputMode="decimal"
              autoComplete="off"
              className="h-14 rounded-none border-0 border-b-2 border-line-strong bg-transparent px-14 text-center text-4xl font-bold tabular-nums focus-visible:ring-0 aria-[invalid=true]:ring-0"
              {...form.register('quantity')}
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xl text-ink-muted">
              {position?.unit ?? ''}
            </span>
          </div>
        </Field>
      </div>
      <Controller
        control={form.control}
        name="reason"
        render={({ field }) => (
          <ChoiceField
            workspaceId={workspaceId}
            label="Motivo"
            hint="Obligatorio: el historial guarda por qué cambió el saldo."
            error={errors.reason?.message}
            options={reasons.data?.items ?? []}
            loading={reasons.isPending}
            value={field.value}
            onChange={field.onChange}
            canAdd={canManageLists}
            addPath="/reasons"
            addBody={(name) => ({ kind: 'adjustment', name })}
            addLabel="Nuevo motivo"
          />
        )}
      />
    </FormSheet>
  );
}
