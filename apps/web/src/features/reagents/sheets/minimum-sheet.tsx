import { minimumResponse, setMinimumRequest, type StockedProduct } from '@platlab/contracts';
import { Field, Input, Quantity, formatDecimal, normalizeDecimalInput, toDecimalInput, toast } from '@platlab/ui';
import { TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { commandErrorMessage, useCommand } from '../commands';
import { type SheetBaseProps, validate, FormSheet } from './shared';

/**
 * Mínimo del reactivo (ADR 0012, 05-10-2026): uno para todo el espacio, en su unidad base. Vacío lo
 * quita. Se compara con la existencia física: todos sus frascos con saldo.
 */
export function MinimumSheet({ workspaceId, open, onOpenChange, product }: SheetBaseProps & { product: StockedProduct | undefined }) {
  const command = useCommand(workspaceId, `/products/${product?.id ?? ''}/minimum`, minimumResponse, 'PUT');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { minimum: product?.minimum ? toDecimalInput(product.minimum) : '' } });
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    const raw = values.minimum.trim();
    const payload = validate(setMinimumRequest, { minimum: raw ? normalizeDecimalInput(raw) : null }, form);
    if (!payload || !product) return;
    try {
      await command.mutateAsync(payload);
      toast.success(payload.minimum ? 'Mínimo guardado' : 'Mínimo quitado', {
        description: payload.minimum ? `${product.name}: ${formatDecimal(payload.minimum)} ${product.baseUnit}` : product.name,
      });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      icon={TrendingDown}
      title="Mínimo del reactivo"
      description="Un solo mínimo para todo el espacio. Cuando la existencia total baja de él, el reactivo se marca «Bajo mínimo»."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Guardar mínimo"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      {product ? (
        <div className="flex items-baseline justify-between rounded-control bg-surface-sunken px-3 py-2.5 text-sm">
          <span className="text-ink-muted">Existencia de {product.name}</span>
          <Quantity value={product.balance} unit={product.baseUnit} className="font-semibold text-ink" />
        </div>
      ) : null}
      <Field
        label="Mínimo"
        error={errors.minimum?.message}
        hint="Cuenta todos los frascos con saldo, también los vencidos, los de lotes en cuarentena y lo apartado. Déjalo vacío para quitarlo."
      >
        <div className="relative">
          <Input inputMode="decimal" autoComplete="off" className="pr-12" {...form.register('minimum')} />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
            {product?.baseUnit ?? ''}
          </span>
        </div>
      </Field>
    </FormSheet>
  );
}
