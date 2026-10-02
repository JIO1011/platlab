import {
  adjustmentRequest,
  createLotRequest,
  createProductRequest,
  issueRequest,
  lot as lotContract,
  movementResponse,
  product as productContract,
  receiptRequest,
  type Position,
  type Product,
} from '@platlab/contracts';
import {
  Button,
  Field,
  Input,
  Quantity,
  Select,
  Sheet,
  formatDecimal,
  normalizeDecimalInput,
  toast,
  type SelectOption,
} from '@platlab/ui';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { isApiError } from '../../app/api';
import { formatDate } from '../../app/format';
import { useLots, useReceiptLocations } from '../../app/queries';
import { commandErrorMessage, fieldErrors, useCommand } from './commands';

const units: SelectOption[] = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'mg', label: 'Miligramos (mg)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'mL', label: 'Mililitros (mL)' },
  { value: 'L', label: 'Litros (L)' },
  { value: 'u', label: 'Unidades (u)' },
];

const physicalStates: SelectOption[] = [
  { value: 'solid', label: 'Sólido' },
  { value: 'liquid', label: 'Líquido' },
  { value: 'gas', label: 'Gas' },
];

interface SheetBaseProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Valida con el contrato de la API y, si falla, marca cada campo con su motivo. */
function validate<S extends z.ZodType, F extends FieldValues>(
  schema: S,
  payload: unknown,
  form: UseFormReturn<F>,
): z.infer<S> | null {
  const parsed = schema.safeParse(payload);
  if (parsed.success) return parsed.data;
  for (const [field, message] of Object.entries(fieldErrors(parsed.error))) {
    form.setError(field as Path<F>, { message });
  }
  return null;
}

