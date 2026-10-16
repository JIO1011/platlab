import { adjustmentRequest, movementResponse, weightAdjustmentRequest, type Position, type StockedProduct } from '@platlab/contracts';
import { Field, Input, Quantity, Select, formatDecimal, sectionLabel, normalizeDecimalInput, toast } from '@platlab/ui';
import { Scale } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { isApiError } from '../../../app/api';
import { useReasons } from '../queries';
import { ChoiceField } from '../choices';
import { commandErrorMessage, useCommand } from '../commands';
import { formatGrams, gramsPerUnit, hasTare, isPositiveQuantity, scaleBalance } from '../weight';
import { fieldLabel } from '../../../app/filled';
import { FormSheet, validate, type SheetBaseProps } from '../../../app/form-sheet';
import { QuantityPreview, positionOption, byProductThenExpiry } from './shared';
import { TareFields, useTareForm } from './tare-form';

/** Enlace de texto bajo el campo: cambia de método sin salir de la ventana. */
function MethodLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm text-sm font-medium text-action underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
    >
      {children}
    </button>
  );
}

export function AdjustmentSheet({
  workspaceId,
  open,
  onOpenChange,
  positions,
  positionId,
  products,
  initialMode,
  canManageLists,
}: SheetBaseProps & {
  positions: Position[];
  positionId: string | undefined;
  /** La densidad de la ficha, para activar la balanza de un frasco en volumen. */
  products: StockedProduct[];
  /**
   * Desde la ficha ⚖ del frasco (ADR 0015, 14-10-2026). `weight` («Corregir con la balanza», «Pesar ahora»): un frasco
   * sin tara abre directo el formulario de activarla. `quantity` («Escribir la cantidad»): abre el conteo aunque el
   * frasco tenga tara. Sin modo, el frasco decide el método.
   */
  initialMode?: 'quantity' | 'weight';
  canManageLists: boolean;
}) {
  const command = useCommand(workspaceId, '/adjustments', movementResponse);
  const byWeight = useCommand(workspaceId, '/adjustments/by-weight', movementResponse);
  const reasons = useReasons(workspaceId, 'adjustment', open);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { positionId: positionId ?? '', direction: 'decrease' as 'increase' | 'decrease', quantity: '', reason: '' },
  });
  const position = positions.find((p) => p.id === form.watch('positionId'));
  const direction = form.watch('direction');
  const errors = form.formState.errors;
  // Una sola ventana (ADR 0015, «Ajuste del mismo día»): el frasco decide el método. Con tara, la balanza;
  // sin ella, la cantidad. Los enlaces de abajo cambian de método; el saldo por peso lo calcula el servidor.
  const [scaleText, setScaleText] = useState('');
  const [scaleError, setScaleError] = useState<string | undefined>(undefined);
  const scaleWeight = normalizeDecimalInput(scaleText);
  const weighed = position && isPositiveQuantity(scaleWeight) ? scaleBalance(position, scaleWeight) : null;
  const withTare = position ? hasTare(position) : false;
  // Solo se pesan g, kg, mL y L (en volumen, con densidad: la pide el formulario).
  const weighable = position ? position.container !== null && gramsPerUnit(position.unit, '1') !== null : false;
  const [byCount, setByCount] = useState(initialMode === 'quantity');
  const [activating, setActivating] = useState(() => {
    const opened = positions.find((p) => p.id === positionId);
    return initialMode === 'weight' && opened !== undefined && !hasTare(opened);
  });
  const mode: 'activate' | 'weight' | 'quantity' = activating ? 'activate' : withTare && !byCount ? 'weight' : 'quantity';
  const tareForm = useTareForm({
    workspaceId,
    position,
    productDensity: products.find((entry) => entry.id === position?.product.id)?.density ?? null,
    onDone: () => onOpenChange(false),
  });
  const switchTo = (next: { byCount: boolean; activating: boolean }) => {
    setByCount(next.byCount);
    setActivating(next.activating);
    setScaleError(undefined);
    setGeneralError(null);
  };

  const submitWeight = async () => {
    setGeneralError(null);
    if (!position) return setScaleError('Primero elige el frasco.');
    if (!withTare) return setScaleError('Este frasco aún no tiene tara: actívala para ajustar por peso.');
    const parsed = weightAdjustmentRequest.safeParse({ positionId: position.id, grossWeight: scaleWeight });
    if (!parsed.success) return setScaleError('Escribe el peso en gramos, como 640,5.');
    try {
      const result = await byWeight.mutateAsync(parsed.data);
      toast.success('Ajuste por peso registrado', {
        description: `Quedan ${formatDecimal(result.balance)} ${result.unit} en el frasco`,
      });
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error, 'VALIDATION_FAILED', 'INSUFFICIENT_STOCK')) setScaleError(commandErrorMessage(error));
      else setGeneralError(commandErrorMessage(error));
    }
  };

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
      submitLabel={mode === 'activate' ? 'Activar la balanza' : 'Registrar ajuste'}
      pending={command.isPending || byWeight.isPending || tareForm.pending}
      generalError={mode === 'activate' ? tareForm.generalError : generalError}
      onSubmit={() => void (mode === 'activate' ? tareForm.submit() : mode === 'weight' ? submitWeight() : submit())}
    >
      <div className="grid grid-cols-1 gap-3">
        <Field label="Frasco" error={errors.positionId?.message}>
          <Controller
            control={form.control}
            name="positionId"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={(next) => {
                  field.onChange(next);
                  switchTo({ byCount: false, activating: false });
                }}
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
      {mode === 'activate' ? (
        <div className="grid grid-cols-1 gap-4">
          <TareFields tareForm={tareForm} />
          <div className="grid justify-items-center">
            <MethodLink onClick={() => switchTo({ byCount: false, activating: false })}>{withTare ? 'Volver a la balanza' : 'Mejor ajustar la cantidad'}</MethodLink>
          </div>
        </div>
      ) : null}
      {mode === 'weight' ? (
        <div className="grid grid-cols-1 gap-4">
          <Field
            label="¿Qué marca la balanza? (g)"
            className="text-center"
            labelClassName={fieldLabel}
            error={scaleError}
            hint={
              <>
                {weighed && 'belowTare' in weighed ? (
                  <span className="font-medium text-danger">El peso es menor que la tara ({formatGrams(weighed.belowTare)}).</span>
                ) : weighed && position ? (
                  <span role="status">
                    Quedará <Quantity value={weighed.balance} unit={position.unit} className="font-medium text-ink" />
                    {' · '}
                    {/^-?0(\.0+)?$/.test(weighed.difference) ? (
                      'coincide con el registrado'
                    ) : (
                      <>
                        diferencia <Quantity value={weighed.difference} unit={position.unit} signed className="font-medium text-ink" />
                      </>
                    )}
                  </span>
                ) : (
                  'Pesa el frasco con su tapa; se descuenta la tara.'
                )}
                <span className="block">El motivo queda como «Pesada».</span>
              </>
            }
          >
            <div className="relative mx-auto w-full max-w-xs">
              <Input
                inputMode="decimal"
                autoComplete="off"
                className="h-14 rounded-none border-0 border-b-2 border-line-strong bg-transparent px-14 text-center text-4xl font-bold tabular-nums focus-visible:ring-0 aria-[invalid=true]:ring-0"
                value={scaleText}
                onChange={(event) => {
                  setScaleText(event.target.value);
                  setScaleError(undefined);
                }}
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xl text-ink-muted">g</span>
            </div>
          </Field>
          <div className="grid justify-items-center gap-2">
            <MethodLink onClick={() => switchTo({ byCount: true, activating: false })}>No tengo balanza: escribir la cantidad</MethodLink>
            {weighable ? <MethodLink onClick={() => switchTo({ byCount: false, activating: true })}>Volver a pesar para actualizar la balanza</MethodLink> : null}
          </div>
        </div>
      ) : null}
      {mode === 'quantity' ? (
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
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xl text-ink-muted">{position?.unit ?? ''}</span>
            </div>
          </Field>
        </div>
      ) : null}
      {mode === 'quantity' ? (
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
      ) : null}
      {mode === 'quantity' && position && weighable ? (
        <div className="grid justify-items-center">
          {withTare ? (
            <MethodLink onClick={() => switchTo({ byCount: false, activating: false })}>Usar la balanza</MethodLink>
          ) : (
            <MethodLink onClick={() => switchTo({ byCount: false, activating: true })}>Pesar el frasco para activar la balanza</MethodLink>
          )}
        </div>
      ) : null}
    </FormSheet>
  );
}
