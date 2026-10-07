import { receiptRequest, receiptResponse, type Product } from '@platlab/contracts';
import { Field, Input, Select, formatDecimal, normalizeDecimalInput, toast } from '@platlab/ui';
import { ArrowDownToLine } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { formatDate } from '../../../app/format';
import { useLots, useReceiptLocations } from '../../../app/queries';
import { commandErrorMessage, useCommand } from '../commands';
import { type SheetBaseProps, validate, FormSheet, QuantityPreview } from './shared';

/**
 * Ingreso por frascos (ADR 0012): reactivo, lote existente o nuevo (01 §6.1), ubicación y cuántos
 * frascos iguales entran. Cada frasco recibe su código al registrarse.
 */
export function ReceiptSheet({
  workspaceId,
  open,
  onOpenChange,
  products,
  productId,
  base,
}: SheetBaseProps & { products: Product[]; productId: string | undefined; base: string }) {
  const navigate = useNavigate();
  const command = useCommand(workspaceId, '/receipts', receiptResponse);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      productId: productId ?? '',
      lotMode: 'existing' as 'existing' | 'new',
      lotId: '',
      lotCode: '',
      expiresOn: '',
      supplierName: '',
      locationId: '',
      containers: '1',
      quantity: '',
      reference: '',
    },
  });
  const selectedProduct = products.find((p) => p.id === form.watch('productId'));
  const lots = useLots(workspaceId, selectedProduct?.id);
  const locations = useReceiptLocations(workspaceId, open);
  const errors = form.formState.errors;
  const lotOptions = (lots.data?.items ?? [])
    .map((lot) => ({
      value: lot.id,
      label: lot.code,
      detail: lot.expiresOn ? `Caduca ${formatDate(lot.expiresOn)}` : 'Caducidad desconocida',
    }));
  // Sin lotes, el primero se crea aquí mismo.
  const lotMode = lots.data && lotOptions.length === 0 ? 'new' : form.watch('lotMode');
  const count = Number(form.watch('containers'));

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    if (!selectedProduct) {
      form.setError('productId', { message: 'Elige el reactivo que ingresa.' });
      return;
    }
    const common = {
      locationId: values.locationId,
      containers: Number(values.containers),
      quantity: normalizeDecimalInput(values.quantity),
      unit: selectedProduct.baseUnit,
      reference: values.reference.trim() || null,
    };
    const payload = validate(
      receiptRequest,
      lotMode === 'new'
        ? {
            ...common,
            productId: selectedProduct.id,
            newLot: {
              code: values.lotCode.trim(),
              expiresOn: values.expiresOn || null,
              supplierName: values.supplierName.trim() || null,
            },
          }
        : { ...common, lotId: values.lotId || undefined },
      form,
    );
    if (!payload) {
      if (lotMode === 'new' && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(values.lotCode.trim())) {
        form.setError('lotCode', { message: 'Usa letras, números, punto, guion o guion bajo.' });
      }
      if (lotMode === 'existing' && !values.lotId) form.setError('lotId', { message: 'Elige un lote.' });
      if (!Number.isInteger(Number(values.containers)) || Number(values.containers) < 1 || Number(values.containers) > 50) {
        form.setError('containers', { message: 'Entre 1 y 50 frascos.' });
      }
      return;
    }
    try {
      const result = await command.mutateAsync(payload);
      const codes = result.containers.map((container) => container.code);
      const receivedProduct = selectedProduct?.id;
      toast.success(codes.length === 1 ? 'Frasco registrado' : `${codes.length} frascos registrados`, {
        description: `${codes.join(', ')} · ${formatDecimal(result.containers[0]?.quantity ?? '0')} ${result.unit} cada uno`,
        // Las etiquetas con QR de los frascos recién registrados, a un clic (ADR 0012, entrega 4).
        action: receivedProduct
          ? {
              label: 'Imprimir etiquetas',
              onClick: () =>
                navigate(
                  `${base}/inventario/${receivedProduct}/etiquetas?frascos=${result.containers.map((container) => container.containerId).join(',')}`,
                ),
            }
          : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      icon={ArrowDownToLine}
      title="Registrar ingreso"
      description="Suma frascos de un lote en una ubicación. Cada frasco recibe su código."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Registrar ingreso"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <Field label="Reactivo" error={errors.productId?.message}>
        <Controller
          control={form.control}
          name="productId"
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={(value) => {
                field.onChange(value);
                form.setValue('lotId', '');
              }}
              options={products.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
              placeholder="Elige un reactivo"
            />
          )}
        />
      </Field>
      {selectedProduct && lotOptions.length > 0 ? (
        <fieldset className="grid gap-1.5">
          <legend className="text-sm font-medium text-ink">Lote</legend>
          <div className="grid grid-cols-2 gap-1 rounded-control bg-surface-sunken p-1">
            {(
              [
                ['existing', 'Lote existente'],
                ['new', 'Lote nuevo'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="cursor-pointer rounded-[6px] px-3 py-1.5 text-center text-sm font-medium text-ink-muted transition-colors has-checked:bg-surface has-checked:text-ink has-checked:shadow-raised has-focus-visible:outline-2 has-focus-visible:outline-action"
              >
                <input type="radio" value={value} className="sr-only" {...form.register('lotMode')} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {lotMode === 'existing' ? (
        <Field label={selectedProduct && lotOptions.length > 0 ? 'Lote existente' : 'Lote'} error={errors.lotId?.message}>
          <Controller
            control={form.control}
            name="lotId"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                options={lotOptions}
                placeholder={selectedProduct ? 'Elige un lote' : 'Primero elige el reactivo'}
                disabled={!selectedProduct}
              />
            )}
          />
        </Field>
      ) : (
        <div className="grid gap-4 rounded-panel bg-surface-sunken/60 p-4">
          <Field label="Código del lote nuevo" error={errors.lotCode?.message} hint="Único para este reactivo; por ejemplo, NACL-2026-04.">
            <Input autoComplete="off" {...form.register('lotCode')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Caducidad" optional error={errors.expiresOn?.message} hint="Si no se conoce, queda «sin confirmar».">
              <Input type="date" {...form.register('expiresOn')} />
            </Field>
            <Field label="Proveedor" optional error={errors.supplierName?.message}>
              <Input autoComplete="off" {...form.register('supplierName')} />
            </Field>
          </div>
        </div>
      )}
      <Field label="Ubicación" error={errors.locationId?.message}>
        <Controller
          control={form.control}
          name="locationId"
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              options={(locations.data?.items ?? []).map((l) => ({ value: l.id, label: l.name, detail: l.code }))}
              placeholder="Elige dónde se guarda"
            />
          )}
        />
      </Field>
      <div className="grid grid-cols-[6.5rem_1fr] gap-4">
        <Field label="Frascos" error={errors.containers?.message}>
          <Input type="number" inputMode="numeric" min={1} max={50} step={1} className="tabular-nums" {...form.register('containers')} />
        </Field>
        <Field
          label="Cantidad por frasco"
          error={errors.quantity?.message}
          hint={
            Number.isInteger(count) && count > 1 ? (
              <span>
                Entran {count} frascos iguales. <QuantityPreview raw={form.watch('quantity')} unit={selectedProduct?.baseUnit} />{' '}
                cada uno.
              </span>
            ) : (
              <QuantityPreview raw={form.watch('quantity')} unit={selectedProduct?.baseUnit} />
            )
          }
        >
          <div className="relative">
            <Input inputMode="decimal" autoComplete="off" className="pr-14 tabular-nums" {...form.register('quantity')} />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
              {selectedProduct?.baseUnit ?? ''}
            </span>
          </div>
        </Field>
      </div>
      <Field label="Referencia" optional error={errors.reference?.message} hint="Factura, guía de remisión u orden de compra.">
        <Input autoComplete="off" {...form.register('reference')} />
      </Field>
    </FormSheet>
  );
}