function FormSheet({
  title,
  description,
  open,
  onOpenChange,
  submitLabel,
  pending,
  generalError,
  onSubmit,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitLabel: string;
  pending: boolean;
  generalError: string | null;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const formId = `form-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={pending}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {generalError ? (
          <p role="alert" className="rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {generalError}
          </p>
        ) : null}
        {children}
      </form>
    </Sheet>
  );
}

/** Texto «se registrará …» con la cantidad tal como la entenderá el servidor. */
function QuantityPreview({ raw, unit, sign = '' }: { raw: string; unit: string | undefined; sign?: '' | '-' }) {
  const normalized = normalizeDecimalInput(raw);
  if (!unit || !/^\d{1,15}(\.\d{1,9})?$/.test(normalized) || /^0+(\.0+)?$/.test(normalized)) return null;
  return (
    <span>
      Se registrará <Quantity value={`${sign}${normalized}`} unit={unit} signed className="font-medium text-ink" />
    </span>
  );
}

/** Lote y ubicación por su nombre, agrupados por reactivo, con el saldo como dato secundario. */
const positionOption = (position: Position): SelectOption => ({
  value: position.id,
  label: `${position.lot.code} · ${position.location.name}`,
  detail: `${formatDecimal(position.balance)} ${position.unit}`,
  group: position.product.name,
});

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export function NewProductSheet({ workspaceId, open, onOpenChange }: SheetBaseProps) {
  const command = useCommand(workspaceId, '/products', productContract);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { code: '', name: '', baseUnit: 'g', casNumber: '', physicalState: '' },
  });
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    const payload = validate(
      createProductRequest,
      {
        code: values.code.trim(),
        name: values.name.trim(),
        baseUnit: values.baseUnit,
        casNumber: values.casNumber.trim() || null,
        physicalState: values.physicalState || null,
      },
      form,
    );
    if (!payload) return;
    try {
      const created = await command.mutateAsync(payload);
      toast.success('Reactivo creado', { description: `${created.code} · ${created.name}` });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      title="Nuevo reactivo"
      description="Se crea en el catálogo del espacio. Después podrás registrar sus lotes."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Crear reactivo"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Field label="Código" error={errors.code?.message} hint="Único en el espacio.">
          <Input autoComplete="off" spellCheck={false} {...form.register('code')} />
        </Field>
        <Field label="Nombre" error={errors.name?.message}>
          <Input autoComplete="off" {...form.register('name')} />
        </Field>
      </div>
      <Field label="Unidad base" error={errors.baseUnit?.message} hint="Las cantidades de este reactivo se registran siempre en esta unidad.">
        <Controller
          control={form.control}
          name="baseUnit"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} options={units} placeholder="Elige una unidad" />
          )}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Número CAS" optional error={errors.casNumber?.message} hint="Por ejemplo, 7647-14-5.">
          <Input inputMode="numeric" autoComplete="off" spellCheck={false} {...form.register('casNumber')} />
        </Field>
        <Field label="Estado físico" optional error={errors.physicalState?.message}>
          <Controller
            control={form.control}
            name="physicalState"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange} options={physicalStates} placeholder="Sin indicar" />
            )}
          />
        </Field>
      </div>
    </FormSheet>
  );
}

export function NewLotSheet({
  workspaceId,
  open,
  onOpenChange,
  products,
  productId,
}: SheetBaseProps & { products: Product[]; productId: string | undefined }) {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { productId: productId ?? '', code: '', supplierName: '', supplierLot: '', expiresOn: '' },
  });
  const selected = form.watch('productId');
  const command = useCommand(workspaceId, `/products/${selected}/lots`, lotContract);
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    if (!values.productId) {
      form.setError('productId', { message: 'Elige el reactivo del lote.' });
      return;
    }
    const payload = validate(
      createLotRequest,
      {
        code: values.code.trim(),
        supplierName: values.supplierName.trim() || null,
        supplierLot: values.supplierLot.trim() || null,
        expiresOn: values.expiresOn || null,
      },
      form,
    );
    if (!payload) return;
    try {
      const created = await command.mutateAsync(payload);
      toast.success('Lote creado', { description: created.code });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      title="Nuevo lote"
      description="Un lote pertenece a un solo reactivo. Lo que no sepas puede quedar como desconocido."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Crear lote"
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
              onValueChange={field.onChange}
              options={products.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
              placeholder="Elige un reactivo"
            />
          )}
        />
      </Field>
      <Field label="Código del lote" error={errors.code?.message} hint="Interno; el lote del proveedor va aparte.">
        <Input autoComplete="off" spellCheck={false} {...form.register('code')} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Proveedor" optional error={errors.supplierName?.message}>
          <Input autoComplete="organization" {...form.register('supplierName')} />
        </Field>
        <Field label="Lote del proveedor" optional error={errors.supplierLot?.message}>
          <Input autoComplete="off" {...form.register('supplierLot')} />
        </Field>
      </div>
      <Field label="Caducidad" optional error={errors.expiresOn?.message} hint="Déjala vacía si no la conoces: quedará como desconocida.">
        <Input type="date" {...form.register('expiresOn')} />
      </Field>
    </FormSheet>
  );
}

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

export function ReceiptSheet({
  workspaceId,
  open,
  onOpenChange,
  products,
  productId,
}: SheetBaseProps & { products: Product[]; productId: string | undefined }) {
  const command = useCommand(workspaceId, '/receipts', movementResponse);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { productId: productId ?? '', lotId: '', locationId: '', quantity: '', reference: '' },
  });
  const selectedProduct = products.find((p) => p.id === form.watch('productId'));
  const lots = useLots(workspaceId, selectedProduct?.id);
  const locations = useReceiptLocations(workspaceId, open);
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    if (!selectedProduct) {
      form.setError('productId', { message: 'Elige el reactivo que ingresa.' });
      return;
    }
    const payload = validate(
      receiptRequest,
      {
        lotId: values.lotId,
        locationId: values.locationId,
        quantity: normalizeDecimalInput(values.quantity),
        unit: selectedProduct.baseUnit,
        reference: values.reference.trim() || null,
      },
      form,
    );
    if (!payload) return;
    try {
      const result = await command.mutateAsync(payload);
      toast.success('Ingreso registrado', {
        description: `Saldo en la ubicación: ${formatDecimal(result.balance)} ${result.unit}`,
      });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(commandErrorMessage(error));
    }
  });

  const lotOptions = (lots.data?.items ?? [])
    .filter((lot) => lot.condition !== 'discarded')
    .map((lot) => ({
      value: lot.id,
      label: lot.code,
      detail: lot.expiresOn ? `Caduca ${formatDate(lot.expiresOn)}` : 'Caducidad desconocida',
    }));

  return (
    <FormSheet
      title="Registrar ingreso"
      description="Suma existencias de un lote en una ubicación."
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
      <Field
        label="Lote"
        error={errors.lotId?.message}
        hint={selectedProduct && lots.data?.items.length === 0 ? 'Este reactivo aún no tiene lotes: créalo primero.' : undefined}
      >
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
      <Field
        label="Cantidad"
        error={errors.quantity?.message}
        hint={<QuantityPreview raw={form.watch('quantity')} unit={selectedProduct?.baseUnit} />}
      >
        <div className="relative">
          <Input inputMode="decimal" autoComplete="off" className="pr-14 tabular-nums" {...form.register('quantity')} />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
            {selectedProduct?.baseUnit ?? ''}
          </span>
        </div>
      </Field>
      <Field label="Referencia" optional error={errors.reference?.message} hint="Factura, guía de remisión u orden de compra.">
        <Input autoComplete="off" {...form.register('reference')} />
      </Field>
    </FormSheet>
  );
}

export function IssueSheet({
  workspaceId,
  open,
  onOpenChange,
  positions,
  positionId,
}: SheetBaseProps & { positions: Position[]; positionId: string | undefined }) {
  const command = useCommand(workspaceId, '/issues', movementResponse);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { positionId: positionId ?? '', quantity: '', reason: '', destination: '' } });
  const position = positions.find((p) => p.id === form.watch('positionId'));
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    const payload = validate(
      issueRequest,
      {
        positionId: values.positionId,
        quantity: normalizeDecimalInput(values.quantity),
        unit: position?.unit ?? '',
        reason: values.reason.trim(),
        destination: values.destination.trim(),
      },
      form,
    );
    if (!payload) return;
    try {
      const result = await command.mutateAsync(payload);
      toast.success('Salida registrada', {
        description: `Saldo en la ubicación: ${formatDecimal(result.balance)} ${result.unit}`,
      });
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error, 'INSUFFICIENT_STOCK')) form.setError('quantity', { message: commandErrorMessage(error) });
      else setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      title="Registrar salida"
      description="Descuenta existencias de una ubicación. El saldo se confirma al registrar."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Registrar salida"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <Field label="Desde" error={errors.positionId?.message}>
        <Controller
          control={form.control}
          name="positionId"
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              options={positions.filter((p) => p.balance !== '0').map(positionOption)}
              placeholder="Elige reactivo, lote y ubicación"
            />
          )}
        />
      </Field>
      {position ? (
        <div className="flex items-baseline justify-between rounded-control bg-surface-sunken px-3 py-2.5 text-sm">
          <span className="text-ink-muted">Saldo disponible</span>
          <Quantity value={position.balance} unit={position.unit} className="font-semibold text-ink" />
        </div>
      ) : null}
      <Field label="Cantidad" error={errors.quantity?.message} hint={<QuantityPreview raw={form.watch('quantity')} unit={position?.unit} sign="-" />}>
        <div className="relative">
          <Input inputMode="decimal" autoComplete="off" className="pr-14 tabular-nums" {...form.register('quantity')} />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
            {position?.unit ?? ''}
          </span>
        </div>
      </Field>
      <Field label="Motivo" error={errors.reason?.message} hint="Por ejemplo: práctica de Química General.">
        <Input autoComplete="off" {...form.register('reason')} />
      </Field>
      <Field label="Destino" error={errors.destination?.message} hint="Laboratorio, docente o área que recibe.">
        <Input autoComplete="off" {...form.register('destination')} />
      </Field>
    </FormSheet>
  );
}

export function AdjustmentSheet({
  workspaceId,
  open,
  onOpenChange,
  positions,
  positionId,
}: SheetBaseProps & { positions: Position[]; positionId: string | undefined }) {
  const command = useCommand(workspaceId, '/adjustments', movementResponse);
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
        description: `Saldo en la ubicación: ${formatDecimal(result.balance)} ${result.unit}`,
      });
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error, 'INSUFFICIENT_STOCK')) form.setError('quantity', { message: 'El ajuste dejaría el saldo por debajo de cero.' });
      else setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      title="Ajustar existencias"
      description="Corrige el saldo tras un conteo con otro movimiento; el historial no se edita."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Registrar ajuste"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <Field label="Ubicación" error={errors.positionId?.message}>
        <Controller
          control={form.control}
          name="positionId"
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              options={positions.map(positionOption)}
              placeholder="Elige reactivo, lote y ubicación"
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
        error={errors.quantity?.message}
        hint={<QuantityPreview raw={form.watch('quantity')} unit={position?.unit} sign={direction === 'decrease' ? '-' : ''} />}
      >
        <div className="relative">
          <Input inputMode="decimal" autoComplete="off" className="pr-14 tabular-nums" {...form.register('quantity')} />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
            {position?.unit ?? ''}
          </span>
        </div>
      </Field>
      <Field label="Motivo" error={errors.reason?.message} hint="Obligatorio. Por ejemplo: conteo mensual.">
        <Input autoComplete="off" {...form.register('reason')} />
      </Field>
    </FormSheet>
  );
}
