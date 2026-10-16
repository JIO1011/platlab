import { resolveFaultRequest, type Fault } from '@platlab/contracts';
import { Badge, Button, Field, Sheet, Skeleton, Textarea, sectionLabel, toast } from '@platlab/ui';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CircleCheck, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { isApiError } from '../../../app/api';
import { formatDateTime, formatShortDateTime } from '../../../app/format';
import { type SheetBaseProps, validate } from '../../../app/form-sheet';
import { QueryErrorState } from '../../../app/states';
import { AssetThumb } from '../asset-list';
import { placeLines } from '../asset-text';
import { equipmentErrorMessage, useFaultStep } from '../commands';
import { faultStatusLabel, faultStatusTone, faultSteps, faultTypeLabel, personText, usableText } from '../fault-text';
import { useEquipmentKey, useFault } from '../queries';

const formId = 'form-resolver-falla';
const resolveButtonId = 'falla-resolver';

/** El equipo de la falla: miniatura, código, nombre y ubicación, con el enlace a su ficha si puede verla. */
function FaultAsset({ fault, fichaTo }: { fault: Fault; fichaTo: string | null }) {
  const place = placeLines(fault.asset.location);
  return (
    <div className="flex items-center gap-3 rounded-control bg-surface-sunken px-3 py-2.5">
      <AssetThumb asset={fault.asset} />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold text-ink">
          <span className="font-mono text-[13px] font-normal tabular-nums text-ink-muted">{fault.asset.code}</span> {fault.asset.name}
        </p>
        <p className="break-words text-[13px] text-ink-muted">{place.full}</p>
      </div>
      {fichaTo ? (
        <Link
          to={fichaTo}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[6px] px-2 text-[13px] font-medium text-action hover:bg-action-soft sm:min-h-8"
        >
          Ver ficha
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/** Los pasos de la falla: quién y cuándo (zona del espacio); «Resuelta» trae su resultado. */
function FaultTimeline({ fault, timeZone }: { fault: Fault; timeZone: string }) {
  return (
    <ol className="relative space-y-5 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-0.5 before:bg-line">
      {faultSteps(fault).map((step) => (
        <li key={step.key} className="flex items-start gap-3">
          <span className="relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-action-soft text-action ring-4 ring-surface">
            <CircleCheck className="size-4" aria-hidden />
          </span>
          <div className="grid min-w-0 flex-1 gap-1 pt-1">
            <p className="text-sm font-bold text-ink">{step.label}</p>
            {step.note ? <p className="whitespace-pre-wrap break-words text-sm text-ink">{step.note}</p> : null}
            <p className="text-[13px] text-ink-muted">
              {personText(step.by === null ? null : { name: step.by })} ·{' '}
              <time dateTime={step.at} title={formatDateTime(step.at, timeZone)}>
                {formatShortDateTime(step.at, timeZone)}
              </time>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Detalle de la falla (ADR 0019), en una hoja sobre la lista: el equipo, qué se reportó y su línea de tiempo.
 * Quien atiende (y puede operar) ve el paso que sigue: Atender o Resolver una abierta, Resolver una en
 * atención, Cerrar una resuelta. «Resolver» abre en esta misma hoja pidiendo el resultado. Sin interfaz
 * optimista: la falla cambia con lo que el servidor confirma, y si otra persona se adelantó, se recarga.
 */
export function FaultSheet({
  workspaceId,
  open,
  onOpenChange,
  faultId,
  timeZone,
  canHandle,
  fichaBase,
}: SheetBaseProps & {
  faultId: string;
  timeZone: string;
  /** Puede atender: `equipment.fault.manage` y Equipos admite cambios. */
  canHandle: boolean;
  /** `/e/:espacio/equipos/inventario` si puede leer el catálogo; sin eso, la falla no enlaza a la ficha. */
  fichaBase: string | null;
}) {
  const fault = useFault(workspaceId, faultId, open);
  const attend = useFaultStep(workspaceId, faultId, 'attend');
  const resolve = useFaultStep(workspaceId, faultId, 'resolve');
  const close = useFaultStep(workspaceId, faultId, 'close');
  const queryClient = useQueryClient();
  const equipmentKey = useEquipmentKey(workspaceId);
  const [resolving, setResolving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { resolution: '', returnToOperational: false } });
  const errors = form.formState.errors;
  const resolutionField = form.register('resolution');
  const wasResolving = useRef(false);

  // Al volver de «Resolver», el foco regresa al botón que lo abrió (el que lo tenía se desmontó).
  useEffect(() => {
    if (wasResolving.current && !resolving) document.getElementById(resolveButtonId)?.focus();
    wasResolving.current = resolving;
  }, [resolving]);

  const failed = (error: unknown) => {
    setGeneralError(equipmentErrorMessage(error));
    // Otra persona ya avanzó la falla: se recarga y se vuelve a su detalle.
    if (isApiError(error, 'REQUEST_RESOLVED')) {
      setResolving(false);
      void queryClient.invalidateQueries({ queryKey: equipmentKey });
    }
  };

  const step = async (kind: 'attend' | 'close') => {
    setGeneralError(null);
    try {
      await (kind === 'attend' ? attend : close).mutateAsync(undefined);
      toast.success(kind === 'attend' ? 'Falla en atención' : 'Falla cerrada', {
        description: fault.data ? `${fault.data.asset.code} · ${fault.data.asset.name}` : undefined,
      });
      if (kind === 'close') onOpenChange(false);
    } catch (error) {
      failed(error);
    }
  };

  const startResolving = (data: Fault) => {
    setGeneralError(null);
    form.reset({ resolution: '', returnToOperational: !data.usable });
    setResolving(true);
  };

  const submitResolution = form.handleSubmit(async (values) => {
    setGeneralError(null);
    if (!values.resolution.trim()) {
      form.setError('resolution', { message: 'Escribe qué se hizo para resolverla.' });
      return;
    }
    const payload = validate(
      resolveFaultRequest,
      { resolution: values.resolution.trim(), returnToOperational: values.returnToOperational },
      form,
    );
    if (!payload) return;
    try {
      await resolve.mutateAsync(payload);
      toast.success('Falla resuelta', {
        description: payload.returnToOperational ? 'El equipo volvió a Operativo.' : fault.data ? fault.data.asset.name : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      failed(error);
    }
  });

  const data = fault.data;
  const busy = attend.isPending || close.isPending;
  const sheetTitle = resolving ? 'Resolver falla' : 'Falla de equipo';
  const description = resolving
    ? 'Queda en la línea de tiempo de la falla, con quién la resolvió y cuándo.'
    : 'Qué se reportó, quién la atendió y cómo se resolvió.';

  let footer: React.ReactNode;
  if (data && canHandle) {
    if (resolving) {
      footer = (
        <div className="flex w-full items-center gap-3">
          <Button variant="ghost" className="h-12 shrink-0 rounded-2xl px-5" onClick={() => setResolving(false)}>
            Volver
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={resolve.isPending} className="h-12 flex-1 rounded-2xl text-base font-bold">
            Resolver falla
          </Button>
        </div>
      );
    } else if (data.status === 'open' || data.status === 'in_progress') {
      footer = (
        <div className="flex w-full flex-wrap items-center gap-3">
          {data.status === 'open' ? (
            <Button className="h-12 flex-1 rounded-2xl" loading={attend.isPending} disabled={busy} onClick={() => void step('attend')}>
              Atender
            </Button>
          ) : null}
          <Button
            id={resolveButtonId}
            variant="primary"
            className="h-12 flex-1 rounded-2xl text-base font-bold"
            disabled={busy}
            onClick={() => startResolving(data)}
          >
            Resolver
          </Button>
        </div>
      );
    } else if (data.status === 'resolved') {
      footer = (
        <Button variant="primary" className="h-12 w-full rounded-2xl text-base font-bold" loading={close.isPending} onClick={() => void step('close')}>
          Cerrar falla
        </Button>
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={sheetTitle} description={description} icon={resolving ? CircleCheck : TriangleAlert} footer={footer}>
      {!data && fault.isError ? (
        <QueryErrorState error={fault.error} onRetry={() => void fault.refetch()} />
      ) : !data ? (
        <div role="status" aria-busy="true" aria-label="Cargando la falla" className="grid gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <div className="grid gap-5">
          {generalError ? (
            <p role="alert" className="rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
              {generalError}
            </p>
          ) : null}
          <FaultAsset fault={data} fichaTo={fichaBase ? `${fichaBase}/${data.asset.id}` : null} />
          {resolving ? (
            <form
              id={formId}
              noValidate
              className="grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                void submitResolution();
              }}
            >
              <Field label="Resultado" required hint="Qué se hizo o se comprobó para resolver la falla." error={errors.resolution?.message}>
                <Textarea
                  rows={4}
                  maxLength={2000}
                  autoFocus
                  {...resolutionField}
                />
              </Field>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-medium text-ink">
                <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer accent-action" {...form.register('returnToOperational')} />
                <span>
                  Devolver el equipo a Operativo
                  <span className="block text-[13px] font-normal text-ink-muted">
                    {data.usable
                      ? 'Déjala sin marcar si el equipo ya estaba en uso.'
                      : 'Estaba fuera de servicio por esta falla. Desmárcala si aún no puede usarse.'}
                  </span>
                </span>
              </label>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={faultStatusTone[data.status]}>{faultStatusLabel[data.status]}</Badge>
                <span className="text-sm text-ink-muted">{faultTypeLabel[data.faultType]}</span>
                <span aria-hidden className="text-ink-subtle">
                  ·
                </span>
                {data.usable ? (
                  <span className="text-sm text-ink-muted">{usableText(true)}</span>
                ) : (
                  <Badge tone="danger">{usableText(false)}</Badge>
                )}
              </div>
              <section aria-labelledby="falla-descripcion" className="grid gap-1.5">
                <h3 id="falla-descripcion" className={sectionLabel}>
                  Qué se reportó
                </h3>
                <p className="whitespace-pre-wrap break-words text-sm text-ink">{data.description}</p>
              </section>
              <section aria-labelledby="falla-pasos" className="grid gap-3">
                <h3 id="falla-pasos" className={sectionLabel}>
                  Pasos
                </h3>
                <FaultTimeline fault={data} timeZone={timeZone} />
              </section>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
