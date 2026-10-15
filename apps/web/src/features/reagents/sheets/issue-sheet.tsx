import { issueRequest, issueResponse, type Position } from '@platlab/contracts';
import {
  Band,
  Button,
  Field,
  Input,
  Quantity,
  Select,
  StockLevelBar,
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
import { FlaskConical, LogOut, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { isApiError } from '../../../app/api';
import { formatDate } from '../../../app/format';
import { useDestinations, useReasons } from '../queries';
import { ChoiceField } from '../choices';
import { commandErrorMessage, useCommand } from '../commands';
import { ControlledMark } from '../controlled';
import { SdsReference } from '../sds';
import { formatGrams, grossFor } from '../weight';
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
  // En balanza (ADR 0015): lo que quedará físicamente (el saldo, con lo apartado) más la tara.
  const left = position && quantity ? subtractDecimal(position.balance, quantity) : null;
  const onScale = position && left !== null && !left.startsWith('-') ? grossFor(position, left) : null;
  // Con algo apartado, las cifras dicen «disponible»: el saldo del frasco no es lo que se puede sacar.
  const reservedNote = position && position.reserved !== '0' ? ' disponibles' : '';
  // La barra del stock cuenta lo que quedará (o lo disponible si aún no hay cantidad) frente a lo que entró.
  const barBase = remaining !== null && !remaining.startsWith('-') ? remaining : available;
  const stockPercent = position?.container?.initialQuantity && barBase ? ratioPercent(barBase, position.container.initialQuantity) : null;
  // Con cantidad escrita y válida (decimal, mayor que cero) se puede enviar; si no alcanza, lo dice el servidor.
  const hasQuantity = /^\d{1,15}(\.\d{1,9})?$/.test(quantity) && !/^0+(\.0+)?$/.test(quantity);
  const issuable = scoped.filter((p) => availableOf(p) !== '0');
  // El selector solo hace falta si hay de dónde elegir: se abrió sin frasco ni reactivo (se queda para poder
  // cambiar), aún no hay frasco, o el reactivo tiene más de un frasco con saldo.
  const showSelector =
    (!positionId && !productId) || !position || issuable.filter((p) => p.product.id === position.product.id).length > 1;
  const expired = position !== undefined && isExpired(position, today);
  const hasTop = needsApproval || showSelector || suggestion !== null || expired;

  const setShortcut = (percent: 25 | 50 | 100) => {
    if (!position) return;
    const value = percentOfDecimal(availableOf(position), percent);
    // Sin separador de miles: «2.257» volvería como 2,257 al normalizar el campo.
    if (value) form.setValue('quantity', toDecimalInput(value), { shouldValidate: false });
  };

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
      icon={FlaskConical}
      // Como el modal de ReactiLab: el reactivo es el título; el frasco elegido, su código, si es controlado y
      // su ficha de seguridad (ADR 0016).
      title={position?.product.name ?? (needsApproval ? 'Solicitar salida' : 'Registrar salida')}
      description={
        position ? (
          <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-mono text-[13px] tabular-nums text-ink-muted">{position.container?.code ?? position.lot.code}</span>
            {position.product.controlled ? (
              <span className="inline-flex h-6 items-center rounded-full bg-action-soft px-2.5 text-xs">
                <ControlledMark withText className="gap-1 font-semibold [&>svg]:size-3" />
              </span>
            ) : null}
            <SdsReference kind={position.product.sdsKind} url={position.product.sdsFileUrl ?? position.product.sdsUrl} className="text-xs [&>svg]:size-3" />
          </span>
        ) : (
          'Elige el frasco del que sale.'
        )
      }
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={needsApproval ? 'Enviar solicitud' : 'Confirmar salida'}
      fullWidthSubmit
      submitIcon={LogOut}
      submitDisabled={!position || !hasQuantity}
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      {hasTop ? (
        <div className="grid grid-cols-1 gap-3">
          {needsApproval ? (
            <p className="rounded-control bg-action-soft px-3 py-2.5 text-sm text-ink">
              Solicitud de salida: la cantidad queda apartada del frasco hasta que un Administrador apruebe la salida.
            </p>
          ) : null}
          {showSelector ? (
            <Field label="Frasco" error={errors.positionId?.message} labelClassName={sectionLabel}>
              <Controller
                control={form.control}
                name="positionId"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    options={issuable.sort(byProductThenExpiry).map(issueOption)}
                    placeholder={productId ? 'Elige el frasco' : 'Elige reactivo, frasco y ubicación'}
                    triggerClassName="h-9 bg-white/60 text-[13px]"
                  />
                )}
              />
            </Field>
          ) : null}
          {position && expired ? (
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
      ) : null}
      {position && available !== null ? (
        <Band
          label={position.reserved === '0' ? 'Stock actual' : 'Stock disponible'}
          aside={<Quantity value={available} unit={position.unit} className="text-lg font-bold text-ink" />}
        >
          {stockPercent !== null ? <StockLevelBar percent={stockPercent} /> : null}
          {remaining === null || !remaining.startsWith('-') ? (
            <div className="mt-2 text-right">
              <p className="text-sm text-ink-muted">
                Quedarán:{' '}
                <Quantity
                  value={remaining ?? available}
                  unit={position.unit}
                  className="font-bold text-success"
                  unitClassName="font-bold text-success"
                />
                {reservedNote}
              </p>
              {onScale ? (
                <p className="mt-0.5 text-xs text-ink-muted">
                  En balanza: <span className="tabular-nums">{formatGrams(onScale)}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </Band>
      ) : null}
      <div className="grid grid-cols-1 gap-4">
        <Field
          label="Cantidad a retirar"
          className="text-center"
          labelClassName={sectionLabel}
          error={errors.quantity?.message}
          hint={
            position && available !== null && remaining !== null && remaining.startsWith('-') ? (
              <span className="font-medium text-danger">
                No alcanza: el frasco tiene {formatDecimal(available)} {position.unit}
                {reservedNote}.
              </span>
            ) : position && available !== null && position.reserved !== '0' ? (
              <span>
                <Quantity value={position.reserved} unit={position.unit} /> apartados en solicitudes.
              </span>
            ) : undefined
          }
        >
          {/* La cantidad es el centro de la ventana: grande, sin caja y con la unidad al lado. */}
          <div className="relative mx-auto w-full max-w-xs">
            <Input
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              className="h-16 rounded-2xl border-0 bg-transparent px-14 text-center text-5xl font-bold tabular-nums placeholder:text-ink-subtle/80 aria-[invalid=true]:text-danger aria-[invalid=true]:ring-0"
              {...form.register('quantity')}
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xl text-ink-muted">
              {position?.unit ?? ''}
            </span>
          </div>
        </Field>
        {position ? (
          <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Atajos de cantidad">
            {([25, 50] as const).map((percent) => (
              <button
                key={percent}
                type="button"
                onClick={() => setShortcut(percent)}
                className="inline-flex h-9 items-center rounded-full border border-line bg-white/60 px-5 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:bg-white hover:text-ink"
              >
                {percent} %
              </button>
            ))}
            <button
              type="button"
              aria-label="Todo el frasco"
              onClick={() => setShortcut(100)}
              className="inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold text-action transition-colors hover:bg-action-soft"
            >
              Todo
            </button>
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
            icon={MapPin}
          />
        )}
      />
    </FormSheet>
  );
}
