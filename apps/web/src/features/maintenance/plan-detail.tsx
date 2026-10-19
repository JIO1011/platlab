import { createExclusionRequest, type Plan, type PlanAssetList } from '@platlab/contracts';
import { Badge, Button, Sheet, Skeleton, StatePanel, Textarea, cn, toast } from '@platlab/ui';
import { Archive, CalendarClock, Pencil, Repeat } from 'lucide-react';
import { useEffect, useRef, useState, type Ref } from 'react';
import { fieldErrors } from '../../app/commands';
import { formatDate } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { maintenanceErrorMessage, useAddExclusion, useArchiveExclusion, useArchivePlan } from './commands';
import { ConfirmArchive } from './confirm-archive';
import { frequencyText, scopeText } from './plan-text';
import { useMaintenance } from './context';
import { dueTone, todayInZone, workStatus } from './due';
import { toneText } from './due-view';
import { usePlanAssets, usePlans } from './queries';
import { kindLabels } from './work-text';

type PlanAsset = PlanAssetList['items'][number];

/** Interruptor «Incluido»: refleja lo que confirmó el servidor, nunca lo que se espera. */
function IncludedSwitch({
  on,
  label,
  disabled,
  busy,
  onToggle,
  buttonRef,
}: {
  on: boolean;
  label: string;
  disabled: boolean;
  busy: boolean;
  onToggle: () => void;
  buttonRef: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={onToggle}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-control px-1 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150 motion-reduce:transition-none', on ? 'bg-action' : 'bg-ink-subtle')}>
        <span className={cn('absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out-expo motion-reduce:transition-none', on && 'translate-x-4')} />
      </span>
      Incluido
    </button>
  );
}

/**
 * Un equipo del plan. Con «Incluido» el Administrador lo saca (pide el motivo aquí mismo) o lo devuelve; «Cambiar
 * frecuencia» abre un plan propio para ese equipo. Si lo reemplaza un plan propio, se dice cuál.
 */
