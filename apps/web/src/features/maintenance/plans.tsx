import type { Plan, PlanList, Provider } from '@platlab/contracts';
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Skeleton, StatePanel, Tabs, TabsContent, TabsList, TabsTrigger } from '@platlab/ui';
import { Archive, Ban, Building2, CalendarClock, ChevronDown, FilePlus2, MoreHorizontal, Pencil, Plus, TriangleAlert } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { formatDate } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { maintenanceErrorMessage, useArchiveExclusion, useArchivePlan, useArchiveProvider } from './commands';
import { useMaintenance } from './context';
import { ExclusionSheet } from './exclusion-sheet';
import { frequencyText, scopeText } from './plan-text';
import { PlanSheet } from './plan-sheet';
import { ProviderSheet } from './provider-sheet';
import { usePlans, useProviders } from './queries';
import { SectionHeader } from './section-header';
import { kindLabels } from './work-text';

type View = 'planes' | 'proveedores';
const viewFrom = (value: string | null): View => (value === 'proveedores' ? 'proveedores' : 'planes');

/** La hoja abierta; `n` la monta de nuevo en cada apertura (formulario limpio, clave idempotente nueva). */
type OpenSheet = { n: number; open: boolean } & (
  | { kind: 'plan'; plan?: Plan; own?: Plan }
  | { kind: 'exclusion'; plan: Plan }
  | { kind: 'provider'; provider?: Provider }
);

type SheetRequest = { kind: 'plan'; plan?: Plan; own?: Plan } | { kind: 'exclusion'; plan: Plan } | { kind: 'provider'; provider?: Provider };

