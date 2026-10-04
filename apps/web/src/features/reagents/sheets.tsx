import {
  adjustmentRequest,
  createProductRequest,
  issueRequest,
  movementResponse,
  product as productContract,
  receiptRequest,
  receiptResponse,
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
  percentOfDecimal,
  subtractDecimal,
  toast,
  type SelectOption,
} from '@platlab/ui';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { isApiError } from '../../app/api';
import { formatDate } from '../../app/format';
import { useDestinations, useLots, useReasons, useReceiptLocations } from '../../app/queries';
import { ChoiceField } from './choices';
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

const expiryText = (position: Position) =>
  position.lot.expiresOn ? `caduca ${formatDate(position.lot.expiresOn)}` : 'caducidad sin confirmar';

/**
 * Frasco y ubicación, agrupados por reactivo, con saldo y caducidad como dato secundario
 * (ADR 0012): elegir un frasco es decidir cuál vence antes.
 */
const positionOption = (position: Position): SelectOption => ({
  value: position.id,
  label: `${position.container?.code ?? position.lot.code} · ${position.location.name}`,
  detail: `${formatDecimal(position.balance)} ${position.unit} · ${expiryText(position)}`,
  group: position.product.name,
});

/** Orden FEFO dentro de cada reactivo: por nombre, luego por caducidad (desconocida al final). */
const byProductThenExpiry = (a: Position, b: Position) =>
  a.product.name.localeCompare(b.product.name) ||
  (a.lot.expiresOn ?? '9999-12-31').localeCompare(b.lot.expiresOn ?? '9999-12-31') ||
  (a.container?.code ?? '').localeCompare(b.container?.code ?? '');

/** Fecha de hoy en la zona del espacio, como AAAA-MM-DD, para comparar caducidades. */
const todayIn = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

const isExpired = (position: Position, today: string) => position.lot.expiresOn !== null && position.lot.expiresOn < today;

/**
 * Sugerencia FEFO (01 §6.1, ADR 0012): entre los frascos utilizables del mismo reactivo con saldo,
 * el que vence antes; una caducidad desconocida va al final. Nunca el de menor cantidad.
 */
function fefoCandidates(positions: Position[], productId: string, today: string): Position[] {
  return positions
    .filter(
      (p) =>
        p.product.id === productId &&
        p.balance !== '0' &&
        p.lot.condition === 'enabled' &&
        p.disposition === 'usable' &&
        !isExpired(p, today),
    )
    .sort(byProductThenExpiry);
}

