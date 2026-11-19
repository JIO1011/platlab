import {
  materialAdjustmentRequest,
  materialIssueRequest,
  materialReceiptRequest,
  type MaterialStockLine,
} from '@platlab/contracts';
import { Field, Input, Quantity, Select, toast } from '@platlab/ui';
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { materialsErrorMessage, useAdjustment, useIssue, useReceipt } from './commands';
import { useReceiptLocations } from './queries';
import { locationLabels, normalizeQuantity } from './text';

/** Lo que la hoja registra: un ingreso a una ubicación, o una salida o un ajuste sobre lo que ya hay en una. */
export type Movement = { kind: 'receipt' } | { kind: 'issue'; line: MaterialStockLine } | { kind: 'adjust'; line: MaterialStockLine };

const copy = {
  receipt: { icon: ArrowDownToLine, title: 'Ingresar existencias', submit: 'Registrar ingreso', done: 'Ingreso registrado' },
  issue: { icon: ArrowUpFromLine, title: 'Dar salida', submit: 'Registrar salida', done: 'Salida registrada' },
  adjust: { icon: SlidersHorizontal, title: 'Ajustar existencias', submit: 'Registrar ajuste', done: 'Ajuste registrado' },
} as const;

interface Values {
  locationId: string;
  quantity: string;
  reference: string;
  reason: string;
  destination: string;
  direction: 'add' | 'remove';
}

/**
 * Ingreso, salida y ajuste de un material en una hoja (ADR 0025). Cada uno es un movimiento confirmado del libro: no se
 * deshace, se corrige con otro. La pantalla cambia solo con lo que el servidor confirma, y una salida nunca baja de
 * lo disponible (lo prestado no se puede sacar).
 */
export function MovementSheet({
  workspaceId,
  open,
  onOpenChange,
  material,
  movement,
}: SheetBaseProps & { material: { id: string; name: string; baseUnit: string }; movement: Movement }) {
  const receipt = useReceipt(workspaceId);
  const issue = useIssue(workspaceId);
  const adjustment = useAdjustment(workspaceId);
  const locations = useReceiptLocations(workspaceId, movement.kind === 'receipt');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm<Values>({ defaultValues: { locationId: '', quantity: '', reference: '', reason: '', destination: '', direction: 'add' } });
  const errors = form.formState.errors;
  const { icon, title, submit: submitLabel, done } = copy[movement.kind];
  const unit = material.baseUnit;

  const locationOptions = useMemo(() => {
    const items = locations.data?.items ?? [];
    const labels = locationLabels(items);
    return items.map((place) => ({ value: place.id, label: labels.get(place.id) ?? place.name }));
  }, [locations.data]);

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const values = form.getValues();
    const quantity = normalizeQuantity(values.quantity);
    try {
      let result;
      if (movement.kind === 'receipt') {
        const payload = validate(
          materialReceiptRequest,
          { productId: material.id, locationId: values.locationId, quantity, unit, ...(values.reference.trim() ? { reference: values.reference.trim() } : {}) },
          form,
        );
        if (!payload) return;
        result = await receipt.mutateAsync(payload);
      } else if (movement.kind === 'issue') {
        const payload = validate(
          materialIssueRequest,
          { positionId: movement.line.positionId, quantity, unit, reason: values.reason.trim(), destination: values.destination.trim() },
          form,
        );
        if (!payload) return;
        result = await issue.mutateAsync(payload);
      } else {
        const signed = values.direction === 'remove' ? `-${quantity}` : quantity;
        const payload = validate(materialAdjustmentRequest, { positionId: movement.line.positionId, quantity: signed, unit, reason: values.reason.trim() }, form);
        if (!payload) return;
        result = await adjustment.mutateAsync(payload);
      }
      toast.success(done, { description: `${material.name} · saldo ${result.balance} ${unit}` });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(materialsErrorMessage(error));
    }
  };

  const where = movement.kind === 'receipt' ? null : movement.line;
  return (
    <FormSheet
      icon={icon}
      title={title}
      description={
        where ? (
          <>
            {material.name} en {where.locationPath.join(' › ')}. Existencia <Quantity value={where.balance} unit={unit} />, disponible <Quantity value={where.available} unit={unit} />.
          </>
        ) : (
          material.name
        )
      }
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={submitLabel}
      pending={receipt.isPending || issue.isPending || adjustment.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty}
      required
      focusFirst
      pendingText="Registrando…"
    >
      {movement.kind === 'receipt' ? (
        <Field label="Ubicación" required hint="Dónde queda guardado. Si falta, el Administrador la crea en Áreas." error={errors.locationId?.message}>
          <Controller
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} placeholder={locations.isPending ? 'Cargando…' : 'Elige la ubicación'} options={locationOptions} />
            )}
          />
        </Field>
      ) : null}
      {movement.kind === 'adjust' ? (
        <Field label="Qué ajuste" required>
          <Controller
            control={form.control}
            name="direction"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value)}
                placeholder="Elige"
                options={[
                  { value: 'add', label: 'Sumar: había más de lo registrado' },
                  { value: 'remove', label: 'Restar: había menos de lo registrado' },
                ]}
              />
            )}
          />
        </Field>
      ) : null}
      <Field label={`Cantidad (${unit})`} required error={errors.quantity?.message}>
        <Input inputMode="decimal" autoComplete="off" className="h-11 sm:h-10" {...form.register('quantity')} />
      </Field>
      {movement.kind === 'receipt' ? (
        <Field label="Referencia" optional hint="Factura, guía o nota del ingreso." error={errors.reference?.message}>
          <Input maxLength={200} autoComplete="off" className="h-11 sm:h-10" {...form.register('reference')} />
        </Field>
      ) : (
        <Field label="Motivo" required hint={movement.kind === 'issue' ? 'Para qué sale: práctica, reposición, descarte…' : 'Por qué cambia el saldo: conteo, corrección…'} error={errors.reason?.message}>
          <Input maxLength={500} autoComplete="off" className="h-11 sm:h-10" {...form.register('reason')} />
        </Field>
      )}
      {movement.kind === 'issue' ? (
        <Field label="Destino" required hint="Quién o dónde lo usa: un laboratorio, una práctica o una persona." error={errors.destination?.message}>
          <Input maxLength={200} autoComplete="off" className="h-11 sm:h-10" {...form.register('destination')} />
        </Field>
      ) : null}
    </FormSheet>
  );
}