/** El motivo de archivar, a la vista y con su confirmación aquí mismo: archivar no se deshace desde esta pantalla. */
function ConfirmArchive({
  label,
  text,
  action,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  label: string;
  text: string;
  action: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div role="group" aria-label={label} className="mt-3 grid gap-3 rounded-control bg-surface-sunken p-3">
      <p className="text-sm text-ink">{text}</p>
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button className="h-11 border-transparent bg-danger text-white hover:bg-danger/90 sm:h-10" loading={pending} onClick={onConfirm}>
          {action}
        </Button>
        <Button variant="ghost" className="h-11 sm:h-10" disabled={pending} onClick={onCancel} autoFocus>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/** Una excepción de un plan; el Administrador puede devolver el equipo al plan (la exclusión se archiva, no se borra). */
function ExclusionItem({ workspaceId, plan, entry, canManage }: { workspaceId: string; plan: Plan; entry: Plan['exclusions'][number]; canManage: boolean }) {
  const command = useArchiveExclusion(workspaceId, plan.id, entry.asset.id);
  const [error, setError] = useState<string | null>(null);
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-[13px]">
      <p className="min-w-0 flex-1 basis-60 text-ink-muted">
        <span className="font-mono tabular-nums">{entry.asset.code}</span> <span className="text-ink">{entry.asset.name}</span> · Motivo:{' '}
        {entry.reason}
        {error ? (
          <span role="alert" className="block font-medium text-danger">
            {error}
          </span>
        ) : null}
      </p>
      {canManage ? (
        <Button
          size="sm"
          className="max-sm:h-11"
          loading={command.isPending}
          aria-label={`Devolver ${entry.asset.code} al plan ${plan.title}`}
          onClick={() => {
            setError(null);
            command.mutate(undefined, { onError: (failure) => setError(maintenanceErrorMessage(failure)) });
          }}
        >
          Devolver al plan
        </Button>
      ) : null}
    </li>
  );
}

/**
 * Un plan: título y tipo de trabajo, alcance y frecuencia, su próxima fecha y sus vencidos. «N excepciones» despliega los
 * equipos excluidos con su motivo. El Administrador edita, excluye, parte de él para un plan propio y archiva.
 */
function PlanRow({ plan, workspaceId, canManage, onSheet }: { plan: Plan; workspaceId: string; canManage: boolean; onSheet: (request: SheetRequest) => void }) {
  const archive = useArchivePlan(workspaceId, plan.id);
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();
  const menuRef = useRef<HTMLButtonElement>(null);
  const exclusions = plan.exclusions.length;

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="grid gap-x-4 gap-y-2 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] md:items-center">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-words font-semibold text-ink">{plan.title}</span>
            <Badge>{kindLabels[plan.kind]}</Badge>
          </p>
          <p className="mt-0.5 break-words text-[13px] text-ink-muted">
            {scopeText(plan)} · {frequencyText(plan.intervalCount, plan.intervalUnit)}
          </p>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 md:justify-end">
          <div className="min-w-0 md:text-right">
            <p className="text-sm tabular-nums text-ink">{plan.nextDueOn ? `Próxima: ${formatDate(plan.nextDueOn)}` : 'Sin equipos que cubrir'}</p>
            {plan.overdueCount > 0 ? (
              <Badge tone="danger" className="mt-1">
                {plan.overdueCount === 1 ? '1 vencido' : `${plan.overdueCount} vencidos`}
              </Badge>
            ) : null}
          </div>
          {canManage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button ref={menuRef} variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Acciones del plan ${plan.title}`}>
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem onSelect={() => onSheet({ kind: 'plan', plan })}>
                  <Pencil aria-hidden />
                  Editar
                </DropdownMenuItem>
                {plan.assetType ? (
                  <>
                    <DropdownMenuItem onSelect={() => onSheet({ kind: 'exclusion', plan })}>
                      <Ban aria-hidden />
                      Excluir un equipo
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onSheet({ kind: 'plan', own: plan })}>
                      <FilePlus2 aria-hidden />
                      Usar plan propio
                    </DropdownMenuItem>
                  </>
                ) : null}
                <DropdownMenuItem onSelect={() => setConfirming(true)}>
                  <Archive aria-hidden />
                  Archivar plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      {exclusions > 0 ? (
        <div className="mt-2">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((value) => !value)}
            className="-ml-1.5 inline-flex min-h-11 items-center gap-1 rounded-[6px] px-1.5 text-[13px] font-medium text-action transition-colors hover:bg-action-soft sm:min-h-8"
          >
            {exclusions === 1 ? '1 excepción' : `${exclusions} excepciones`}
            <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {expanded ? (
            <ul id={listId} className="mt-1 grid gap-2.5 border-t border-line pt-3">
              {plan.exclusions.map((entry) => (
                <ExclusionItem key={entry.asset.id} workspaceId={workspaceId} plan={plan} entry={entry} canManage={canManage} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {confirming ? (
        <ConfirmArchive
          label={`Archivar el plan ${plan.title}`}
          text={`¿Archivar «${plan.title}»? Deja de generar trabajos por hacer; los mantenimientos ya registrados se conservan en el historial.${plan.asset ? ' Como es un plan propio, el equipo vuelve al plan de su tipo.' : ''}`}
          action="Archivar plan"
          pending={archive.isPending}
          error={error}
          onCancel={() => {
            setConfirming(false);
            setError(null);
            requestAnimationFrame(() => menuRef.current?.focus());
          }}
          onConfirm={() => {
            setError(null);
            archive.mutate(undefined, { onError: (failure) => setError(maintenanceErrorMessage(failure)) });
          }}
        />
      ) : null}
    </li>
  );
}

/** «N equipos sin plan», desplegable: los primeros 50 por código. */
function Uncovered({ uncovered }: { uncovered: PlanList['uncovered'] }) {
  if (uncovered.total === 0) return null;
  return (
    <details className="group rounded-control bg-warning-soft">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-control px-4 py-3 text-sm font-semibold text-warning focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action [&::-webkit-details-marker]:hidden">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">{uncovered.total === 1 ? '1 equipo sin plan' : `${uncovered.total} equipos sin plan`}</span>
        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="grid gap-3 px-4 pb-4 text-sm text-ink">
        <p className="text-ink-muted">
          No generan trabajos por hacer hasta que tengan un plan.{' '}
          {uncovered.total > uncovered.items.length ? `Primeros ${uncovered.items.length} de ${uncovered.total}, por código.` : 'Por código.'}
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {uncovered.items.map((entry) => (
            <li key={entry.id} className="min-w-0 break-words">
              <span className="font-mono text-[13px] tabular-nums text-ink-muted">{entry.code}</span> {entry.name}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

/** Un proveedor: nombre y contacto; el Administrador edita o archiva (sigue en el historial de los registros). */
function ProviderRow({ provider, workspaceId, canManage, onEdit }: { provider: Provider; workspaceId: string; canManage: boolean; onEdit: () => void }) {
  const archive = useArchiveProvider(workspaceId, provider.id);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archiveRef = useRef<HTMLButtonElement>(null);
  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-56">
          <p className="break-words font-semibold text-ink">{provider.name}</p>
          <p className="break-words text-[13px] text-ink-muted">{provider.contact ?? 'Sin contacto'}</p>
        </div>
        {canManage && !confirming ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="max-sm:h-11" aria-label={`Editar a ${provider.name}`} onClick={onEdit}>
              Editar
            </Button>
            <Button ref={archiveRef} variant="ghost" size="sm" className="max-sm:h-11" aria-label={`Archivar a ${provider.name}`} onClick={() => setConfirming(true)}>
              Archivar
            </Button>
          </div>
        ) : null}
      </div>
      {confirming ? (
        <ConfirmArchive
          label={`Archivar a ${provider.name}`}
          text={`¿Archivar a «${provider.name}»? Deja de ofrecerse al registrar un mantenimiento; los registros que ya lo tienen lo conservan en el historial.`}
          action="Archivar proveedor"
          pending={archive.isPending}
          error={error}
          onCancel={() => {
            setConfirming(false);
            setError(null);
            requestAnimationFrame(() => archiveRef.current?.focus());
          }}
          onConfirm={() => {
            setError(null);
            archive.mutate(undefined, { onError: (failure) => setError(maintenanceErrorMessage(failure)) });
          }}
        />
      ) : null}
    </li>
  );
}

/**
 * Planes de Mantenimiento (ADR 0020): «Planes de trabajo» y «Proveedores» como pestañas que viven en la URL
 * (`?vista=proveedores`). El Administrador los crea, edita y archiva; el Operador solo los ve.
 */
export function MaintenancePlansPage() {
  const { workspaceId, canManagePlans } = useMaintenance();
  const [params, setParams] = useSearchParams();
  const view = viewFrom(params.get('vista'));
  const plans = usePlans(workspaceId);
  const providers = useProviders(workspaceId);
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const openSheet = (request: SheetRequest) => setSheet({ ...request, n: (sheet?.n ?? 0) + 1, open: true });
  const choose = (next: View) =>
    setParams(
      (previous) => {
        const search = new URLSearchParams(previous);
        if (next === 'planes') search.delete('vista');
        else search.set('vista', next);
        return search;
      },
      { replace: true },
    );

  const createButton = canManagePlans ? (
    <Button variant="primary" className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => openSheet(view === 'planes' ? { kind: 'plan' } : { kind: 'provider' })}>
      <Plus aria-hidden />
      {view === 'planes' ? 'Nuevo plan' : 'Nuevo proveedor'}
    </Button>
  ) : undefined;

  const planItems = plans.data?.items ?? [];
  const providerItems = providers.data?.items ?? [];

  return (
    <>
      <SectionHeader title="Planes" updatedAt={view === 'planes' ? plans.dataUpdatedAt : providers.dataUpdatedAt} actions={createButton} />
      <Tabs value={view} onValueChange={(value) => choose(viewFrom(value))} className="mt-6">
        <TabsList aria-label="Planes" className="flex w-full sm:inline-flex sm:w-auto">
          <TabsTrigger value="planes" className="h-11 flex-1 sm:h-9 sm:flex-none">
            Planes de trabajo
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="h-11 flex-1 sm:h-9 sm:flex-none">
            Proveedores
          </TabsTrigger>
        </TabsList>
        <TabsContent value="planes" className="pt-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action">
          {plans.isPending ? (
            <div role="status" aria-busy="true" aria-label="Cargando">
              <Skeleton className="h-64 rounded-card" />
            </div>
          ) : plans.isError ? (
            <div className="rounded-card bg-surface shadow-raised">
              <QueryErrorState error={plans.error} onRetry={() => void plans.refetch()} />
            </div>
          ) : (
            <div className="grid gap-4">
              <Uncovered uncovered={plans.data.uncovered} />
              {planItems.length === 0 ? (
                <div className="rounded-card bg-surface shadow-raised">
                  <StatePanel
                    icon={CalendarClock}
                    title="Aún no hay planes de trabajo"
                    description={
                      canManagePlans
                        ? 'Crea el plan de un tipo de equipo, por ejemplo una calibración semestral, y sus fechas aparecerán en Por hacer.'
                        : 'Quien administra el espacio crea los planes. Cuando existan, los verás aquí.'
                    }
                    action={createButton}
                  />
                </div>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised">
                  {planItems.map((plan) => (
                    <PlanRow key={plan.id} plan={plan} workspaceId={workspaceId} canManage={canManagePlans} onSheet={openSheet} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="proveedores" className="pt-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action">
          {providers.isPending ? (
            <div role="status" aria-busy="true" aria-label="Cargando">
              <Skeleton className="h-40 rounded-card" />
            </div>
          ) : providers.isError ? (
            <div className="rounded-card bg-surface shadow-raised">
              <QueryErrorState error={providers.error} onRetry={() => void providers.refetch()} />
            </div>
          ) : providerItems.length === 0 ? (
            <div className="rounded-card bg-surface shadow-raised">
              <StatePanel
                icon={Building2}
                title="Aún no hay proveedores"
                description={
                  canManagePlans
                    ? 'Agrega las empresas que hacen mantenimiento fuera del laboratorio para elegirlas al registrar un trabajo.'
                    : 'Quien administra el espacio agrega los proveedores. Los trabajos internos no necesitan uno.'
                }
                action={createButton}
              />
            </div>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised">
              {providerItems.map((provider) => (
                <ProviderRow
                  key={provider.id}
                  provider={provider}
                  workspaceId={workspaceId}
                  canManage={canManagePlans}
                  onEdit={() => openSheet({ kind: 'provider', provider })}
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
      {sheet?.kind === 'plan' ? (
        <PlanSheet
          key={sheet.n}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          plan={sheet.plan}
          own={sheet.own}
        />
      ) : null}
      {sheet?.kind === 'exclusion' ? (
        <ExclusionSheet
          key={sheet.n}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          plan={sheet.plan}
        />
      ) : null}
      {sheet?.kind === 'provider' ? (
        <ProviderSheet
          key={sheet.n}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          provider={sheet.provider}
        />
      ) : null}
    </>
  );
}
