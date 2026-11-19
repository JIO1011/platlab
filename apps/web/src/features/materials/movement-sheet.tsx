import {
  issuePurpose,
  materialAdjustmentRequest,
  materialIssueRequest,
  materialReceiptRequest,
  type IssuePurpose,
  type MaterialStockLine,
} from '@platlab/contracts';
import { Field, Input, Quantity, Segmented, Select, toast, unitText } from '@platlab/ui';
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { formatDate, todayInZone } from '../../app/format';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { materialsErrorMessage, useAdjustment, useIssue, useReceipt } from './commands';
import { useMaterials } from './context';
import { useBorrowers, useReceiptLocations } from './queries';
import { expiryStatus, locationLabels, normalizeQuantity, purposeCopy } from './text';

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
  expiresOn: string;
  lot: string;
  reason: string;
  purpose: IssuePurpose;
  requesterId: string;
  detail: string;
  direction: 'add' | 'remove';
}

/** El solicitante es opcional: «Sin indicar» no envía nada. */
const NO_REQUESTER = 'none';
const purposeOptions = issuePurpose.options.map((value) => ({ value, label: purposeCopy[value].label }));

/**
 * Ingreso, salida y ajuste de un material en una hoja (ADR 0025). Cada uno es un movimiento confirmado del libro: no se
 * deshace, se corrige con otro. La pantalla cambia solo con lo que el servidor confirma, y una salida nunca baja de
 * lo disponible (lo prestado no se puede sacar). Si el insumo vence, el ingreso pide la fecha y el lote; la salida
 * dice para qué sale y quién la pidió, y avisa si el lote ya venció sin impedirla (MA-01f).
 */
export function MovementSheet({
  workspaceId,
  open,
  onOpenChange,
  material,
  movement,
}: SheetBaseProps & { material: { id: string; name: string; baseUnit: string; tracksExpiry: boolean }; movement: Movement }) {
  const { me } = useMaterials();
  const receipt = useReceipt(workspaceId);
  const issue = useIssue(workspaceId);
  const adjustment = useAdjustment(workspaceId);
  const locations = useReceiptLocations(workspaceId, movement.kind === 'receipt');
  const borrowers = useBorrowers(workspaceId, movement.kind === 'issue');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm<Values>({
    defaultValues: {
      locationId: '',
      quantity: '',
      reference: '',
      expiresOn: '',
      lot: '',
      reason: '',
      purpose: 'practice',
      requesterId: NO_REQUESTER,
      detail: '',
      direction: 'add',
    },
  });
  const purpose = form.watch('purpose');
  const errors = form.formState.errors;
  const { icon, title, submit: submitLabel, done } = copy[movement.kind];
  const unit = material.baseUnit;

  const locationOptions = useMemo(() => {
    const items = locations.data?.items ?? [];
    const labels = locationLabels(items);
    return items.map((place) => ({ value: place.id, label: labels.get(place.id) ?? place.name }));
  }, [locations.data]);
  const requesterOptions = useMemo(
    () => [{ value: NO_REQUESTER, label: 'Sin indicar' }, ...(borrowers.data?.items ?? []).map((member) => ({ value: member.id, label: member.name }))],
    [borrowers.data],
  );

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
          {
            productId: material.id,
            locationId: values.locationId,
            quantity,
            unit,
            ...(values.reference.trim() ? { reference: values.reference.trim() } : {}),
            ...(material.tracksExpiry ? { expiresOn: values.expiresOn } : {}),
            ...(material.tracksExpiry && values.lot.trim() ? { lot: values.lot.trim() } : {}),
          },
          form,
        );
        if (!payload) return;
        result = await receipt.mutateAsync(payload);
      } else if (movement.kind === 'issue') {
        const payload = validate(
          materialIssueRequest,
          {
            positionId: movement.line.positionId,
            quantity,
            unit,
            purpose: values.purpose,
            ...(values.requesterId !== NO_REQUESTER ? { requesterId: values.requesterId } : {}),
            detail: values.detail.trim(),
          },
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
  const expiry = where ? expiryStatus(where.expiresOn, todayInZone(me.workspace.timeZone)) : null;
  return (
    <FormSheet
      icon={icon}
      title={title}
      description={
        where ? (
          <>
            {material.name} en {where.locationPath.join(' › ')}
            {where.lot ? `, lote ${where.lot}` : ''}. Existencia <Quantity value={where.balance} unit={unit} />, disponible <Quantity value={where.available} unit={unit} />.
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
      <Field label={`Cantidad (${unitText(unit, '0')})`} required error={errors.quantity?.message}>
        <Input inputMode="decimal" autoComplete="off" className="h-11 sm:h-10" {...form.register('quantity')} />
      </Field>
      {movement.kind === 'receipt' && material.tracksExpiry ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vence el" required hint="La fecha impresa en el envase." error={errors.expiresOn?.message}>
            <Input type="date" className="h-11 sm:h-10" {...form.register('expiresOn')} />
          </Field>
          <Field label="Lote" optional hint="El del proveedor; el mismo lote suma al anterior." error={errors.lot?.message}>
            <Input maxLength={100} autoComplete="off" className="h-11 sm:h-10" {...form.register('lot')} />
          </Field>
        </div>
      ) : null}
      {movement.kind === 'receipt' ? (
        <Field label="Referencia" optional hint="Factura, guía o nota del ingreso." error={errors.reference?.message}>
          <Input maxLength={200} autoComplete="off" className="h-11 sm:h-10" {...form.register('reference')} />
        </Field>
      ) : null}
      {movement.kind === 'adjust' ? (
        <Field label="Motivo" required hint="Por qué cambia el saldo: conteo, corrección…" error={errors.reason?.message}>
          <Input maxLength={500} autoComplete="off" className="h-11 sm:h-10" {...form.register('reason')} />
        </Field>
      ) : null}
      {movement.kind === 'issue' ? (
        <>
          {expiry?.tone === 'danger' && where?.expiresOn ? (
            <p role="status" className="flex items-start gap-2 rounded-panel bg-surface-sunken px-3 py-2.5 text-sm text-danger">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Este lote venció el {formatDate(where.expiresOn)}. La salida se puede registrar y queda en el libro.
            </p>
          ) : null}
          <Field label="Para qué sale" required>
            <Controller
              control={form.control}
              name="purpose"
              render={({ field }) => <Segmented label="Para qué sale" value={field.value} onValueChange={field.onChange} options={purposeOptions} />}
            />
          </Field>
          <Field label={purposeCopy[purpose].detail} required hint={purposeCopy[purpose].hint} error={errors.detail?.message}>
            <Input maxLength={500} autoComplete="off" className="h-11 sm:h-10" {...form.register('detail')} />
          </Field>
          <Field label="Quién lo pidió" optional hint="Un miembro del espacio: el docente o el estudiante." error={errors.requesterId?.message}>
            <Controller
              control={form.control}
              name="requesterId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} placeholder={borrowers.isPending ? 'Cargando…' : 'Sin indicar'} options={requesterOptions} />
              )}
            />
          </Field>
        </>
      ) : null}
    </FormSheet>
  );
}