function PlanAssetRow({
  workspaceId,
  plan,
  entry,
  canManage,
  onOwnPlan,
}: {
  workspaceId: string;
  plan: Plan;
  entry: PlanAsset;
  canManage: boolean;
  onOwnPlan: (asset: PlanAsset['asset']) => void;
}) {
  const { me } = useMaintenance();
  const today = todayInZone(me.workspace.timeZone, Date.now());
  const add = useAddExclusion(workspaceId, plan.id);
  const restore = useArchiveExclusion(workspaceId, plan.id, entry.asset.id);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const switchRef = useRef<HTMLButtonElement>(null);
  // Al cerrar el motivo (cancelar o sacar del plan) el foco vuelve al interruptor, que se habilita al dejar de preguntar.
  const returnToSwitch = useRef(false);
  useEffect(() => {
    if (asking || !returnToSwitch.current) return;
    returnToSwitch.current = false;
    requestAnimationFrame(() => switchRef.current?.focus());
  }, [asking]);
  const included = entry.exclusion === null;
  const typed = plan.assetType !== null;
  const replacedBy = entry.exclusion?.replacedBy ?? null;
  // La frecuencia vigente del plan propio sale de la lista de planes, que la pantalla ya tiene.
  const ownPlan = usePlans(workspaceId, replacedBy !== null).data?.items.find((candidate) => candidate.id === replacedBy?.id);

  const exclude = () => {
    setError(null);
    const parsed = createExclusionRequest.safeParse({ assetId: entry.asset.id, reason: reason.trim() });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).reason ?? 'Escribe el motivo.');
      reasonRef.current?.focus();
      return;
    }
    add.mutate(parsed.data, {
      onSuccess: () => {
        returnToSwitch.current = true;
        setAsking(false);
        setReason('');
        toast.success('Equipo fuera del plan', { description: `${entry.asset.code} · ${plan.title}` });
      },
      onError: (failure) => setError(maintenanceErrorMessage(failure)),
    });
  };
  const bringBack = () => {
    setError(null);
    restore.mutate(undefined, { onError: (failure) => setError(maintenanceErrorMessage(failure)) });
  };

  return (
    <li className="grid gap-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1 basis-48">
          <p className="break-words font-semibold text-ink">
            <span className="mr-1.5 font-mono text-[13px] font-normal tabular-nums text-ink-muted">{entry.asset.code}</span>
            {entry.asset.name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
            {included ? (
              <>
                {entry.dueOn ? (
                  <span>
                    Próxima: <span className="tabular-nums">{formatDate(entry.dueOn)}</span> ·{' '}
                    <span className={`font-medium ${toneText[dueTone({ dueOn: entry.dueOn, lastResult: entry.lastResult }, today)]}`}>
                      {workStatus({ dueOn: entry.dueOn, lastResult: entry.lastResult, lastPerformedOn: null }, today).text}
                    </span>
                  </span>
                ) : (
                  <span>Sin fecha todavía</span>
                )}
              </>
            ) : (
              <span className="break-words">
                <span className="font-medium text-ink">Excluido.</span> Motivo: {entry.exclusion?.reason}
                {replacedBy ? (
                  <>
                    {' '}
                    Tiene su propio plan: <span className="font-medium text-ink">{replacedBy.title}</span>
                    {ownPlan ? <span className="font-medium text-ink"> · {frequencyText(ownPlan.intervalCount, ownPlan.intervalUnit).toLowerCase()}</span> : null}.
                  </>
                ) : null}
              </span>
            )}
          </p>
        </div>
        {canManage && typed ? (
          <IncludedSwitch
            on={included}
            // Empieza por el texto visible (WCAG 2.5.3): un control por voz lo encuentra diciendo «Incluido».
            label={`Incluido: ${entry.asset.code} en el plan`}
            buttonRef={switchRef}
            disabled={replacedBy !== null || asking}
            busy={add.isPending || restore.isPending}
            onToggle={() => (included ? setAsking(true) : bringBack())}
          />
        ) : null}
      </div>
      {canManage && typed && included && !asking ? (
        <div>
          <Button size="sm" className="max-sm:h-11" aria-haspopup="dialog" aria-label={`Cambiar frecuencia de ${entry.asset.code}`} onClick={() => onOwnPlan(entry.asset)}>
            <Repeat aria-hidden />
            Cambiar frecuencia
          </Button>
        </div>
      ) : null}
      {replacedBy ? <p className="text-[13px] text-ink-muted">Para devolverlo a este plan, archiva su plan propio.</p> : null}
      {asking ? (
        <div role="group" aria-label={`Sacar a ${entry.asset.code} del plan`} className="grid gap-2 rounded-control bg-surface-sunken p-3">
          <label htmlFor={`motivo-${entry.asset.id}`} className="text-sm font-medium text-ink">
            ¿Por qué sale del plan?
            <span aria-hidden className="ml-0.5">
              *
            </span>
          </label>
          <Textarea
            id={`motivo-${entry.asset.id}`}
            ref={reasonRef}
            rows={2}
            maxLength={500}
            autoFocus
            value={reason}
            aria-required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `motivo-${entry.asset.id}-error` : undefined}
            onChange={(event) => setReason(event.target.value)}
          />
          {error ? (
            <p id={`motivo-${entry.asset.id}-error`} role="alert" className="text-[13px] font-medium text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" className="h-11 sm:h-10" loading={add.isPending} onClick={exclude}>
              Sacar del plan
            </Button>
            <Button
              variant="ghost"
              className="h-11 sm:h-10"
              disabled={add.isPending}
              onClick={() => {
                returnToSwitch.current = true;
                setAsking(false);
                setReason('');
                setError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </li>
  );
}

/**
 * El detalle de un plan, al tocarlo en la lista: de qué se trata, «Editar» y «Archivar» (Administrador) y los equipos
 * que alcanza, cada uno con su «Incluido» y su «Cambiar frecuencia».
 */
export function PlanDetailSheet({
  workspaceId,
  plan,
  open,
  onOpenChange,
  canManage,
  onEdit,
  onOwnPlan,
}: {
  workspaceId: string;
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onEdit: () => void;
  onOwnPlan: (asset: PlanAsset['asset']) => void;
}) {
  const assets = usePlanAssets(workspaceId, plan.id);
  const archive = useArchivePlan(workspaceId, plan.id);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={plan.title}
      description={`${kindLabels[plan.kind]} · ${scopeText(plan)} · ${frequencyText(plan.intervalCount, plan.intervalUnit).toLowerCase()}`}
      icon={CalendarClock}
      wide
      fullscreenMobile
      focusFirst
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink">
            <span className="tabular-nums">{plan.nextDueOn ? `Próxima: ${formatDate(plan.nextDueOn)}` : 'Sin equipos que cubrir'}</span>
            {plan.overdueCount > 0 ? <Badge tone="danger">{plan.overdueCount === 1 ? '1 atrasado' : `${plan.overdueCount} atrasados`}</Badge> : null}
          </p>
          {canManage && !confirming ? (
            <div className="flex items-center gap-1">
              <Button className="max-sm:h-11" aria-haspopup="dialog" onClick={onEdit}>
                <Pencil aria-hidden />
                Editar
              </Button>
              <Button variant="ghost" className="max-sm:h-11" onClick={() => setConfirming(true)}>
                <Archive aria-hidden />
                Archivar
              </Button>
            </div>
          ) : null}
        </div>
        {plan.requirement ? (
          <p className="break-words text-sm text-ink">
            <span className="text-ink-muted">Requisito: </span>
            {plan.requirement}
          </p>
        ) : null}
        {confirming ? (
          <ConfirmArchive
            label={`Archivar el plan ${plan.title}`}
            text={`¿Archivar «${plan.title}»? Deja de generar trabajos por hacer; lo ya registrado queda en el Historial.${plan.asset ? ' Como es un plan propio, el equipo vuelve al plan de su tipo.' : ''}`}
            action="Archivar plan"
            pending={archive.isPending}
            error={error}
            onCancel={() => {
              setConfirming(false);
              setError(null);
            }}
            onConfirm={() => {
              setError(null);
              archive.mutate(undefined, {
                onSuccess: () => {
                  toast.success('Plan archivado', { description: plan.title });
                  onOpenChange(false);
                },
                onError: (failure) => setError(maintenanceErrorMessage(failure)),
              });
            }}
          />
        ) : null}
        <section aria-labelledby="plan-equipos">
          <h3 id="plan-equipos" className="text-base font-semibold text-ink">
            Equipos
          </h3>
          {assets.isPending ? (
            <div aria-busy="true" className="mt-2 grid gap-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : assets.isError ? (
            <QueryErrorState error={assets.error} onRetry={() => void assets.refetch()} />
          ) : assets.data.items.length === 0 ? (
            <StatePanel icon={CalendarClock} title="Este plan no alcanza ningún equipo" description="Cuando haya equipos de este tipo, aparecerán aquí." />
          ) : (
            <ul className="divide-y divide-line">
              {assets.data.items.map((entry) => (
                <PlanAssetRow key={entry.asset.id} workspaceId={workspaceId} plan={plan} entry={entry} canManage={canManage} onOwnPlan={onOwnPlan} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Sheet>
  );
}
