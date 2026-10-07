import { issueRequest, issueResponse, type Position } from '@platlab/contracts';
import {
  Button,
  Field,
  Input,
  Quantity,
  Select,
  formatDecimal,
  ratioPercent,
  sectionLabel,
  normalizeDecimalInput,
  percentOfDecimal,
  subtractDecimal,
  toDecimalInput,
  toast,
  type SelectOption,
} from '@platlab/ui';
import { ArrowUpFromLine } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { isApiError } from '../../../app/api';
import { formatDate } from '../../../app/format';
import { useDestinations, useReasons } from '../../../app/queries';
import { ChoiceField } from '../choices';
import { commandErrorMessage, useCommand } from '../commands';
import { availableOf } from '../stock';
import { type SheetBaseProps, validate, FormSheet, expiryText, positionOption, byProductThenExpiry, isExpired } from './shared';
import { fefoCandidates, fefoSuggestion } from './fefo';

/** En la salida, lo disponible: lo apartado por solicitudes no se ofrece (ADR 0012). */
const issueOption = (position: Position): SelectOption => {
  const available = availableOf(position);
  const amount =
    position.reserved === '0'
      ? `${formatDecimal(available)} ${position.unit}`
      : `${formatDecimal(available)} ${position.unit} disponibles`;
  return { ...positionOption(position), detail: `${amount} · ${expiryText(position)}` };
};

/** Fecha de hoy en la zona del espacio, como AAAA-MM-DD, para comparar caducidades. */
const todayIn = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

/**
 * Salida de un frasco (ADR 0012): atajos de cantidad y lo que quedará, sugerencia FEFO, aviso si
 * el frasco está vencido (se permite, con advertencia) y motivo y destino de las listas. Para el
 * Operador es una solicitud que aparta la cantidad; lo decide el servidor y la respuesta lo dice.
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
  needsApproval,
}: SheetBaseProps & {
  positions: Position[];
  positionId: string | undefined;
  /** Desde la ficha: solo frascos de ese reactivo y el FEFO ya elegido (01 §6.1). */
  productId?: string | undefined;
  timeZone: string;
  canManageLists: boolean;
  /** Sin permiso de aprobar: la salida será una solicitud (solo cambia los textos). */
  needsApproval: boolean;
}) {
  const command = useCommand(workspaceId, '/issues', issueResponse);
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
  const available = position ? availableOf(position) : null;
  const remaining = available !== null && quantity ? subtractDecimal(available, quantity) : null;
  // Con algo apartado, las cifras dicen «disponible»: el saldo del frasco no es lo que se puede sacar.
  const reservedNote = position && position.reserved !== '0' ? ' disponibles' : '';
  // La barra del stock cuenta lo que quedará (o lo disponible si aún no hay cantidad) frente a lo que entró.
  const barBase = remaining !== null && !remaining.startsWith('-') ? remaining : available;
  const stockPercent = position?.container?.initialQuantity && barBase ? ratioPercent(barBase, position.container.initialQuantity) : null;

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
      if (result.status === 'pending') {
        toast.success('Solicitud enviada', {
          description: `Se apartaron ${formatDecimal(result.quantity)} ${result.unit} del frasco hasta que se apruebe. La verás en Solicitudes.`,
        });
      } else {
        toast.success('Salida registrada', {
          description: `Quedan ${formatDecimal(result.balance)} ${result.unit} en el frasco`,
        });
      }
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error, 'INSUFFICIENT_STOCK')) {
        // El servidor confirma que no alcanza; se dice cuánto hay, como la pista local.
        form.setError('quantity', {
          message:
            position && available !== null
              ? `No alcanza: el frasco tiene ${formatDecimal(available)} ${position.unit}${reservedNote}.`
              : commandErrorMessage(error),
        });
      } else setGeneralError(commandErrorMessage(error));
    }
  });

  return (
    <FormSheet
      sections
      icon={ArrowUpFromLine}
      title={needsApproval ? 'Solicitar salida' : 'Registrar salida'}
      description={
        needsApproval
          ? 'La cantidad queda apartada del frasco hasta que un Administrador apruebe la salida.'
          : 'Descuenta de un frasco. El saldo se confirma al registrar.'
      }
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={needsApproval ? 'Enviar solicitud' : 'Registrar salida'}
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
                options={scoped.filter((p) => availableOf(p) !== '0').sort(byProductThenExpiry).map(issueOption)}
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
      </div>
      <div className="grid grid-cols-1 gap-4">
      {position && available !== null ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className={sectionLabel}>Stock disponible</span>
            <Quantity value={available} unit={position.unit} className="text-lg font-bold text-ink" />
          </div>
          {stockPercent !== null ? (
            <div className="h-2 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
              <div className="h-full rounded-full bg-action transition-[width] duration-300" style={{ width: `${stockPercent}%` }} />
            </div>
          ) : null}
        </div>
      ) : null}
        <Field
          label="Cantidad"
          className="text-center"
          labelClassName={sectionLabel}
          error={errors.quantity?.message}
          hint={
            position && available !== null && remaining !== null ? (
              remaining.startsWith('-') ? (
                <span className="font-medium text-danger">
                  No alcanza: el frasco tiene {formatDecimal(available)} {position.unit}
                  {reservedNote}.
                </span>
              ) : (
                <span>
                  Quedarán <Quantity value={remaining} unit={position.unit} className="font-medium text-ink" />
                  {reservedNote} en el frasco.
                </span>
              )
            ) : position && available !== null ? (
              <span>
                Hay <Quantity value={available} unit={position.unit} className="font-medium text-ink" />
                {reservedNote} en el frasco
                {position.reserved !== '0' ? (
                  <>
                    {' '}
                    (<Quantity value={position.reserved} unit={position.unit} /> apartados en solicitudes)
                  </>
                ) : null}
                .
              </span>
            ) : undefined
          }
        >
          {/* La cantidad es el centro de la ventana: grande, centrada y con la unidad al lado. */}
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
        {position ? (
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Atajos de cantidad">
            {([25, 50, 100] as const).map((percent) => (
              <button
                key={percent}
                type="button"
                onClick={() => {
                  const value = percentOfDecimal(availableOf(position), percent);
                  // Sin separador de miles: «2.257» volvería como 2,257 al normalizar el campo.
                  if (value) form.setValue('quantity', toDecimalInput(value), { shouldValidate: false });
                }}
                className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:bg-surface-sunken hover:text-ink"
              >
                {percent === 100 ? 'Todo el frasco' : `${percent} %`}
              </button>
            ))}
          </div>
        ) : null}
      </div>
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