function fefoSuggestion(positions: Position[], chosen: Position, today: string): Position | null {
  const candidates = positions
    .filter(
      (p) =>
        p.product.id === chosen.product.id &&
        p.balance !== '0' &&
        p.lot.condition === 'enabled' &&
        p.disposition === 'usable' &&
        !isExpired(p, today),
    )
    .sort((a, b) =>
      (a.lot.expiresOn ?? '9999-12-31').localeCompare(b.lot.expiresOn ?? '9999-12-31') ||
      (a.container?.code ?? '').localeCompare(b.container?.code ?? ''),
    );
  const first = candidates[0];
  if (!first || first.id === chosen.id) return null;
  // Solo se sugiere si de verdad vence antes que el elegido.
  if (chosen.lot.expiresOn !== null && first.lot.expiresOn !== null && first.lot.expiresOn >= chosen.lot.expiresOn) {
    return null;
  }
  return first;
}

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
}: SheetBaseProps & { products: Product[]; productId: string | undefined }) {
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
    .filter((lot) => lot.condition !== 'discarded')
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
      toast.success(codes.length === 1 ? 'Frasco registrado' : `${codes.length} frascos registrados`, {
        description: `${codes.join(', ')} · ${formatDecimal(result.containers[0]?.quantity ?? '0')} ${result.unit} cada uno`,
      });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
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

/**
 * Salida de un frasco (ADR 0012): atajos de cantidad y lo que quedará, sugerencia FEFO, aviso si
 * el frasco está vencido (se permite, con advertencia) y motivo y destino de las listas.
 */
export function IssueSheet({
  workspaceId,
  open,
  onOpenChange,
  positions,
  positionId,
  productId,
  timeZone,
  canManageLists,
}: SheetBaseProps & {
  positions: Position[];
  positionId: string | undefined;
  /** Desde la ficha: solo frascos de ese reactivo y el FEFO ya elegido (01 §6.1). */
  productId?: string | undefined;
  timeZone: string;
  canManageLists: boolean;
}) {
  const command = useCommand(workspaceId, '/issues', movementResponse);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const today = todayIn(timeZone);
  const scoped = productId ? positions.filter((p) => p.product.id === productId) : positions;
  const preselected = positionId ?? (productId ? fefoCandidates(positions, productId, today)[0]?.id : undefined);
  const form = useForm({ defaultValues: { positionId: preselected ?? '', quantity: '', reason: '', destination: '' } });
  const position = positions.find((p) => p.id === form.watch('positionId'));
  const reasons = useReasons(workspaceId, 'issue', open);
  const destinations = useDestinations(workspaceId, open);
  const errors = form.formState.errors;
  const suggestion = position ? fefoSuggestion(positions, position, today) : null;
  const quantity = normalizeDecimalInput(form.watch('quantity'));
  const remaining = position && quantity ? subtractDecimal(position.balance, quantity) : null;

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
        description: `Quedan ${formatDecimal(result.balance)} ${result.unit} en el frasco`,
      });
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error, 'INSUFFICIENT_STOCK')) {
        // El servidor confirma que no alcanza; se dice cuánto hay, como la pista local.
        form.setError('quantity', {
          message: position
            ? `No alcanza: el frasco tiene ${formatDecimal(position.balance)} ${position.unit}.`
            : commandErrorMessage(error),
        });
      } else setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      title="Registrar salida"
      description="Descuenta de un frasco. El saldo se confirma al registrar."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Registrar salida"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <Field label="Frasco" error={errors.positionId?.message}>
        <Controller
          control={form.control}
          name="positionId"
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              options={scoped.filter((p) => p.balance !== '0').sort(byProductThenExpiry).map(positionOption)}
              placeholder={productId ? 'Elige el frasco' : 'Elige reactivo, frasco y ubicación'}
            />
          )}
        />
      </Field>
      {position && isExpired(position, today) ? (
        <p role="alert" className="rounded-control bg-warning-soft px-3 py-2.5 text-sm text-warning">
          Este frasco venció el {formatDate(position.lot.expiresOn ?? '')}. Puedes registrar la salida; quedará en el
          historial con su caducidad.
        </p>
      ) : null}
      {suggestion ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-action-soft px-3 py-2.5 text-sm text-ink">
          <span>
            Vence antes: <strong className="font-semibold">{suggestion.container?.code ?? suggestion.lot.code}</strong>
            {suggestion.lot.expiresOn ? ` (${formatDate(suggestion.lot.expiresOn)})` : ''}.
          </span>
          <Button type="button" size="sm" onClick={() => form.setValue('positionId', suggestion.id)}>
            Usar ese frasco
          </Button>
        </div>
      ) : null}
      <Field
        label="Cantidad"
        error={errors.quantity?.message}
        hint={
          position && remaining !== null ? (
            remaining.startsWith('-') ? (
              <span className="font-medium text-danger">No alcanza: el frasco tiene {formatDecimal(position.balance)} {position.unit}.</span>
            ) : (
              <span>
                Quedarán <Quantity value={remaining} unit={position.unit} className="font-medium text-ink" /> en el frasco.
              </span>
            )
          ) : position ? (
            <span>
              Hay <Quantity value={position.balance} unit={position.unit} className="font-medium text-ink" /> en el frasco.
            </span>
          ) : undefined
        }
      >
        <div className="relative">
          <Input inputMode="decimal" autoComplete="off" className="pr-14 tabular-nums" {...form.register('quantity')} />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
            {position?.unit ?? ''}
          </span>
        </div>
      </Field>
      {position ? (
        <div className="-mt-2 flex flex-wrap gap-2" role="group" aria-label="Atajos de cantidad">
          {([25, 50, 100] as const).map((percent) => (
            <button
              key={percent}
              type="button"
              onClick={() => {
                const value = percentOfDecimal(position.balance, percent);
                if (value) form.setValue('quantity', formatDecimal(value), { shouldValidate: false });
              }}
              className="inline-flex h-9 items-center rounded-full border border-line px-3.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              {percent === 100 ? 'Todo el frasco' : `${percent} %`}
            </button>
          ))}
        </div>
      ) : null}
      <Controller
        control={form.control}
        name="reason"
        render={({ field }) => (
          <ChoiceField
            workspaceId={workspaceId}
            label="Motivo"
            error={errors.reason?.message}
            options={reasons.data?.items ?? []}
            loading={reasons.isPending}
            value={field.value}
            onChange={field.onChange}
            canAdd={canManageLists}
            addPath="/reasons"
            addBody={(name) => ({ kind: 'issue', name })}
            addLabel="Nuevo motivo"
          />
        )}
      />
      <Controller
        control={form.control}
        name="destination"
        render={({ field }) => (
          <ChoiceField
            workspaceId={workspaceId}
            label="Destino"
            error={errors.destination?.message}
            options={destinations.data?.items ?? []}
            loading={destinations.isPending}
            value={field.value}
            onChange={field.onChange}
            canAdd={canManageLists}
            addPath="/destinations"
            addBody={(name) => ({ name })}
            addLabel="Nuevo destino"
          />
        )}
      />
    </FormSheet>
  );
}

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
      title="Ajustar existencias"
      description="Corrige el saldo tras un conteo con otro movimiento; el historial no se edita."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Registrar ajuste"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
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
